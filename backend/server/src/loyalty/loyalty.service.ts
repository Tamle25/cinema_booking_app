import {
  Injectable,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { PointTransaction } from './schemas/point-transaction.schema';
import { Booking } from '../bookings/schemas/booking.schema';

const RANK_THRESHOLDS = [
  { rank: 'Diamond', minPoints: 50000 },
  { rank: 'Platinum', minPoints: 15000 },
  { rank: 'Gold', minPoints: 5000 },
  { rank: 'Silver', minPoints: 1000 },
  { rank: 'Member', minPoints: 0 },
];

const RANK_DISCOUNTS: Record<string, number> = {
  Member: 0,
  Silver: 1,
  Gold: 3,
  Platinum: 5,
  Diamond: 8,
};

@Injectable()
export class LoyaltyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoyaltyService.name);
  private expireInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PointTransaction.name)
    private pointTransactionModel: Model<PointTransaction>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectConnection() private connection: Connection,
  ) {}

  onModuleInit() {
    this.expireInterval = setInterval(
      () => {
        this.expireOldPoints()
          .then((count) => {
            if (count > 0) {
              this.logger.log(`Đã xử lý ${count} giao dịch điểm hết hạn`);
            }
          })
          .catch((err) => this.logger.error('Lỗi xử lý điểm hết hạn', err));
      },
      24 * 60 * 60 * 1000,
    );

    this.expireOldPoints()
      .then((count) => {
        if (count > 0) {
          this.logger.log(
            `Đã xử lý ${count} giao dịch điểm hết hạn khi khởi động`,
          );
        }
      })
      .catch((err) =>
        this.logger.error('Lỗi xử lý điểm hết hạn khi khởi động', err),
      );
  }

  onModuleDestroy() {
    if (this.expireInterval) {
      clearInterval(this.expireInterval);
    }
  }

  getRankFromPoints(lifetimePoints: number): string {
    for (const threshold of RANK_THRESHOLDS) {
      if (lifetimePoints >= threshold.minPoints) {
        return threshold.rank;
      }
    }
    return 'Member';
  }

  getMembershipDiscount(rank: string): number {
    return RANK_DISCOUNTS[rank] || 0;
  }

  getNextRankInfo(currentRank: string, lifetimePoints: number) {
    const currentIndex = RANK_THRESHOLDS.findIndex(
      (t) => t.rank === currentRank,
    );
    if (currentIndex <= 0) {
      return null;
    }
    const nextRank = RANK_THRESHOLDS[currentIndex - 1];
    return {
      nextRank: nextRank.rank,
      pointsNeeded: nextRank.minPoints - lifetimePoints,
      nextRankMinPoints: nextRank.minPoints,
    };
  }

  private async runInTransaction<T>(
    callback: (session: any) => Promise<T>,
  ): Promise<T> {
    let session;
    try {
      session = await this.connection.startSession();
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session && session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch {}
      }

      const errorMsg = error.message || '';
      const isReplicaSetError =
        errorMsg.includes('replica set') ||
        errorMsg.includes('Transaction numbers are only allowed') ||
        errorMsg.includes('transactions are not supported') ||
        error.code === 20;

      if (isReplicaSetError || !session) {
        this.logger.warn(
          'MongoDB không hỗ trợ transaction, chạy loyalty flow không dùng session',
        );
        return callback(undefined);
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  async awardPoints(
    userId: string,
    orderId: string,
    amount: number,
  ): Promise<number> {
    return this.runInTransaction(async (session) => {
      const booking = await this.bookingModel
        .findById(orderId)
        .session(session);
      if (!booking) {
        throw new BadRequestException('Đơn hàng không tồn tại');
      }
      if (booking.pointsAwarded) {
        return 0;
      }

      const points = Math.floor(amount / 1000);
      if (points <= 0) {
        return 0;
      }

      const expiredAt = new Date();
      expiredAt.setMonth(expiredAt.getMonth() + 12);

      await this.pointTransactionModel.create(
        [
          {
            user: userId,
            order: orderId,
            type: 'EARN',
            points: points,
            description: `Tích điểm từ đơn hàng #${orderId.slice(-6).toUpperCase()} (${amount.toLocaleString()}đ)`,
            expiredAt: expiredAt,
            isExpired: false,
          },
        ],
        { session },
      );

      await this.userModel.findByIdAndUpdate(
        userId,
        {
          $inc: { availablePoints: points, lifetimePoints: points },
        },
        { session },
      );

      await this.bookingModel.findByIdAndUpdate(
        orderId,
        { pointsAwarded: true },
        { session },
      );

      const updatedUser = await this.userModel
        .findById(userId)
        .session(session);
      if (updatedUser) {
        const newRank = this.getRankFromPoints(updatedUser.lifetimePoints);
        if (newRank !== updatedUser.membershipRank) {
          await this.userModel.findByIdAndUpdate(
            userId,
            { membershipRank: newRank },
            { session },
          );
        }
      }

      return points;
    });
  }

  async deductPoints(
    userId: string,
    points: number,
    description: string,
  ): Promise<void> {
    return this.runInTransaction(async (session) => {
      const user = await this.userModel.findById(userId).session(session);
      if (!user) throw new BadRequestException('Người dùng không tồn tại');
      if (user.availablePoints < points)
        throw new BadRequestException('Không đủ điểm khả dụng');

      await this.pointTransactionModel.create(
        [
          {
            user: userId,
            type: 'REDEEM',
            points: -points,
            description: description,
          },
        ],
        { session },
      );

      await this.userModel.findByIdAndUpdate(
        userId,
        { $inc: { availablePoints: -points } },
        { session },
      );
    });
  }

  async expireOldPoints(): Promise<number> {
    const now = new Date();

    const expiredTransactions = await this.pointTransactionModel.find({
      type: 'EARN',
      isExpired: false,
      expiredAt: { $lte: now },
    });

    let count = 0;
    for (const transaction of expiredTransactions) {
      try {
        await this.runInTransaction(async (session) => {
          await this.pointTransactionModel.findByIdAndUpdate(
            transaction._id,
            { isExpired: true },
            { session },
          );

          const user = await this.userModel
            .findById(transaction.user)
            .session(session);
          if (user && user.availablePoints > 0) {
            const pointsToExpire = Math.min(
              transaction.points,
              user.availablePoints,
            );
            if (pointsToExpire > 0) {
              await this.userModel.findByIdAndUpdate(
                transaction.user,
                { $inc: { availablePoints: -pointsToExpire } },
                { session },
              );

              await this.pointTransactionModel.create(
                [
                  {
                    user: transaction.user,
                    type: 'EXPIRE',
                    points: -pointsToExpire,
                    description: `Điểm hết hạn (từ giao dịch ngày ${new Date(
                      (transaction as any).createdAt,
                    ).toLocaleDateString('vi-VN')})`,
                  },
                ],
                { session },
              );
            }
          }
        });
        count++;
      } catch (error) {
        this.logger.error(
          `Lỗi hết hạn điểm cho transaction ${transaction._id}`,
          error,
        );
      }
    }

    return count;
  }

  async getMembershipInfo(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('availablePoints lifetimePoints membershipRank full_name');
    if (!user) throw new BadRequestException('Người dùng không tồn tại');

    const discount = this.getMembershipDiscount(user.membershipRank);
    const nextRank = this.getNextRankInfo(
      user.membershipRank,
      user.lifetimePoints,
    );

    return {
      availablePoints: user.availablePoints,
      lifetimePoints: user.lifetimePoints,
      membershipRank: user.membershipRank,
      discountPercent: discount,
      nextRank: nextRank,
      rankThresholds: RANK_THRESHOLDS.map((t) => ({
        rank: t.rank,
        minPoints: t.minPoints,
        discount: RANK_DISCOUNTS[t.rank],
      })),
    };
  }

  async getPointsHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.pointTransactionModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.pointTransactionModel.countDocuments({ user: userId }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminAdjustPoints(
    adminId: string,
    userId: string,
    points: number,
    description: string,
  ) {
    return this.runInTransaction(async (session) => {
      const user = await this.userModel.findById(userId).session(session);
      if (!user) throw new BadRequestException('Người dùng không tồn tại');

      if (points < 0 && user.availablePoints + points < 0) {
        throw new BadRequestException('Không đủ điểm khả dụng để trừ');
      }

      await this.pointTransactionModel.create(
        [
          {
            user: userId,
            type: 'ADJUST',
            points: points,
            description: `[Admin] ${description}`,
          },
        ],
        { session },
      );

      const updateFields: any = { $inc: { availablePoints: points } };
      if (points > 0) {
        updateFields.$inc.lifetimePoints = points;
      }
      await this.userModel.findByIdAndUpdate(userId, updateFields, { session });

      if (points > 0) {
        const updatedUser = await this.userModel
          .findById(userId)
          .session(session);
        if (updatedUser) {
          const newRank = this.getRankFromPoints(updatedUser.lifetimePoints);
          if (newRank !== updatedUser.membershipRank) {
            await this.userModel.findByIdAndUpdate(
              userId,
              { membershipRank: newRank },
              { session },
            );
          }
        }
      }

      return {
        success: true,
        message: `Đã điều chỉnh ${points > 0 ? '+' : ''}${points} điểm cho người dùng`,
      };
    });
  }
}
