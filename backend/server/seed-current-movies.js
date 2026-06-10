/**
 * Script cập nhật các phim đang chiếu và sắp chiếu thực tế
 * và tự động sinh các suất chiếu (showtimes) tương ứng tại các rạp và phòng.
 * 
 * Chạy: node seed-current-movies.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Đọc cấu hình từ file .env
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

// Danh sách phim đang chiếu và sắp chiếu thực tế theo yêu cầu của người dùng
const rawMovies = [
  // 1. Phim Đang Chiếu (Release date < 10/06/2026)
  {
    title: 'Ma Xó',
    slug: 'ma-xo',
    description: 'Bộ phim kinh dị tâm linh rùng rợn xoay quanh truyền thuyết về Ma Xó và những bí ẩn chưa có lời giải tại một ngôi làng hẻo lánh.',
    poster_url: '',
    poster_public_id: '',
    banner_url: '',
    banner_public_id: '',
    trailer_url: '',
    rating: 7.5,
    review_count: 5,
    is_active: true,
    duration: 95,
    release_date: new Date('2026-06-01T00:00:00+07:00'),
    genreSlugs: ['kinh-di', 'tam-ly']
  },
  {
    title: 'Lầu Chú Hỏa',
    slug: 'lau-chu-hoa',
    description: 'Lấy cảm hứng từ những câu chuyện đô thị kỳ bí xung quanh dinh thự của Chú Hỏa - một trong những đại phú gia Sài Gòn xưa.',
    poster_url: '',
    poster_public_id: '',
    banner_url: '',
    banner_public_id: '',
    trailer_url: '',
    rating: 7.8,
    review_count: 8,
    is_active: true,
    duration: 105,
    release_date: new Date('2026-05-28T00:00:00+07:00'),
    genreSlugs: ['kinh-di', 'tam-ly']
  },
  {
    title: 'Colony: Bầy Xác Sống',
    slug: 'colony-bay-xac-song',
    description: 'Khi đại dịch zombie bùng phát, một nhóm người sống sót phải ẩn náu tại một thuộc địa biệt lập và đối mặt với bầy xác sống khát máu bên ngoài.',
    poster_url: '',
    poster_public_id: '',
    banner_url: '',
    banner_public_id: '',
    trailer_url: '',
    rating: 7.2,
    review_count: 12,
    is_active: true,
    duration: 110,
    release_date: new Date('2026-06-03T00:00:00+07:00'),
    genreSlugs: ['hanh-dong', 'kinh-di', 'vien-tuong']
  },
  {
    title: 'Tên Cậu Là Gì',
    slug: 'ten-cau-la-gi',
    description: 'Một câu chuyện tình cảm nhẹ nhàng, lãng mạn tuổi thanh xuân với những hiểu lầm dở khóc dở cười và cái kết đầy cảm xúc.',
    poster_url: '',
    poster_public_id: '',
    banner_url: '',
    banner_public_id: '',
    trailer_url: '',
    rating: 8.2,
    review_count: 15,
    is_active: true,
    duration: 100,
    release_date: new Date('2026-06-05T00:00:00+07:00'),
    genreSlugs: ['tinh-cam', 'tam-ly', 'hai']
  },

  // 2. Phim Sắp Chiếu (Release date > 10/06/2026)
  {
    title: 'Trại Buôn Người',
    slug: 'trai-buon-nguoi',
    description: 'Một đặc vụ chìm dấn thân vào tổ chức buôn người xuyên quốc gia để giải cứu những nạn nhân vô tội, đối đầu với những tên tội phạm máu lạnh.',
    poster_url: '',
    poster_public_id: '',
    banner_url: '',
    banner_public_id: '',
    trailer_url: '',
    rating: 0,
    review_count: 0,
    is_active: true,
    duration: 120,
    release_date: new Date('2026-06-25T00:00:00+07:00'),
    genreSlugs: ['hanh-dong', 'tam-ly']
  },
  {
    title: 'Nghỉ Hè Sợ Nghỉ Hưu',
    slug: 'nghi-he-so-nghi-huu',
    description: 'Câu chuyện dở khóc dở cười về một ông bố trung niên quyết định đi nghỉ hè cùng gia đình để trốn tránh nỗi sợ phải về hưu sớm.',
    poster_url: '',
    poster_public_id: '',
    banner_url: '',
    banner_public_id: '',
    trailer_url: '',
    rating: 0,
    review_count: 0,
    is_active: true,
    duration: 90,
    release_date: new Date('2026-07-05T00:00:00+07:00'),
    genreSlugs: ['hai', 'gia-dinh', 'tam-ly']
  }
];

async function main() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('🔌 Kết nối thành công đến MongoDB:', MONGO_URI);
    const db = client.db(DB_NAME);

    // 1. Lấy danh sách thể loại từ DB để ánh xạ
    const genresInDb = await db.collection('genres').find({ isActive: true }).toArray();
    console.log(`📋 Lấy được ${genresInDb.length} thể loại từ Database`);
    
    const genreMap = {};
    genresInDb.forEach(g => {
      genreMap[g.slug] = g._id;
    });

    // 2. Chuẩn bị dữ liệu phim để cập nhật
    const moviesToUpsert = rawMovies.map(movie => {
      const genresMapped = (movie.genreSlugs || [])
        .map(slug => genreMap[slug])
        .filter(id => id !== undefined);

      const movieDoc = {
        title: movie.title,
        slug: movie.slug,
        description: movie.description,
        poster_url: movie.poster_url,
        poster_public_id: movie.poster_public_id,
        banner_url: movie.banner_url,
        banner_public_id: movie.banner_public_id,
        trailer_url: movie.trailer_url,
        rating: movie.rating,
        review_count: movie.review_count,
        is_active: movie.is_active,
        duration: movie.duration,
        release_date: movie.release_date,
        genres: genresMapped,
        updatedAt: new Date()
      };

      return movieDoc;
    });

    console.log('🔄 Bắt đầu cập nhật danh sách phim...');
    
    // Thực hiện upsert các phim dựa trên slug
    for (const movieDoc of moviesToUpsert) {
      await db.collection('movies').updateOne(
        { slug: movieDoc.slug },
        { 
          $set: movieDoc,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
      console.log(`  - Đã cập nhật phim: "${movieDoc.title}" (${movieDoc.slug})`);
    }

    // Lấy lại danh sách phim từ DB để có đầy đủ _id
    const dbMovies = await db.collection('movies').find({
      slug: { $in: rawMovies.map(m => m.slug) }
    }).toArray();

    // Phân chia phim đang chiếu để sinh suất chiếu
    const now = new Date('2026-06-10T23:57:00+07:00'); // Mốc thời gian hệ thống giả định
    const showingMovies = dbMovies.filter(m => new Date(m.release_date) <= now);
    console.log(`🎬 Tìm thấy ${showingMovies.length} phim đang chiếu để sinh suất chiếu`);

    if (showingMovies.length === 0) {
      console.log('⚠️ Không có phim đang chiếu nào được tìm thấy. Bỏ qua bước sinh suất chiếu.');
      return;
    }

    const showingMovieIds = showingMovies.map(m => m._id);

    // 3. Xóa các suất chiếu cũ của các phim đang chiếu này để dọn dẹp dữ liệu
    const deleteRes = await db.collection('showtimes').deleteMany({
      movie: { $in: showingMovieIds }
    });
    console.log(`🗑️ Đã xóa ${deleteRes.deletedCount} suất chiếu cũ của các phim này`);

    // 4. Lấy danh sách rạp và phòng chiếu
    const rooms = await db.collection('rooms').find({ is_active: true }).toArray();
    console.log(`🏢 Lấy được ${rooms.length} phòng chiếu đang hoạt động từ Database`);

    if (rooms.length === 0) {
      console.log('⚠️ Không tìm thấy phòng chiếu nào trong DB. Bỏ qua bước sinh suất chiếu.');
      return;
    }

    // Các ngày sinh suất chiếu: ngày 10, 11, 12, 13 tháng 6 năm 2026
    const targetDays = [10, 11, 12, 13];
    const hours = [9, 12, 15, 18, 21]; // Các khung giờ vàng trong ngày
    const showtimesToInsert = [];

    const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    console.log('🕒 Bắt đầu sinh suất chiếu ngẫu nhiên thực tế...');

    for (const day of targetDays) {
      for (const room of rooms) {
        // Sinh toàn bộ ghế cho phòng này
        const allSeats = [];
        const numRows = room.rows || 10;
        const numCols = room.columns || 10;
        
        for (let r = 0; r < numRows; r++) {
          const letter = rowLetters[r] || 'A';
          for (let c = 1; c <= numCols; c++) {
            allSeats.push(`${letter}${c}`);
          }
        }

        for (const hour of hours) {
          // Chọn ngẫu nhiên 1 phim trong số phim đang chiếu
          const randomMovie = showingMovies[Math.floor(Math.random() * showingMovies.length)];
          
          // Tính thời gian bắt đầu (múi giờ +07:00)
          const startStr = `2026-06-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00+07:00`;
          const startTime = new Date(startStr);
          
          // Thời gian kết thúc
          const endTime = new Date(startTime.getTime() + randomMovie.duration * 60 * 1000);

          // Tính giá vé
          let basePrice = 85000; // Giá mặc định 2D
          if (room.type === '3D') {
            basePrice = 110000;
          } else if (room.type === 'IMAX') {
            basePrice = 160000;
          }

          // Cộng thêm tiền giờ cao điểm (sau 17h)
          if (hour >= 17) {
            basePrice += 15000;
          }

          // Cộng thêm tiền ngày cuối tuần (13/06/2026 là Thứ Bảy)
          if (day === 13) {
            basePrice += 10000;
          }

          // Sinh ngẫu nhiên ghế đã đặt (booked_seats) từ 2 đến 12 ghế
          const seatsPool = [...allSeats];
          const numBooked = Math.floor(Math.random() * 11) + 2; // Random 2 - 12 ghế
          const bookedSeats = [];
          for (let i = 0; i < numBooked; i++) {
            if (seatsPool.length === 0) break;
            const randIdx = Math.floor(Math.random() * seatsPool.length);
            bookedSeats.push(seatsPool.splice(randIdx, 1)[0]);
          }

          showtimesToInsert.push({
            movie: randomMovie._id,
            cinema: room.cinema,
            room: room._id,
            start_time: startTime,
            end_time: endTime,
            price: basePrice,
            is_active: true,
            booked_seats: bookedSeats,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    console.log(`📦 Đang chuẩn bị chèn ${showtimesToInsert.length} suất chiếu mới...`);
    
    if (showtimesToInsert.length > 0) {
      const insertRes = await db.collection('showtimes').insertMany(showtimesToInsert);
      console.log(`✅ Đã chèn thành công ${insertRes.insertedCount} suất chiếu mới vào Database!`);
    }

    console.log('\n🎉 Hoàn thành seed dữ liệu phim và suất chiếu!');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình seed dữ liệu:', error);
  } finally {
    await client.close();
    console.log('🔌 Đã ngắt kết nối MongoDB');
  }
}

main();
