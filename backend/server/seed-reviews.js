/**
 * ════════════════════════════════════════════════════════
 *   SEED REVIEWS — MongoDB Seed Script (Node.js thuần)
 * ════════════════════════════════════════════════════════
 *
 *   Chạy:  node seed-reviews.js
 *
 *   Yêu cầu: MongoDB đang chạy, database movie_booking_db tồn tại
 *
 *   Logic:
 *     1. Đọc bookings (status=confirmed) → xác định cặp (user, movie) hợp lệ
 *     2. Với mỗi movie → tạo 1–5 reviews từ users đủ điều kiện
 *     3. Batch insert + cập nhật rating trung bình vào movies
 *
 *   Ràng buộc:
 *     - Chỉ user có booking confirmed cho phim đó mới được review
 *     - Mỗi cặp (userId, movieId) chỉ xuất hiện 1 lần
 *     - Rating: 7 → 10  |  is_verified: true
 * ════════════════════════════════════════════════════════
 */

const { MongoClient, ObjectId } = require('mongodb');

// ─── CONFIG ──────────────────────────────────────────
const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME   = 'movie_booking_db';

// ─── POOL BÌNH LUẬN (45+ câu, ngắn gọn, tự nhiên) ──
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
  'Đi xem cùng người yêu rất hợp.',
];

// ─── HELPERS ─────────────────────────────────────────

/** Shuffle mảng (Fisher-Yates) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random rating 7 → 10 */
function randomRating() {
  const r = Math.random();
  if (r < 0.15) return 7;   // 15%
  if (r < 0.40) return 8;   // 25%
  if (r < 0.75) return 9;   // 35%
  return 10;                 // 25%
}

/** Random ngày trong 1–45 ngày gần đây */
function randomRecentDate() {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * 45) - 1);
  d.setHours(Math.floor(Math.random() * 14) + 8);
  d.setMinutes(Math.floor(Math.random() * 60));
  d.setSeconds(Math.floor(Math.random() * 60));
  return d;
}

// ─── MAIN ────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('   🎬  SEED REVIEWS — CineMax MongoDB');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`✅ Kết nối MongoDB: ${DB_NAME}`);

  // ── 1. Lấy bookings confirmed ──
  const bookings = await db.collection('bookings')
    .find({ status: 'confirmed' })
    .toArray();
  console.log(`📋 Bookings confirmed: ${bookings.length}`);

  if (bookings.length === 0) {
    console.log('⚠️  Không có booking nào! Hãy mua vé trước.');
    await client.close();
    return;
  }

  // ── 2. Map showtime → movie ──
  const stIds = [...new Set(bookings.map(b => b.showtime.toString()))];
  const showtimes = await db.collection('showtimes')
    .find({ _id: { $in: stIds.map(id => new ObjectId(id)) } })
    .toArray();

  const stToMovie = {};
  showtimes.forEach(s => { stToMovie[s._id.toString()] = s.movie.toString(); });

  // ── 3. Xây mapping: movieId → [userIds] ──
  const movieUsers = {};  // { movieId: Set<userId> }
  for (const b of bookings) {
    const uid = b.user.toString();
    const mid = stToMovie[b.showtime.toString()];
    if (!mid) continue;
    if (!movieUsers[mid]) movieUsers[mid] = new Set();
    movieUsers[mid].add(uid);
  }

  // ── 4. Lấy tên user + tên movie để log ──
  const allUids = new Set();
  const allMids = Object.keys(movieUsers);
  Object.values(movieUsers).forEach(s => s.forEach(u => allUids.add(u)));

  const users = await db.collection('users')
    .find({ _id: { $in: [...allUids].map(id => new ObjectId(id)) } })
    .toArray();
  const movies = await db.collection('movies')
    .find({ _id: { $in: allMids.map(id => new ObjectId(id)) } })
    .toArray();

  const uName = {};
  users.forEach(u => { uName[u._id.toString()] = u.full_name || u.email || 'User'; });
  const mName = {};
  movies.forEach(m => { mName[m._id.toString()] = m.title || 'Unknown'; });

  console.log(`👤 Users đủ điều kiện: ${allUids.size}`);
  console.log(`🎬 Movies có booking : ${allMids.length}`);

  // ── 5. Xóa reviews cũ ──
  const oldCount = await db.collection('reviews').countDocuments();
  if (oldCount > 0) {
    await db.collection('reviews').deleteMany({});
    console.log(`🗑️  Xóa ${oldCount} reviews cũ`);
  }
  try { await db.collection('reviewlikes').deleteMany({}); } catch(e) {}

  // ── 6. Tạo reviews ──
  const pool = shuffle([...COMMENTS]);
  let ci = 0;
  const allReviews = [];

  console.log('');
  console.log('📝 Tạo reviews...');
  console.log('─'.repeat(60));

  for (const mid of allMids) {
    const name = mName[mid] || 'Unknown';
    const userList = shuffle([...movieUsers[mid]]);

    // Target: 1–5 reviews / movie, không vượt quá số user
    const target = Math.min(Math.floor(Math.random() * 5) + 1, userList.length);
    const movieReviews = [];

    for (let i = 0; i < target; i++) {
      const uid = userList[i];
      const rating = randomRating();
      const content = pool[ci % pool.length];
      ci++;
      const createdAt = randomRecentDate();

      movieReviews.push({
        user:        new ObjectId(uid),
        movie:       new ObjectId(mid),
        rating,
        content,
        is_verified: true,
        likes_count: Math.floor(Math.random() * 20),
        createdAt,
        updatedAt:   createdAt,
      });
    }

    allReviews.push(...movieReviews);

    // Log
    const avg = (movieReviews.reduce((s,r) => s + r.rating, 0) / movieReviews.length).toFixed(1);
    console.log(`  🎬 "${name}" — ${movieReviews.length} reviews (avg ${avg})`);
    movieReviews.forEach(r => {
      console.log(`     ⭐ ${r.rating}/10 | ${uName[r.user.toString()] || 'User'}`);
      console.log(`     💬 "${r.content}"`);
    });
    console.log('');
  }

  // ── 7. Batch insert ──
  if (allReviews.length === 0) {
    console.log('⚠️  Không tạo được review nào!');
    await client.close();
    return;
  }

  const result = await db.collection('reviews').insertMany(allReviews);
  console.log(`✅ Insert ${result.insertedCount} reviews`);

  // ── 8. Cập nhật rating trung bình cho mỗi phim ──
  console.log('');
  console.log('🔄 Cập nhật rating trung bình...');

  for (const mid of allMids) {
    const agg = await db.collection('reviews').aggregate([
      { $match: { movie: new ObjectId(mid), is_verified: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]).toArray();

    if (agg.length > 0) {
      const avgRating = Math.round(agg[0].avg * 10) / 10;
      const count = agg[0].count;

      await db.collection('movies').updateOne(
        { _id: new ObjectId(mid) },
        { $set: { rating: avgRating, review_count: count } },
      );

      console.log(`   ✅ "${mName[mid] || mid}": ⭐ ${avgRating}/10 (${count} đánh giá)`);
    }
  }

  // ── DONE ──
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('   🎉  SEED HOÀN TẤT!');
  console.log(`   📊 Reviews: ${result.insertedCount}`);
  console.log(`   👤 Users  : ${allUids.size}`);
  console.log(`   🎬 Movies : ${allMids.length}`);
  console.log('═══════════════════════════════════════════════');

  await client.close();
  console.log('🔌 Đã ngắt kết nối');
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
