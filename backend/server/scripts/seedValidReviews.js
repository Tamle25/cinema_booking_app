/**
 * ════════════════════════════════════════════════════════
 *   SEED VALID REVIEWS — Script Sinh Review Hợp Lệ
 * ════════════════════════════════════════════════════════
 *
 *   Chạy:  node scripts/seedValidReviews.js
 *
 *   Logic:
 *     1. Đọc tất cả bookings có status = confirmed.
 *     2. Ánh xạ showtime -> movie để tìm các cặp (user, movie) hợp lệ.
 *     3. Kiểm tra xem cặp (user, movie) đã có review chưa.
 *        - Nếu có rồi -> Bỏ qua (tránh trùng dữ liệu).
 *        - Nếu chưa -> Tạo review mới với nội dung tiếng Việt tự nhiên và rating ngẫu nhiên 7-10.
 *     4. Lưu vào database và cập nhật lại điểm rating cho movie.
 *     5. Log rõ số lượng tạo mới, số lượng bỏ qua, thông báo nếu thiếu dữ liệu booking.
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

// Danh sách bình luận tiếng Việt tự nhiên
const COMMENTS = [
  'Phim rất hay, đáng xem!',
  'Cốt truyện ổn, diễn xuất tốt.',
  'Xem rất cuốn, không bị chán.',
  'Hình ảnh đẹp, âm thanh tốt.',
  'Xứng đáng ra rạp xem.',
  'Phim giải trí cuối tuần rất hợp.',
  'Nội dung ý nghĩa, xem xong suy nghĩ nhiều.',
  'Diễn viên diễn rất tự nhiên.',
  'Kịch bản hay, nhiều tình tiết bất ngờ.',
  'Phim hay, sẽ giới thiệu cho bạn bè.',
  'Mình rất thích phim này, đáng đồng tiền.',
  'Nhạc phim rất hay, hợp từng cảnh.',
  'CGI đẹp mắt, cảnh hành động mãn nhãn.',
  'Xem xong muốn xem lại lần nữa.',
  'Phim ổn, đi cùng gia đình rất vui.',
  'Đi xem cùng nhóm bạn, ai cũng khen.',
  'Rất đáng tiền vé, recommend cho mọi người.',
  'Cốt truyện cuốn hút từ đầu đến cuối.',
  'Diễn viên chính diễn xuất quá tốt!',
  'Phim vượt kỳ vọng, ban đầu không expect nhiều.',
  'Hay lắm, mình cho 9 điểm!',
  'Xem rất thoải mái, không bị căng thẳng.',
  'Nội dung nhẹ nhàng, phù hợp mọi lứa tuổi.',
  'Phim có chiều sâu, không đơn thuần giải trí.',
  'Hơi ngắn nhưng chất lượng rất tốt.',
  'Trải nghiệm xem phim tuyệt vời.',
  'Dàn diễn viên chemistry rất ăn ý.',
  'Kỹ xảo ấn tượng, không thua Hollywood.',
  'Phim khiến mình cười rất nhiều, rất duyên.',
  'Được lắm, xem trailer hay mà phim cũng hay thật.',
  'Phim Việt chất lượng, ủng hộ!',
  'Mạch phim nhanh, không bị kéo dài.',
  'Mua vé online nhanh gọn, phim cũng hay.',
  'Xem xong ám ảnh mấy ngày luôn.',
  'Phim cảm động, mình khóc ở đoạn cuối.',
  'Bạn bè recommend, quả thật không thất vọng.',
  'Đặt vé lúc tối, xem xong vẫn tỉnh vì hay.',
  'Phim OK, không xuất sắc nhưng xem ổn.',
  'Nửa đầu hơi chậm nhưng nửa sau rất đỉnh.',
  'Kết thúc hơi vội, nhưng tổng thể vẫn hay.',
  'Soundtrack cực đỉnh, nghe xong bị ghiền.',
  'Hay tới mức book vé xem lần 2 luôn.',
  'Phim đáng xem nhất tháng này.',
  'Tạm ổn, giải trí cuối tuần thì rất OK.',
  'Đi xem cùng người yêu rất hợp.'
];

// Shuffle mảng (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Random rating 7 → 10
function randomRating() {
  const r = Math.random();
  if (r < 0.15) return 7;   // 15%
  if (r < 0.40) return 8;   // 25%
  if (r < 0.75) return 9;   // 35%
  return 10;                 // 25%
}

// Random ngày trong 1–30 ngày gần đây
function randomRecentDate() {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * 30) - 1);
  d.setHours(Math.floor(Math.random() * 14) + 8);
  d.setMinutes(Math.floor(Math.random() * 60));
  d.setSeconds(Math.floor(Math.random() * 60));
  return d;
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('   🌱  SEED VALID REVIEWS — CineMax MongoDB');
  console.log('═══════════════════════════════════════════════');
  console.log(`🔗 MONGO_URI: ${MONGO_URI}`);
  console.log(`📦 Database : ${DB_NAME}`);
  console.log('');

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log('🔌 Kết nối database thành công.');

  // 1. Lấy toàn bộ bookings confirmed
  const bookings = await db.collection('bookings')
    .find({ status: 'confirmed' })
    .toArray();
  console.log(`📋 Số lượng bookings confirmed: ${bookings.length}`);

  if (bookings.length === 0) {
    console.log('⚠️  Thiếu dữ liệu: Không tìm thấy bất kỳ booking confirmed nào trong database.');
    console.log('💡 Vui lòng thực hiện đặt vé và thanh toán thành công trước khi chạy seed review.');
    await client.close();
    return;
  }

  // 2. Lấy toàn bộ showtimes chiếu phim và tạo map showtimeId -> movieId
  const showtimes = await db.collection('showtimes').find({}).toArray();
  const showtimeMovieMap = new Map(showtimes.map(st => [st._id.toString(), st.movie ? st.movie.toString() : null]));

  // Lấy danh sách tên user và movie để ghi log chi tiết
  const users = await db.collection('users').find({}).toArray();
  const movies = await db.collection('movies').find({}).toArray();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  const movieMap = new Map(movies.map(m => [m._id.toString(), m]));

  // 3. Xác định các cặp (user, movie) hợp lệ
  const validPairs = new Map(); // key: "userId_movieId" -> { userId, movieId }
  bookings.forEach(b => {
    const userIdStr = b.user ? b.user.toString() : null;
    const showtimeIdStr = b.showtime ? b.showtime.toString() : null;
    if (!userIdStr || !showtimeIdStr) return;

    // Phải là user thực sự tồn tại trong DB
    if (!userMap.has(userIdStr)) return;

    const movieIdStr = showtimeMovieMap.get(showtimeIdStr);
    // Phải là movie thực sự tồn tại trong DB
    if (!movieIdStr || !movieMap.has(movieIdStr)) return;

    const key = `${userIdStr}_${movieIdStr}`;
    validPairs.set(key, { userIdStr, movieIdStr });
  });

  console.log(`👥 Số cặp (User, Movie) đủ điều kiện review: ${validPairs.size}`);

  if (validPairs.size === 0) {
    console.log('⚠️  Thiếu dữ liệu: Không tìm thấy cặp (User, Movie) nào có booking hợp lệ.');
    await client.close();
    return;
  }

  // 4. Lấy reviews hiện có trong DB để tránh trùng
  const existingReviews = await db.collection('reviews').find({}).toArray();
  const existingKeys = new Set(existingReviews.map(r => {
    const u = r.user ? r.user.toString() : '';
    const m = r.movie ? r.movie.toString() : '';
    return `${u}_${m}`;
  }));

  console.log(`📝 Reviews hiện có trong database: ${existingReviews.length}`);

  // 5. Chuẩn bị review để insert
  const reviewsToInsert = [];
  let skippedCount = 0;
  const pool = shuffle([...COMMENTS]);
  let commentIndex = 0;
  const moviesToUpdate = new Set();

  for (const [key, pair] of validPairs.entries()) {
    if (existingKeys.has(key)) {
      skippedCount++;
      continue;
    }

    const { userIdStr, movieIdStr } = pair;
    const rating = randomRating();
    const content = pool[commentIndex % pool.length];
    commentIndex++;
    const date = randomRecentDate();

    reviewsToInsert.push({
      user: new ObjectId(userIdStr),
      movie: new ObjectId(movieIdStr),
      rating,
      content,
      is_verified: true,
      likes_count: Math.floor(Math.random() * 20),
      createdAt: date,
      updatedAt: date
    });

    moviesToUpdate.add(movieIdStr);
    // Add key vào Set tạm thời đề phòng trong cặp có trùng lặp logic
    existingKeys.add(key);
  }

  // 6. Thực hiện insert
  let insertedCount = 0;
  if (reviewsToInsert.length > 0) {
    const result = await db.collection('reviews').insertMany(reviewsToInsert);
    insertedCount = result.insertedCount;
    console.log(`✅ Đã chèn thành công ${insertedCount} review mới vào database.`);
  } else {
    console.log('✨ Không có review mới nào được tạo (Tất cả các cặp user-movie đều đã có review).');
  }

  console.log(`⏭️  Số lượng review bị bỏ qua vì đã tồn tại: ${skippedCount}`);

  // 7. Cập nhật rating và review_count trong movies
  if (moviesToUpdate.size > 0) {
    console.log('\n🔄 Đang tính toán và cập nhật lại rating cho các phim...');
    for (const midStr of moviesToUpdate) {
      const mid = new ObjectId(midStr);
      const mName = movieMap.get(midStr)?.title || midStr;

      const agg = await db.collection('reviews').aggregate([
        { $match: { movie: mid, is_verified: true } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]).toArray();

      let avgRating = 0;
      let count = 0;

      if (agg.length > 0) {
        avgRating = Math.round(agg[0].avg * 10) / 10;
        count = agg[0].count;
      }

      await db.collection('movies').updateOne(
        { _id: mid },
        { $set: { rating: avgRating, review_count: count } }
      );

      console.log(`   ✅ Phim "${mName}": Điểm rating trung bình cập nhật thành ⭐ ${avgRating}/10 (${count} reviews)`);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('   🎉  SEED HOÀN TẤT!');
  console.log(`   📊 Review chèn mới: ${insertedCount}`);
  console.log(`   ⏭️  Review bỏ qua  : ${skippedCount}`);
  console.log(`   🎬 Phim cập nhật  : ${moviesToUpdate.size}`);
  console.log('═══════════════════════════════════════════════');

  await client.close();
  console.log('🔌 Đã ngắt kết nối database.');
}

main().catch(err => {
  console.error('❌ Lỗi thực thi script seed:', err);
  process.exit(1);
});
