import { Injectable, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { PointTransaction } from './schemas/point-transaction.schema';
import { Booking } from '../bookings/schemas/booking.schema';

// Mốc điểm nâng hạng
const RANK_THRESHOLDS = [
  { rank: 'Diamond', minPoints: 50000 },
  { rank: 'Platinum', minPoints: 15000 },
  { rank: 'Gold', minPoints: 5000 },
  { rank: 'Silver', minPoints: 1000 },
  { rank: 'Member', minPoints: 0 },
];

// Ưu đãi giảm giá theo hạng (%)
const RANK_DISCOUNTS: Record<string, number> = {
  Member: 0,
  Silver: 1,
  Gold: 3,
  Platinum: 5,
  Diamond: 8,
};

@Injectable()
export class LoyaltyService implements OnModuleInit, OnModuleDestroy {
  private expireInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PointTransaction.name) private pointTransactionModel: Model<PointTransaction>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectConnection() private connection: Connection,
  ) {}

  onModuleInit() {
    console.log('=== LoyaltyService: Starting point expiry scheduler ===');
    // Chạy mỗi 24 giờ kiểm tra điểm hết hạn
    this.expireInterval = setInterval(() => {
      this.expireOldPoints()
        .then((count) => {
          if (count > 0) console.log(`[Loyalty Scheduler] Đã xử lý ${count} giao dịch điểm hết hạn`);
        })
        .catch((err) => console.error('[Loyalty Scheduler] Lỗi:', err));
    }, 24 * 60 * 60 * 1000);

    // Chạy lần đầu khi khởi động
    this.expireOldPoints()
      .then((count) => console.log(`[Loyalty Init] Đã xử lý ${count} giao dịch điểm hết hạn`))
      .catch((err) => console.error('[Loyalty Init] Lỗi:', err));
  }

  onModuleDestroy() {
    if (this.expireInterval) {
      clearInterval(this.expireInterval);
      console.log('=== LoyaltyService: Point expiry scheduler stopped ===');
    }
  }

  /**
   * Lấy hạng phù hợp dựa trên tổng điểm trọn đời
   */
  getRankFromPoints(lifetimePoints: number): string {
    for (const threshold of RANK_THRESHOLDS) {
      if (lifetimePoints >= threshold.minPoints) {
        return threshold.rank;
      }
    }
    return 'Member';
  }

  /**
   * Lấy % giảm giá theo hạng thành viên
   */
  getMembershipDiscount(rank: string): number {
    return RANK_DISCOUNTS[rank] || 0;
  }

  /**
   * Lấy thông tin mốc hạng tiếp theo
   */
  getNextRankInfo(currentRank: string, lifetimePoints: number) {
    const currentIndex = RANK_THRESHOLDS.findIndex((t) => t.rank === currentRank);
    if (currentIndex <= 0) {
      // Đã là Diamond hoặc không tìm thấy
      return null;
    }
    const nextRank = RANK_THRESHOLDS[currentIndex - 1];
    return {
      nextRank: nextRank.rank,
      pointsNeeded: nextRank.minPoints - lifetimePoints,
      nextRankMinPoints: nextRank.minPoints,
    };
  }

  /**
   * Helper chạy logic trong transaction. Nếu MongoDB là Standalone (không hỗ trợ Transaction),
   * hệ thống sẽ tự động hạ cấp chạy trực tiếp không có transaction một cách an toàn.
   */
  private async runInTransaction<T>(callback: (session: any) => Promise<T>): Promise<T> {
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
        } catch (abortError) {
          // Bỏ qua lỗi abort
        }
      }
      
      const errorMsg = error.message || '';
      const isReplicaSetError = 
        errorMsg.includes('replica set') || 
        errorMsg.includes('Transaction numbers are only allowed') ||
        errorMsg.includes('transactions are not supported') ||
        error.code === 20;

      if (isReplicaSetError || !session) {
        console.warn('=== [Loyalty] MongoDB Replica Set không khả dụng. Fallback sang chạy không Transaction ===');
        return callback(undefined);
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Cộng điểm cho đơn hàng thành công
   * 1.000 VNĐ = 1 điểm, chỉ cộng 1 lần mỗi đơn
   */
  async awardPoints(userId: string, orderId: string, amount: number): Promise<number> {
    return this.runInTransaction(async (session) => {
      // Kiểm tra đơn hàng đã được cộng điểm chưa
      const booking = await this.bookingModel.findById(orderId).session(session);
      if (!booking) {
        throw new BadRequestException('Đơn hàng không tồn tại');
      }
      if (booking.pointsAwarded) {
        return 0; // Đã cộng rồi, không cộng lại
      }

      // Tính điểm: 1.000 VNĐ = 1 điểm
      const points = Math.floor(amount / 1000);
      if (points <= 0) {
        return 0;
      }

      // Thời điểm hết hạn (12 tháng)
      const expiredAt = new Date();
      expiredAt.setMonth(expiredAt.getMonth() + 12);

      // Tạo giao dịch điểm
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

      // Cập nhật điểm user
      await this.userModel.findByIdAndUpdate(
        userId,
        {
          $inc: { availablePoints: points, lifetimePoints: points },
        },
        { session },
      );

      // Đánh dấu đơn hàng đã cộng điểm
      await this.bookingModel.findByIdAndUpdate(orderId, { pointsAwarded: true }, { session });

      // Kiểm tra và cập nhật hạng
      const updatedUser = await this.userModel.findById(userId).session(session);
      if (updatedUser) {
        const newRank = this.getRankFromPoints(updatedUser.lifetimePoints);
        if (newRank !== updatedUser.membershipRank) {
          await this.userModel.findByIdAndUpdate(userId, { membershipRank: newRank }, { session });
        }
      }

      return points;
    });
  }

  /**
   * Trừ điểm khi đổi voucher
   */
  async deductPoints(userId: string, points: number, description: string): Promise<void> {
    return this.runInTransaction(async (session) => {
      const user = await this.userModel.findById(userId).session(session);
      if (!user) throw new BadRequestException('Người dùng không tồn tại');
      if (user.availablePoints < points) throw new BadRequestException('Không đủ điểm khả dụng');

      // Tạo giao dịch trừ điểm
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

      // Trừ điểm khả dụng (KHÔNG trừ lifetimePoints)
      await this.userModel.findByIdAndUpdate(userId, { $inc: { availablePoints: -points } }, { session });
    });
  }

  /**
   * Hết hạn điểm cũ (12 tháng)
   */
  async expireOldPoints(): Promise<number> {
    const now = new Date();

    // Tìm các giao dịch EARN chưa hết hạn nhưng đã quá thời gian
    const expiredTransactions = await this.pointTransactionModel.find({
      type: 'EARN',
      isExpired: false,
      expiredAt: { $lte: now },
    });

    let count = 0;
    for (const transaction of expiredTransactions) {
      try {
        await this.runInTransaction(async (session) => {
          // Đánh dấu đã hết hạn
          await this.pointTransactionModel.findByIdAndUpdate(transaction._id, { isExpired: true }, { session });

          // Trừ điểm khả dụng (chỉ nếu còn điểm)
          const user = await this.userModel.findById(transaction.user).session(session);
          if (user && user.availablePoints > 0) {
            const pointsToExpire = Math.min(transaction.points, user.availablePoints);
            if (pointsToExpire > 0) {
              await this.userModel.findByIdAndUpdate(
                transaction.user,
                { $inc: { availablePoints: -pointsToExpire } },
                { session },
              );

              // Tạo giao dịch hết hạn
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
        console.error(`[Loyalty] Lỗi hết hạn điểm cho transaction ${transaction._id}:`, error);
      }
    }

    return count;
  }

  /**
   * Lấy thông tin thành viên
   */
  async getMembershipInfo(userId: string) {
    const user = await this.userModel.findById(userId).select('availablePoints lifetimePoints membershipRank full_name');
    if (!user) throw new BadRequestException('Người dùng không tồn tại');

    const discount = this.getMembershipDiscount(user.membershipRank);
    const nextRank = this.getNextRankInfo(user.membershipRank, user.lifetimePoints);

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

  /**
   * Lấy lịch sử điểm phân trang
   */
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

  /**
   * Admin điều chỉnh điểm thủ công
   */
  async adminAdjustPoints(adminId: string, userId: string, points: number, description: string) {
    return this.runInTransaction(async (session) => {
      const user = await this.userModel.findById(userId).session(session);
      if (!user) throw new BadRequestException('Người dùng không tồn tại');

      // Nếu trừ điểm, kiểm tra đủ điểm không
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

      // Cập nhật điểm
      const updateFields: any = { $inc: { availablePoints: points } };
      if (points > 0) {
        updateFields.$inc.lifetimePoints = points;
      }
      await this.userModel.findByIdAndUpdate(userId, updateFields, { session });

      // Kiểm tra cập nhật hạng (nếu cộng điểm)
      if (points > 0) {
        const updatedUser = await this.userModel.findById(userId).session(session);
        if (updatedUser) {
          const newRank = this.getRankFromPoints(updatedUser.lifetimePoints);
          if (newRank !== updatedUser.membershipRank) {
            await this.userModel.findByIdAndUpdate(userId, { membershipRank: newRank }, { session });
          }
        }
      }

      return { success: true, message: `Đã điều chỉnh ${points > 0 ? '+' : ''}${points} điểm cho người dùng` };
    });
  }
}
