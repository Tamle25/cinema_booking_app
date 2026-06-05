import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import * as crypto from 'crypto';
import { Voucher } from './schemas/voucher.schema';
import { UserVoucher } from './schemas/user-voucher.schema';
import { VoucherUsage } from './schemas/voucher-usage.schema';
import { User, UserDocument } from '../users/user.schema';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PointTransaction } from '../loyalty/schemas/point-transaction.schema';

// Thứ tự hạng để so sánh
const RANK_ORDER = ['Member', 'Silver', 'Gold', 'Platinum', 'Diamond'];

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name) private voucherModel: Model<Voucher>,
    @InjectModel(UserVoucher.name) private userVoucherModel: Model<UserVoucher>,
    @InjectModel(VoucherUsage.name) private voucherUsageModel: Model<VoucherUsage>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private readonly loyaltyService: LoyaltyService,
  ) {}

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
        console.warn('=== [Vouchers] MongoDB Replica Set không khả dụng. Fallback sang chạy không Transaction ===');
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
   * Sinh mã voucher ngẫu nhiên, duy nhất, khó đoán
   */
  private generateVoucherCode(): string {
    const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `VCR-${randomPart}`;
  }

  /**
   * Kiểm tra hạng thành viên có đủ yêu cầu không
   */
  private isRankSufficient(userRank: string, requiredRank: string): boolean {
    const userIndex = RANK_ORDER.indexOf(userRank);
    const requiredIndex = RANK_ORDER.indexOf(requiredRank);
    return userIndex >= requiredIndex;
  }

  // ==========================================
  // ADMIN APIs
  // ==========================================

  /**
   * Admin tạo voucher mã code
   */
  async createAdminVoucher(dto: any) {
    // Kiểm tra mã voucher đã tồn tại chưa
    if (dto.code) {
      const exists = await this.voucherModel.findOne({ code: dto.code.toUpperCase() });
      if (exists) throw new BadRequestException('Mã voucher đã tồn tại');
    }

    const voucher = new this.voucherModel({
      ...dto,
      code: dto.code ? dto.code.toUpperCase() : undefined,
      voucherType: 'ADMIN_CODE',
    });

    return voucher.save();
  }

  /**
   * Admin tạo mẫu voucher đổi điểm
   */
  async createPointExchangeTemplate(dto: any) {
    const template = new this.voucherModel({
      ...dto,
      voucherType: 'POINT_EXCHANGE_TEMPLATE',
      code: undefined, // Template không có code cố định
    });

    return template.save();
  }

  /**
   * Admin cập nhật voucher
   */
  async updateVoucher(id: string, dto: any) {
    const voucher = await this.voucherModel.findById(id);
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    // Nếu đổi code, kiểm tra trùng
    if (dto.code && dto.code.toUpperCase() !== voucher.code) {
      const exists = await this.voucherModel.findOne({ code: dto.code.toUpperCase(), _id: { $ne: id } });
      if (exists) throw new BadRequestException('Mã voucher đã tồn tại');
      dto.code = dto.code.toUpperCase();
    }

    return this.voucherModel.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true });
  }

  /**
   * Admin bật/tắt voucher
   */
  async toggleVoucherStatus(id: string) {
    const voucher = await this.voucherModel.findById(id);
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    const newStatus = voucher.status === 'active' ? 'inactive' : 'active';
    return this.voucherModel.findByIdAndUpdate(id, { status: newStatus }, { new: true });
  }

  /**
   * Admin xóa voucher
   */
  async deleteVoucher(id: string) {
    const voucher = await this.voucherModel.findById(id);
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    // Kiểm tra đã có người dùng chưa
    if (voucher.usedCount > 0 || voucher.exchangedCount > 0) {
      throw new BadRequestException('Không thể xóa voucher đã có lượt sử dụng/đổi. Hãy tắt thay vì xóa.');
    }

    await this.voucherModel.findByIdAndDelete(id);
    return { message: 'Đã xóa voucher thành công' };
  }

  /**
   * Admin lấy danh sách voucher
   */
  async getVoucherList(filters: { voucherType?: string; status?: string; page?: number; limit?: number }) {
    const { voucherType, status, page = 1, limit = 20 } = filters;
    const query: any = {};
    if (voucherType) query.voucherType = voucherType;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [vouchers, total] = await Promise.all([
      this.voucherModel
        .find(query)
        .populate('applicableCinemaIds', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.voucherModel.countDocuments(query),
    ]);

    return {
      vouchers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Admin xem lịch sử sử dụng voucher
   */
  async getVoucherUsageHistory(filters: { voucherId?: string; page?: number; limit?: number }) {
    const { voucherId, page = 1, limit = 20 } = filters;
    const query: any = {};
    if (voucherId) query.voucher = voucherId;

    const skip = (page - 1) * limit;
    const [usages, total] = await Promise.all([
      this.voucherUsageModel
        .find(query)
        .populate('user', 'full_name email')
        .populate('voucher', 'name code')
        .populate('userVoucher', 'code')
        .populate('order', 'total_price status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.voucherUsageModel.countDocuments(query),
    ]);

    return {
      usages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==========================================
  // USER APIs
  // ==========================================

  /**
   * Lấy danh sách voucher có thể đổi bằng điểm
   */
  async getExchangeableVouchers(userId: string) {
    const user = await this.userModel.findById(userId).select('availablePoints membershipRank');
    if (!user) throw new BadRequestException('Người dùng không tồn tại');

    const templates = await this.voucherModel
      .find({
        voucherType: 'POINT_EXCHANGE_TEMPLATE',
        status: 'active',
      })
      .populate('applicableCinemaIds', 'name')
      .sort({ requiredPoints: 1 })
      .exec();

    // Gắn thêm thông tin cho từng template
    return templates.map((t) => {
      const tObj = t.toObject();
      const canExchange =
        user.availablePoints >= t.requiredPoints &&
        this.isRankSufficient(user.membershipRank, t.requiredMembershipRank) &&
        (t.exchangeLimit === 0 || t.exchangedCount < t.exchangeLimit);

      return {
        ...tObj,
        canExchange,
        userPoints: user.availablePoints,
      };
    });
  }

  /**
   * Đổi điểm lấy voucher
   */
  async exchangeVoucher(userId: string, templateId: string) {
    return this.runInTransaction(async (session) => {
      // 1. Kiểm tra mẫu voucher
      const template = await this.voucherModel.findById(templateId).session(session);
      if (!template) throw new NotFoundException('Mẫu voucher không tồn tại');
      if (template.voucherType !== 'POINT_EXCHANGE_TEMPLATE') {
        throw new BadRequestException('Đây không phải mẫu voucher đổi điểm');
      }
      if (template.status !== 'active') throw new BadRequestException('Mẫu voucher đã ngừng hoạt động');
      if (template.exchangeLimit > 0 && template.exchangedCount >= template.exchangeLimit) {
        throw new BadRequestException('Mẫu voucher đã hết lượt đổi');
      }

      // 2. Kiểm tra user
      const user = await this.userModel.findById(userId).session(session);
      if (!user) throw new BadRequestException('Người dùng không tồn tại');
      if (user.availablePoints < template.requiredPoints) {
        throw new BadRequestException(`Không đủ điểm. Cần ${template.requiredPoints} điểm, bạn có ${user.availablePoints} điểm`);
      }
      if (!this.isRankSufficient(user.membershipRank, template.requiredMembershipRank)) {
        throw new BadRequestException(`Cần hạng ${template.requiredMembershipRank} trở lên để đổi voucher này`);
      }

      // 3. Sinh mã voucher duy nhất
      let voucherCode = this.generateVoucherCode();
      // Đảm bảo không trùng
      while (await this.userVoucherModel.findOne({ code: voucherCode }).session(session)) {
        voucherCode = this.generateVoucherCode();
      }

      // 4. Tính thời hạn sử dụng
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + (template.validDaysAfterExchange || 30));

      // 5. Tạo voucher cá nhân
      const [userVoucher] = await this.userVoucherModel.create(
        [
          {
            user: userId,
            voucherTemplate: templateId,
            code: voucherCode,
            status: 'UNUSED',
            expiredAt: expiredAt,
          },
        ],
        { session },
      );

      // 6. Trừ điểm user
      await this.userModel.findByIdAndUpdate(userId, { $inc: { availablePoints: -template.requiredPoints } }, { session });

      // 7. Tạo giao dịch điểm REDEEM
      const pointTransactionModel = this.connection.model(PointTransaction.name);
      await pointTransactionModel.create(
        [
          {
            user: userId,
            type: 'REDEEM',
            points: -template.requiredPoints,
            description: `Đổi voucher "${template.name}" (Mã: ${voucherCode})`,
          },
        ],
        { session },
      );

      // 8. Tăng số lượt đổi của template
      await this.voucherModel.findByIdAndUpdate(templateId, { $inc: { exchangedCount: 1 } }, { session });

      return {
        success: true,
        message: `Đổi voucher thành công! Mã: ${voucherCode}`,
        voucher: {
          code: voucherCode,
          name: template.name,
          discountType: template.discountType,
          discountValue: template.discountValue,
          maxDiscountAmount: template.maxDiscountAmount,
          expiredAt: expiredAt,
        },
      };
    });
  }

  /**
   * Lấy danh sách voucher cá nhân
   */
  async getUserVouchers(userId: string) {
    // Trước tiên, cập nhật các voucher hết hạn
    await this.userVoucherModel.updateMany(
      { user: userId, status: 'UNUSED', expiredAt: { $lte: new Date() } },
      { status: 'EXPIRED' },
    );

    return this.userVoucherModel
      .find({ user: userId })
      .populate({
        path: 'voucherTemplate',
        populate: { path: 'applicableCinemaIds', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Validate mã voucher (cả admin code và user voucher)
   */
  async validateVoucher(
    code: string,
    userId: string,
    cinemaId: string,
    orderAmount: number,
  ): Promise<{ valid: boolean; message: string; discount?: number; voucherType?: string; voucherId?: string; userVoucherId?: string }> {
    const upperCode = code.toUpperCase();

    // 1. Tìm trong voucher admin
    const adminVoucher = await this.voucherModel.findOne({ code: upperCode, voucherType: 'ADMIN_CODE' });
    if (adminVoucher) {
      return this.validateAdminVoucher(adminVoucher, userId, cinemaId, orderAmount);
    }

    // 2. Tìm trong voucher cá nhân
    const userVoucher = await this.userVoucherModel.findOne({ code: upperCode }).populate('voucherTemplate');
    if (userVoucher) {
      return this.validateUserVoucher(userVoucher, userId, cinemaId, orderAmount);
    }

    return { valid: false, message: 'Mã voucher không tồn tại' };
  }

  private async validateAdminVoucher(voucher: any, userId: string, cinemaId: string, orderAmount: number) {
    // Kiểm tra trạng thái
    if (voucher.status !== 'active') {
      return { valid: false, message: 'Voucher đã ngừng hoạt động' };
    }

    // Kiểm tra thời gian
    const now = new Date();
    if (voucher.startDate && now < new Date(voucher.startDate)) {
      return { valid: false, message: 'Voucher chưa đến thời gian sử dụng' };
    }
    if (voucher.endDate && now > new Date(voucher.endDate)) {
      return { valid: false, message: 'Voucher đã hết hạn' };
    }

    // Kiểm tra số lượt sử dụng
    if (!voucher.isUnlimited && voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
      return { valid: false, message: 'Voucher đã hết lượt sử dụng' };
    }

    // Kiểm tra rạp
    if (!voucher.isAllCinemas && voucher.applicableCinemaIds.length > 0) {
      const cinemaIds = voucher.applicableCinemaIds.map((id: any) => id.toString());
      if (!cinemaIds.includes(cinemaId)) {
        return { valid: false, message: 'Voucher không áp dụng cho rạp này' };
      }
    }

    // Kiểm tra hạng thành viên
    const user = await this.userModel.findById(userId).select('membershipRank');
    if (user && !this.isRankSufficient(user.membershipRank, voucher.requiredMembershipRank)) {
      return { valid: false, message: `Cần hạng ${voucher.requiredMembershipRank} trở lên để dùng voucher này` };
    }

    // Kiểm tra user đã dùng voucher này chưa (mỗi user chỉ được dùng 1 lần)
    const existingUsage = await this.voucherUsageModel.findOne({
      user: userId,
      voucher: voucher._id,
    });
    if (existingUsage) {
      return { valid: false, message: 'Bạn đã sử dụng mã voucher này rồi' };
    }

    // Kiểm tra đơn hàng tối thiểu
    if (voucher.minOrderAmount > 0 && orderAmount < voucher.minOrderAmount) {
      return { valid: false, message: `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString()}đ` };
    }

    // Tính giảm giá
    const discount = this.calculateDiscount(voucher, orderAmount);

    return {
      valid: true,
      message: 'Voucher hợp lệ',
      discount,
      voucherType: 'ADMIN_CODE',
      voucherId: voucher._id.toString(),
    };
  }

  private async validateUserVoucher(userVoucher: any, userId: string, cinemaId: string, orderAmount: number) {
    // Kiểm tra quyền sở hữu
    if (userVoucher.user.toString() !== userId) {
      return { valid: false, message: 'Voucher này không thuộc về bạn' };
    }

    // Kiểm tra trạng thái
    if (userVoucher.status === 'USED') {
      return { valid: false, message: 'Voucher đã được sử dụng' };
    }
    if (userVoucher.status === 'EXPIRED' || new Date() > new Date(userVoucher.expiredAt)) {
      return { valid: false, message: 'Voucher đã hết hạn' };
    }

    const template = userVoucher.voucherTemplate;
    if (!template || template.status !== 'active') {
      return { valid: false, message: 'Voucher không còn hiệu lực' };
    }

    // Kiểm tra rạp
    if (!template.isAllCinemas && template.applicableCinemaIds.length > 0) {
      const cinemaIds = template.applicableCinemaIds.map((id: any) => id.toString());
      if (!cinemaIds.includes(cinemaId)) {
        return { valid: false, message: 'Voucher không áp dụng cho rạp này' };
      }
    }

    // Kiểm tra đơn hàng tối thiểu
    if (template.minOrderAmount > 0 && orderAmount < template.minOrderAmount) {
      return { valid: false, message: `Đơn hàng tối thiểu ${template.minOrderAmount.toLocaleString()}đ` };
    }

    // Tính giảm giá
    const discount = this.calculateDiscount(template, orderAmount);

    return {
      valid: true,
      message: 'Voucher hợp lệ',
      discount,
      voucherType: 'USER_VOUCHER',
      userVoucherId: userVoucher._id.toString(),
    };
  }

  /**
   * Tính số tiền giảm giá dựa trên loại voucher
   */
  calculateDiscount(voucher: any, orderAmount: number): number {
    if (voucher.discountType === 'PERCENT') {
      let discount = Math.floor((orderAmount * voucher.discountValue) / 100);
      if (voucher.maxDiscountAmount > 0) {
        discount = Math.min(discount, voucher.maxDiscountAmount);
      }
      return discount;
    } else {
      // FIXED_AMOUNT
      return Math.min(voucher.discountValue, orderAmount);
    }
  }

  /**
   * Ghi nhận sử dụng voucher sau khi thanh toán thành công
   */
  async recordVoucherUsage(
    userId: string,
    orderId: string,
    voucherCode: string,
    discountAmount: number,
  ): Promise<void> {
    return this.runInTransaction(async (session) => {
      const upperCode = voucherCode.toUpperCase();

      // Tìm voucher admin
      const adminVoucher = await this.voucherModel.findOne({ code: upperCode, voucherType: 'ADMIN_CODE' }).session(session);
      if (adminVoucher) {
        // Tăng usedCount
        await this.voucherModel.findByIdAndUpdate(adminVoucher._id, { $inc: { usedCount: 1 } }, { session });

        // Lưu usage
        await this.voucherUsageModel.create(
          [{ user: userId, voucher: adminVoucher._id, order: orderId, discountAmount }],
          { session },
        );
        return;
      }

      // Tìm voucher cá nhân
      const userVoucher = await this.userVoucherModel.findOne({ code: upperCode, user: userId }).session(session);
      if (userVoucher) {
        // Cập nhật trạng thái đã dùng
        await this.userVoucherModel.findByIdAndUpdate(
          userVoucher._id,
          { status: 'USED', usedAt: new Date() },
          { session },
        );

        // Lưu usage
        await this.voucherUsageModel.create(
          [{ user: userId, userVoucher: userVoucher._id, order: orderId, discountAmount }],
          { session },
        );
        return;
      }

      throw new BadRequestException('Mã voucher không hợp lệ hoặc đã dùng');
    });
  }

  /**
   * Scheduler: Hết hạn voucher cá nhân
   */
  async expireUserVouchers(): Promise<number> {
    const result = await this.userVoucherModel.updateMany(
      { status: 'UNUSED', expiredAt: { $lte: new Date() } },
      { status: 'EXPIRED' },
    );
    return result.modifiedCount;
  }
}
