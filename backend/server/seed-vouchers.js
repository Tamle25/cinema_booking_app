const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking_db';
const DB_NAME = process.env.DB_NAME || MONGO_URI.split('/').pop()?.split('?')[0] || 'movie_booking_db';

const vouchersData = [
  // 1. Vouchers nhập mã (ADMIN_CODE)
  {
    name: 'Chào mừng thành viên mới',
    code: 'CHAOMUNG',
    description: 'Giảm ngay 20.000 VNĐ cho các thành viên mới đăng ký, áp dụng cho mọi suất chiếu.',
    voucherType: 'ADMIN_CODE',
    discountType: 'FIXED_AMOUNT',
    discountValue: 20000,
    maxDiscountAmount: 0,
    minOrderAmount: 50000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 ngày sau
    usageLimit: 1000,
    usedCount: 0,
    isUnlimited: false,
    status: 'active',
    applicableCinemaIds: [],
    isAllCinemas: true,
    requiredMembershipRank: 'Member',
  },
  {
    name: 'Khuyến mãi hè cực đã',
    code: 'VVIP88',
    description: 'Giảm 10% (tối đa 50.000đ) cho đơn hàng từ 100.000đ.',
    voucherType: 'ADMIN_CODE',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscountAmount: 50000,
    minOrderAmount: 100000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    usageLimit: 0,
    usedCount: 0,
    isUnlimited: true,
    status: 'active',
    applicableCinemaIds: [],
    isAllCinemas: true,
    requiredMembershipRank: 'Member',
  },
  {
    name: 'Ưu đãi Bắp nước cuối tuần',
    code: 'BAPNUOC',
    description: 'Giảm ngay 15.000đ cho đơn hàng từ 40.000đ, tha hồ mua combo.',
    voucherType: 'ADMIN_CODE',
    discountType: 'FIXED_AMOUNT',
    discountValue: 15000,
    maxDiscountAmount: 0,
    minOrderAmount: 40000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    usageLimit: 200,
    usedCount: 0,
    isUnlimited: false,
    status: 'active',
    applicableCinemaIds: [],
    isAllCinemas: true,
    requiredMembershipRank: 'Member',
  },

  // 2. Mẫu voucher đổi điểm (POINT_EXCHANGE_TEMPLATE)
  {
    name: 'Voucher giảm giá 10K',
    description: 'Đổi 10 điểm tích lũy lấy voucher giảm giá 10.000đ cho mọi đơn hàng từ 30.000đ.',
    voucherType: 'POINT_EXCHANGE_TEMPLATE',
    discountType: 'FIXED_AMOUNT',
    discountValue: 10000,
    maxDiscountAmount: 0,
    minOrderAmount: 30000,
    usageLimit: 0,
    usedCount: 0,
    isUnlimited: true,
    status: 'active',
    applicableCinemaIds: [],
    isAllCinemas: true,
    requiredMembershipRank: 'Member',
    requiredPoints: 10,
    validDaysAfterExchange: 30,
    exchangeLimit: 0,
    exchangedCount: 0,
  },
  {
    name: 'Voucher giảm giá 20K',
    description: 'Đổi 20 điểm lấy voucher giảm giá 20.000đ cho đơn hàng từ 60.000đ.',
    voucherType: 'POINT_EXCHANGE_TEMPLATE',
    discountType: 'FIXED_AMOUNT',
    discountValue: 20000,
    maxDiscountAmount: 0,
    minOrderAmount: 60000,
    usageLimit: 0,
    usedCount: 0,
    isUnlimited: true,
    status: 'active',
    applicableCinemaIds: [],
    isAllCinemas: true,
    requiredMembershipRank: 'Member',
    requiredPoints: 20,
    validDaysAfterExchange: 30,
    exchangeLimit: 0,
    exchangedCount: 0,
  },
  {
    name: 'Voucher giảm giá 50K',
    description: 'Đổi 50 điểm lấy voucher giảm giá 50.000đ cho đơn hàng từ 120.000đ.',
    voucherType: 'POINT_EXCHANGE_TEMPLATE',
    discountType: 'FIXED_AMOUNT',
    discountValue: 50000,
    maxDiscountAmount: 0,
    minOrderAmount: 120000,
    usageLimit: 0,
    usedCount: 0,
    isUnlimited: true,
    status: 'active',
    applicableCinemaIds: [],
    isAllCinemas: true,
    requiredMembershipRank: 'Silver',
    requiredPoints: 50,
    validDaysAfterExchange: 30,
    exchangeLimit: 0,
    exchangedCount: 0,
  },
  {
    name: 'Voucher Giảm 15% (Tối đa 40K)',
    description: 'Đổi 35 điểm lấy voucher giảm 15% (tối đa 40.000đ) cho đơn hàng từ 80.000đ.',
    voucherType: 'POINT_EXCHANGE_TEMPLATE',
    discountType: 'PERCENT',
    discountValue: 15,
    maxDiscountAmount: 40000,
    minOrderAmount: 80000,
    usageLimit: 0,
    usedCount: 0,
    isUnlimited: true,
    status: 'active',
    applicableCinemaIds: [],
    isAllCinemas: true,
    requiredMembershipRank: 'Gold',
    requiredPoints: 35,
    validDaysAfterExchange: 30,
    exchangeLimit: 0,
    exchangedCount: 0,
  },
  {
    name: 'Voucher Siêu Cấp Diamond 100K',
    description: 'Đặc quyền thành viên Kim Cương: Đổi 100 điểm lấy voucher giảm giá khủng 100.000đ cho đơn hàng từ 200.000đ.',
    voucherType: 'POINT_EXCHANGE_TEMPLATE',
    discountType: 'FIXED_AMOUNT',
    discountValue: 100000,
    maxDiscountAmount: 0,
    minOrderAmount: 200000,
    usageLimit: 100, // giới hạn tổng số lượng đổi
    usedCount: 0,
    isUnlimited: false,
    status: 'active',
    applicableCinemaIds: [],
    isAllCinemas: true,
    requiredMembershipRank: 'Diamond',
    requiredPoints: 100,
    validDaysAfterExchange: 45,
    exchangeLimit: 1, // mỗi user chỉ được đổi tối đa 1 lần
    exchangedCount: 0,
  },
];

async function main() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const exists = await db.listCollections({ name: 'vouchers' }).hasNext();
    if (exists) {
      await db.collection('vouchers').drop();
      console.log('Dropped existing vouchers collection');
    }

    await db.createCollection('vouchers', {
      collation: { locale: 'vi', strength: 1 },
    });

    const collection = db.collection('vouchers');

    // Create indexes
    await collection.createIndex({ code: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ voucherType: 1, status: 1 });

    await collection.insertMany(
      vouchersData.map((item) => ({
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );

    const seeded = await collection
      .find({}, { projection: { name: 1, code: 1, voucherType: 1, status: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Seeded ${seeded.length} voucher items into ${DB_NAME}.vouchers`);
    seeded.forEach((item) => {
      console.log(`- [${item.voucherType}] ${item.name} | code=${item.code || 'TEMPLATE'} | status=${item.status}`);
    });
  } catch (error) {
    console.error('Seed vouchers failed:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
