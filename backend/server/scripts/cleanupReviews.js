/**
 * ════════════════════════════════════════════════════════
 *   CLEANUP REVIEWS — Script Dọn Dẹp Comment Không Hợp Lệ
 * ════════════════════════════════════════════════════════
 *
 *   Chạy:  node scripts/cleanupReviews.js
 *
 *   Logic:
 *     1. Đọc toàn bộ review trong database.
 *     2. Kiểm tra tính hợp lệ của từng review:
 *        - User tồn tại trong DB.
 *        - Movie tồn tại trong DB.
 *        - User đã từng mua vé (booking status = confirmed) cho movie đó.
 *        - Rating hợp lệ (1-10) và content hợp lệ (chuỗi dài 10-1000 ký tự).
 *     3. Log chi tiết số lượng review hợp lệ, không hợp lệ kèm lý do và danh sách bị xóa.
 *     4. Xóa review không hợp lệ (hỗ trợ transaction / fallback an toàn) và các like liên quan.
 *     5. Cập nhật lại rating và review_count trong bảng movies.
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
  console.log('   🧹  CLEANUP REVIEWS — Bắt đầu dọn dẹp...');
  console.log('═══════════════════════════════════════════════');
  console.log(`🔗 MONGO_URI: ${MONGO_URI}`);
  console.log(`📦 Database : ${DB_NAME}`);
  console.log('');

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log('🔌 Kết nối database thành công.');

  // 1. Load toàn bộ reviews, users, movies, showtimes và bookings
  console.log('⏳ Đang đọc dữ liệu từ database...');
  const allReviews = await db.collection('reviews').find({}).toArray();
  const totalReviewsCount = allReviews.length;
  console.log(`📋 Tổng số reviews hiện có: ${totalReviewsCount}`);

  if (totalReviewsCount === 0) {
    console.log('✨ Không có review nào trong database để kiểm tra.');
    await client.close();
    return;
  }

  // Lấy toàn bộ users và movies để map cho nhanh
  const users = await db.collection('users').find({}).toArray();
  const movies = await db.collection('movies').find({}).toArray();
  const showtimes = await db.collection('showtimes').find({}).toArray();
  const bookings = await db.collection('bookings').find({}).toArray();

  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  const movieMap = new Map(movies.map(m => [m._id.toString(), m]));
  
  // Map showtime -> movie
  const showtimeMovieMap = new Map(showtimes.map(st => [st._id.toString(), st.movie ? st.movie.toString() : null]));

  // Nhóm các booking confirmed theo user: userId -> Set<movieId>
  const userConfirmedMovies = new Map();
  bookings.forEach(b => {
    if (b.status !== 'confirmed') return;
    const userId = b.user ? b.user.toString() : null;
    const showtimeId = b.showtime ? b.showtime.toString() : null;
    if (!userId || !showtimeId) return;

    const movieId = showtimeMovieMap.get(showtimeId);
    if (!movieId) return;

    if (!userConfirmedMovies.has(userId)) {
      userConfirmedMovies.set(userId, new Set());
    }
    userConfirmedMovies.get(userId).add(movieId);
  });

  const validReviews = [];
  const invalidReviews = [];
  const moviesToRecalculate = new Set(); // Lưu movieId của các phim bị ảnh hưởng

  // 2. Kiểm tra tính hợp lệ của từng review
  for (const r of allReviews) {
    const reviewIdStr = r._id.toString();
    const userIdStr = r.user ? r.user.toString() : null;
    const movieIdStr = r.movie ? r.movie.toString() : null;
    const rating = r.rating;
    const content = r.content;

    let reasons = [];

    // Kiểm tra user
    if (!userIdStr) {
      reasons.push('Thiếu userId');
    } else if (!userMap.has(userIdStr)) {
      reasons.push(`User không tồn tại (userId: ${userIdStr})`);
    }

    // Kiểm tra movie
    if (!movieIdStr) {
      reasons.push('Thiếu movieId');
    } else if (!movieMap.has(movieIdStr)) {
      reasons.push(`Movie không tồn tại (movieId: ${movieIdStr})`);
    }

    // Kiểm tra booking hợp lệ cho phim đó
    if (userIdStr && movieIdStr && userMap.has(userIdStr) && movieMap.has(movieIdStr)) {
      const userPaidMovies = userConfirmedMovies.get(userIdStr);
      if (!userPaidMovies || !userPaidMovies.has(movieIdStr)) {
        // Tìm xem có booking nào khác cho phim này nhưng không ở trạng thái confirmed không
        const allUserBookingsForMovie = bookings.filter(b => {
          const uId = b.user ? b.user.toString() : null;
          const stId = b.showtime ? b.showtime.toString() : null;
          const mId = stId ? showtimeMovieMap.get(stId) : null;
          return uId === userIdStr && mId === movieIdStr;
        });

        if (allUserBookingsForMovie.length > 0) {
          const statuses = allUserBookingsForMovie.map(b => b.status).join(', ');
          reasons.push(`Chưa thanh toán thành công (Booking statuses: ${statuses})`);
        } else {
          reasons.push('Chưa từng mua vé phim này');
        }
      }
    }

    // Kiểm tra rating
    if (rating === undefined || rating === null) {
      reasons.push('Thiếu điểm rating');
    } else if (typeof rating !== 'number' || rating < 1 || rating > 10) {
      reasons.push(`Rating không hợp lệ (${rating})`);
    }

    // Kiểm tra content
    if (!content) {
      reasons.push('Thiếu nội dung comment');
    } else if (typeof content !== 'string') {
      reasons.push('Nội dung comment không phải là chuỗi');
    } else if (content.length < 10) {
      reasons.push(`Nội dung quá ngắn (${content.length} ký tự, tối thiểu 10)`);
    } else if (content.length > 1000) {
      reasons.push(`Nội dung quá dài (${content.length} ký tự, tối đa 1000)`);
    }

    // Phân loại
    if (reasons.length > 0) {
      invalidReviews.push({
        review: r,
        reasons: reasons.join(', ')
      });
      if (movieIdStr) {
        moviesToRecalculate.add(movieIdStr);
      }
    } else {
      validReviews.push(r);
    }
  }

  // 3. Ghi log báo cáo
  console.log('\n📊 BÁO CÁO THỐNG KÊ REVIEW:');
  console.log('─'.repeat(50));
  console.log(`✅ Số lượng review hợp lệ: ${validReviews.length}`);
  console.log(`❌ Số lượng review không hợp lệ (sẽ bị xóa): ${invalidReviews.length}`);
  console.log('─'.repeat(50));

  if (invalidReviews.length > 0) {
    console.log('\n📋 DANH SÁCH REVIEW KHÔNG HỢP LỆ SẼ BỊ XÓA:');
    invalidReviews.forEach((item, index) => {
      const r = item.review;
      const u = r.user ? (userMap.get(r.user.toString())?.full_name || r.user.toString()) : 'N/A';
      const m = r.movie ? (movieMap.get(r.movie.toString())?.title || r.movie.toString()) : 'N/A';
      console.log(`  [${index + 1}] Review ID: ${r._id}`);
      console.log(`      👤 User : ${u}`);
      console.log(`      🎬 Movie: ${m}`);
      console.log(`      ⭐ Rate : ${r.rating} | 💬 Content: "${r.content}"`);
      console.log(`      ⚠️ Lý do: ${item.reasons}`);
    });
  }

  // 4. Tiến hành xóa dữ liệu không hợp lệ
  if (invalidReviews.length === 0) {
    console.log('\n✨ Database sạch! Không có review nào cần xóa.');
    await client.close();
    return;
  }

  console.log(`\n⏳ Bắt đầu xóa ${invalidReviews.length} reviews...`);
  const invalidIds = invalidReviews.map(item => item.review._id);

  // Kiểm tra cấu hình Replica Set của MongoDB trước khi chạy transaction
  let session = null;
  let useTransaction = false;
  try {
    const isMasterResult = await db.admin().command({ isMaster: 1 });
    if (isMasterResult.setName) {
      session = client.startSession();
      session.startTransaction();
      useTransaction = true;
      console.log(`✅ MongoDB Replica Set phát hiện: "${isMasterResult.setName}". Sử dụng transaction.`);
    } else {
      console.log('ℹ️ MongoDB Standalone phát hiện. Chạy trực tiếp không sử dụng transaction.');
    }
  } catch (err) {
    console.log('ℹ️ Không kiểm tra được cấu hình Replica Set. Mặc định chạy trực tiếp không sử dụng transaction.');
  }

  try {
    const options = useTransaction ? { session } : {};

    // Xóa reviews
    const deleteReviewsResult = await db.collection('reviews').deleteMany(
      { _id: { $in: invalidIds } },
      options
    );
    console.log(`🗑️ Đã xóa ${deleteReviewsResult.deletedCount} reviews khỏi bảng 'reviews'`);

    // Xóa reviewlikes liên quan
    const deleteLikesResult = await db.collection('reviewlikes').deleteMany(
      { review: { $in: invalidIds } },
      options
    );
    console.log(`🗑️ Đã xóa ${deleteLikesResult.deletedCount} likes liên quan khỏi bảng 'reviewlikes'`);

    // Commit transaction nếu có
    if (useTransaction && session) {
      await session.commitTransaction();
      console.log('✅ Đã commit transaction thành công.');
    }
  } catch (deleteError) {
    console.error('❌ Lỗi khi thực hiện xóa reviews:', deleteError);
    if (useTransaction && session) {
      await session.abortTransaction();
      console.log('🔄 Đã rollback transaction.');
    }
    await client.close();
    throw deleteError;
  } finally {
    if (session) {
      await session.endSession();
    }
  }

  // 5. Cập nhật lại rating và review_count trong movies cho những phim bị ảnh hưởng
  if (moviesToRecalculate.size > 0) {
    console.log('\n🔄 Đang cập nhật lại rating trung bình và số lượng review cho các phim bị ảnh hưởng...');
    for (const midStr of moviesToRecalculate) {
      const mid = new ObjectId(midStr);
      const mName = movieMap.get(midStr)?.title || midStr;

      // Tính lại trung bình rating và review_count từ các review verified còn lại
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

      console.log(`   ✅ Movie "${mName}": Cập nhật thành ⭐ ${avgRating}/10 (${count} reviews)`);
    }
  }

  console.log('\n🎉 ĐÃ DỌN DẸP HOÀN TẤT!');
  await client.close();
  console.log('🔌 Đã ngắt kết nối database.');
}

main().catch(err => {
  console.error('❌ Lỗi thực thi script cleanup:', err);
  process.exit(1);
});
