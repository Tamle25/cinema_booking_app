/**
 * ════════════════════════════════════════════════════════
 *   SYNC MOVIE RATINGS — Đồng Bộ Rating & Review Count
 * ════════════════════════════════════════════════════════
 *
 *   Chạy:  node scripts/syncMovieRatings.js
 *
 *   Logic:
 *     1. Duyệt tất cả movies trong database.
 *     2. Với mỗi movie, tính rating trung bình và số lượng review
 *        thực tế từ collection reviews.
 *     3. Nếu giá trị cached trong movies khác với giá trị thực tế,
 *        cập nhật lại cho đúng.
 *     4. Log chi tiết các phim bị lệch và đã được sửa.
 * ════════════════════════════════════════════════════════
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Load environment variables từ file .env ở thư mục cha
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking_db';
const DB_NAME   = MONGO_URI.split('/').pop().split('?')[0] || 'movie_booking_db';

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('   🔄  SYNC MOVIE RATINGS — Đồng bộ dữ liệu');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log('🔌 Kết nối database thành công.');

  // 1. Lấy tất cả movies
  const movies = await db.collection('movies').find({}).toArray();
  console.log(`🎬 Tổng số phim: ${movies.length}`);

  let fixedCount = 0;
  let okCount = 0;

  // 2. Duyệt từng movie và so sánh với reviews thực tế
  for (const movie of movies) {
    const mid = movie._id;
    const title = movie.title || 'Unknown';

    // Tính toán từ collection reviews
    const agg = await db.collection('reviews').aggregate([
      { $match: { movie: mid, is_verified: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]).toArray();

    let actualRating = 0;
    let actualCount = 0;

    if (agg.length > 0) {
      actualRating = Math.round(agg[0].avg * 10) / 10;
      actualCount = agg[0].count;
    }

    const cachedRating = movie.rating || 0;
    const cachedCount = movie.review_count || 0;

    // So sánh
    if (cachedRating !== actualRating || cachedCount !== actualCount) {
      await db.collection('movies').updateOne(
        { _id: mid },
        { $set: { rating: actualRating, review_count: actualCount } }
      );
      console.log(`   ❌ → ✅ "${title}": rating ${cachedRating}→${actualRating}, count ${cachedCount}→${actualCount}`);
      fixedCount++;
    } else {
      okCount++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('   📊  KẾT QUẢ ĐỒNG BỘ:');
  console.log(`   ✅ Phim đã đúng  : ${okCount}`);
  console.log(`   🔧 Phim đã sửa  : ${fixedCount}`);
  console.log(`   📦 Tổng số phim  : ${movies.length}`);
  console.log('═══════════════════════════════════════════════');

  await client.close();
  console.log('🔌 Đã ngắt kết nối database.');
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
