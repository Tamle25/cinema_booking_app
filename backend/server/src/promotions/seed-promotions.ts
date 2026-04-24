/**
 * Seed script cho Promotions
 * Chạy: npx ts-node src/promotions/seed-promotions.ts
 */
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env
dotenv.config({ path: resolve(__dirname, '../../.env') });

const PromotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    type: { type: String, enum: ['hot', 'sale', 'free', 'event'], default: 'event' },
    discount_value: { type: Number, default: 0 },
    start_date: { type: Date },
    end_date: { type: Date },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Promotion = mongoose.model('Promotion', PromotionSchema);

const seedPromotions = [
  {
    title: 'Flash Sale Thứ 4 Vui Vẻ',
    description: 'Giảm 50% giá vé mỗi thứ 4 hàng tuần. Áp dụng cho tất cả suất chiếu từ 10:00 - 17:00. Số lượng có hạn!',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
    type: 'sale' as const,
    discount_value: 50,
    start_date: new Date('2026-01-01'),
    end_date: new Date('2026-12-31'),
    is_active: true,
  },
  {
    title: 'Combo Bắp Nước Miễn Phí',
    description: 'Mua 2 vé tặng 1 combo bắp nước miễn phí. Chương trình áp dụng cho thành viên CineMax VIP.',
    image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=800&q=80',
    type: 'free' as const,
    discount_value: 0,
    start_date: new Date('2026-01-01'),
    end_date: new Date('2026-12-31'),
    is_active: true,
  },
  {
    title: 'Blockbuster Premiere Night',
    description: 'Đêm công chiếu sớm các bom tấn Hollywood. Đặt vé trước 7 ngày được giảm 30% và nhận quà tặng đặc biệt.',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
    type: 'hot' as const,
    discount_value: 30,
    start_date: new Date('2026-03-01'),
    end_date: new Date('2026-12-31'),
    is_active: true,
  },
  {
    title: 'Sinh Nhật Vui - Giảm 40%',
    description: 'Ưu đãi đặc biệt dành cho khách hàng có sinh nhật trong tháng. Giảm 40% giá vé và tặng kèm 1 phần quà.',
    image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80',
    type: 'sale' as const,
    discount_value: 40,
    start_date: new Date('2026-01-01'),
    end_date: new Date('2026-12-31'),
    is_active: true,
  },
  {
    title: 'Student Day - Thứ 3 Học Sinh',
    description: 'Ưu đãi dành riêng cho học sinh, sinh viên mỗi thứ 3 hàng tuần. Chỉ cần xuất trình thẻ sinh viên để nhận giảm giá.',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80',
    type: 'event' as const,
    discount_value: 35,
    start_date: new Date('2026-01-01'),
    end_date: new Date('2026-12-31'),
    is_active: true,
  },
];

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cinema_booking';
  console.log('🔗 Đang kết nối MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Kết nối thành công!');

  // Xóa dữ liệu cũ
  await Promotion.deleteMany({});
  console.log('🗑️  Đã xóa promotions cũ');

  // Thêm dữ liệu mới
  const result = await Promotion.insertMany(seedPromotions);
  console.log(`✅ Đã seed ${result.length} promotions:`);
  result.forEach((p: any) => {
    console.log(`   - [${p.type.toUpperCase()}] ${p.title} (giảm ${p.discount_value}%)`);
  });

  await mongoose.disconnect();
  console.log('🔌 Đã ngắt kết nối MongoDB');
}

seed().catch((err) => {
  console.error('❌ Seed thất bại:', err);
  process.exit(1);
});
