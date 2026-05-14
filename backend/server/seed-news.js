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

const newsData = [
  {
    title: 'CineMax mở bán sớm bom tấn tháng này',
    slug: 'cinemax-mo-ban-som-bom-tan-thang-nay',
    shortDescription:
      'Lịch mở bán được cập nhật sớm hơn để khán giả dễ dàng chọn suất chiếu đẹp và ghế tốt.',
    content:
      'CineMax chính thức mở bán sớm cho các bộ phim tâm điểm trong tháng này.\n\nNgười dùng có thể theo dõi lịch chiếu, đặt ghế và thanh toán ngay trên hệ thống. Chương trình áp dụng tại các rạp đối tác tham gia trên toàn quốc.',
    thumbnail: '',
    isPublished: true,
  },
  {
    title: 'Cập nhật ưu đãi combo cho khung giờ cuối tuần',
    slug: 'cap-nhat-uu-dai-combo-cho-khung-gio-cuoi-tuan',
    shortDescription:
      'Một số cụm rạp sẽ áp dụng giá combo ưu đãi vào khung giờ cao điểm cuối tuần.',
    content:
      'Để tăng trải nghiệm xem phim vào thứ Sáu, thứ Bảy và Chủ nhật, hệ thống CineMax cập nhật thêm các gói combo ưu đãi tại nhiều rạp.\n\nMức giá và sản phẩm có thể thay đổi theo từng hệ thống rạp. Vui lòng kiểm tra trong luồng đặt vé trước khi thanh toán.',
    thumbnail: '',
    isPublished: true,
  },
  {
    title: 'Thông báo bảo trì tính năng thanh toán đêm nay',
    slug: 'thong-bao-bao-tri-tinh-nang-thanh-toan-dem-nay',
    shortDescription:
      'Hệ thống thanh toán sẽ được bảo trì ngắn trong đêm để nâng cấp hiệu năng và độ ổn định.',
    content:
      'Trong khoảng thời gian bảo trì, một số giao dịch thanh toán có thể tạm thời chậm hơn bình thường.\n\nCác tính năng xem lịch chiếu, chọn ghế và đăng nhập vẫn hoạt động. Chúng tôi sẽ mở lại đầy đủ ngay sau khi hoàn tất.',
    thumbnail: '',
    isPublished: false,
  },
];

async function main() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const exists = await db.listCollections({ name: 'news' }).hasNext();
    if (exists) {
      await db.collection('news').drop();
    }

    await db.createCollection('news', {
      collation: { locale: 'vi', strength: 1 },
    });

    const collection = db.collection('news');

    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.insertMany(
      newsData.map((item) => ({
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );

    const seeded = await collection
      .find({}, { projection: { title: 1, slug: 1, isPublished: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Seeded ${seeded.length} news items into ${DB_NAME}.news`);
    seeded.forEach((item) => {
      console.log(`- ${item.title} | ${item.slug} | published=${item.isPublished}`);
    });
  } catch (error) {
    console.error('Seed news failed:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
