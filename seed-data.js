// Seed data script for movie_booking_db

// 1. Lấy ID các hệ thống rạp
const cgv = db.cinemasystems.findOne({slug: 'cgv'});
const bhd = db.cinemasystems.findOne({slug: 'bhd-star'});
const lotte = db.cinemasystems.findOne({slug: 'lotte-cinema'});
const beta = db.cinemasystems.findOne({slug: 'beta-cinemas'});

print('=== HE THONG RAP ===');
print('CGV ID: ' + cgv._id);
print('BHD ID: ' + bhd._id);
print('Lotte ID: ' + lotte._id);
print('Beta ID: ' + beta._id);

// 2. Cập nhật rạp CGV Vincom Bà Triệu (thiếu dữ liệu)
db.cinemas.updateOne(
  { name: 'CGV Vincom Bà Triệu' },
  { $set: { 
    cinema_system: cgv._id, 
    city: 'Hà Nội', 
    slug: 'cgv-vincom-ba-trieu',
    updatedAt: new Date()
  }}
);
print('Da cap nhat CGV Vincom Ba Trieu');

// 3. Thêm các rạp mới
const newCinemas = [
  { name: 'CGV Aeon Mall Long Biên', slug: 'cgv-aeon-long-bien', address: 'Tầng 4, AEON Mall Long Biên, 27 Cổ Linh, Long Biên', city: 'Hà Nội', cinema_system: cgv._id, createdAt: new Date(), updatedAt: new Date() },
  { name: 'CGV Landmark 81', slug: 'cgv-landmark-81', address: 'Tầng B1, Landmark 81, 720A Điện Biên Phủ, Bình Thạnh', city: 'TP. Hồ Chí Minh', cinema_system: cgv._id, createdAt: new Date(), updatedAt: new Date() },
  { name: 'BHD Star Vincom Thảo Điền', slug: 'bhd-vincom-thao-dien', address: 'Tầng 5, Vincom Mega Mall Thảo Điền, Q.2', city: 'TP. Hồ Chí Minh', cinema_system: bhd._id, createdAt: new Date(), updatedAt: new Date() },
  { name: 'BHD Star Phạm Ngọc Thạch', slug: 'bhd-pham-ngoc-thach', address: '87 Phạm Ngọc Thạch, Đống Đa', city: 'Hà Nội', cinema_system: bhd._id, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Lotte Cinema Đống Đa', slug: 'lotte-dong-da', address: 'Tầng 5, Lotte Center, 54 Liễu Giai, Đống Đa', city: 'Hà Nội', cinema_system: lotte._id, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Lotte Nowzone', slug: 'lotte-nowzone', address: 'Tầng 5, Nowzone, 235 Nguyễn Văn Cừ, Q.1', city: 'TP. Hồ Chí Minh', cinema_system: lotte._id, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Beta Giải Phóng', slug: 'beta-giai-phong', address: '402 Giải Phóng, Thanh Xuân', city: 'Hà Nội', cinema_system: beta._id, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Beta Quang Trung', slug: 'beta-quang-trung', address: '645 Quang Trung, Gò Vấp', city: 'TP. Hồ Chí Minh', cinema_system: beta._id, createdAt: new Date(), updatedAt: new Date() }
];
db.cinemas.insertMany(newCinemas);
print('Da them 8 rap moi');

// 4. Lấy ID các rạp mới
const cgvBaTrieu = db.cinemas.findOne({slug: 'cgv-vincom-ba-trieu'});
const cgvAeon = db.cinemas.findOne({slug: 'cgv-aeon-long-bien'});
const cgvLandmark = db.cinemas.findOne({slug: 'cgv-landmark-81'});
const bhdThaoDien = db.cinemas.findOne({slug: 'bhd-vincom-thao-dien'});
const bhdPNT = db.cinemas.findOne({slug: 'bhd-pham-ngoc-thach'});
const lotteDongDa = db.cinemas.findOne({slug: 'lotte-dong-da'});
const lotteNowzone = db.cinemas.findOne({slug: 'lotte-nowzone'});
const betaGiaiPhong = db.cinemas.findOne({slug: 'beta-giai-phong'});
const betaQuangTrung = db.cinemas.findOne({slug: 'beta-quang-trung'});
const betaMyDinh = db.cinemas.findOne({slug: 'beta-my-dinh'});

// 5. Thêm phòng chiếu cho các rạp mới
const newRooms = [
  // CGV Bà Triệu
  { name: 'Phòng 1', cinema: cgvBaTrieu._id, type: '2D', rows: 10, columns: 12, total_seats: 120, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Phòng 2', cinema: cgvBaTrieu._id, type: '3D', rows: 8, columns: 10, total_seats: 80, createdAt: new Date(), updatedAt: new Date() },
  { name: 'IMAX', cinema: cgvBaTrieu._id, type: 'IMAX', rows: 12, columns: 20, total_seats: 240, createdAt: new Date(), updatedAt: new Date() },
  // CGV Aeon
  { name: 'Phòng 1', cinema: cgvAeon._id, type: '2D', rows: 10, columns: 12, total_seats: 120, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Phòng 2', cinema: cgvAeon._id, type: '3D', rows: 10, columns: 12, total_seats: 120, createdAt: new Date(), updatedAt: new Date() },
  // CGV Landmark
  { name: 'Phòng Gold Class', cinema: cgvLandmark._id, type: '2D', rows: 6, columns: 8, total_seats: 48, createdAt: new Date(), updatedAt: new Date() },
  { name: 'IMAX', cinema: cgvLandmark._id, type: 'IMAX', rows: 15, columns: 25, total_seats: 375, createdAt: new Date(), updatedAt: new Date() },
  // BHD Thảo Điền
  { name: 'Phòng 1', cinema: bhdThaoDien._id, type: '2D', rows: 10, columns: 12, total_seats: 120, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Phòng 2', cinema: bhdThaoDien._id, type: '3D', rows: 10, columns: 12, total_seats: 120, createdAt: new Date(), updatedAt: new Date() },
  // BHD Phạm Ngọc Thạch
  { name: 'Phòng 1', cinema: bhdPNT._id, type: '2D', rows: 8, columns: 10, total_seats: 80, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Phòng 2', cinema: bhdPNT._id, type: '2D', rows: 8, columns: 10, total_seats: 80, createdAt: new Date(), updatedAt: new Date() },
  // Lotte Đống Đa
  { name: 'Phòng 1', cinema: lotteDongDa._id, type: '2D', rows: 10, columns: 12, total_seats: 120, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Phòng 2', cinema: lotteDongDa._id, type: '3D', rows: 10, columns: 12, total_seats: 120, createdAt: new Date(), updatedAt: new Date() },
  // Lotte Nowzone
  { name: 'Phòng 1', cinema: lotteNowzone._id, type: '2D', rows: 10, columns: 12, total_seats: 120, createdAt: new Date(), updatedAt: new Date() },
  // Beta Giải Phóng
  { name: 'Phòng 1', cinema: betaGiaiPhong._id, type: '2D', rows: 8, columns: 10, total_seats: 80, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Phòng 2', cinema: betaGiaiPhong._id, type: '2D', rows: 8, columns: 10, total_seats: 80, createdAt: new Date(), updatedAt: new Date() },
  // Beta Quang Trung
  { name: 'Phòng 1', cinema: betaQuangTrung._id, type: '2D', rows: 10, columns: 10, total_seats: 100, createdAt: new Date(), updatedAt: new Date() },
];
db.rooms.insertMany(newRooms);
print('Da them 17 phong chieu moi');

// 6. Sửa phòng cũ (Phòng 01, 03) - đang trỏ sai cinema_system thay vì cinema
const betaMyDinhId = betaMyDinh._id;
db.rooms.updateMany(
  { cinema: ObjectId('6969bfebd88f7005f5a84cdb') }, // ID của Beta cinema_system (sai)
  { $set: { cinema: betaMyDinhId } } // Sửa thành ID của Beta Mỹ Đình cinema
);
print('Da sua cac phong cu tro dung cinema');

// 7. Lấy ID các phòng và phim để tạo suất chiếu
const avatar = db.movies.findOne({slug: 'avatar-fire-and-ash'});
const mai = db.movies.findOne({slug: 'mai'});
const daoPho = db.movies.findOne({slug: 'dao-pho-va-piano'});
const deadpool = db.movies.findOne({slug: 'deadpool-and-wolverine'});

// Lấy phòng của từng rạp
const roomsCGVBaTrieu = db.rooms.find({cinema: cgvBaTrieu._id}).toArray();
const roomsCGVAeon = db.rooms.find({cinema: cgvAeon._id}).toArray();
const roomsBHDPNT = db.rooms.find({cinema: bhdPNT._id}).toArray();
const roomsLotteDongDa = db.rooms.find({cinema: lotteDongDa._id}).toArray();
const roomsBetaMyDinh = db.rooms.find({cinema: betaMyDinh._id}).toArray();
const roomsBetaGiaiPhong = db.rooms.find({cinema: betaGiaiPhong._id}).toArray();

// 8. Tạo suất chiếu cho nhiều ngày (17/01 - 22/01/2026)
const dates = [
  new Date('2026-01-17'),
  new Date('2026-01-18'),
  new Date('2026-01-19'),
  new Date('2026-01-20'),
  new Date('2026-01-21'),
  new Date('2026-01-22'),
];

const times = ['09:00', '11:30', '14:00', '16:30', '19:00', '21:30'];
const prices = { '2D': 75000, '3D': 100000, 'IMAX': 150000 };

let showtimesData = [];

// Helper function để tạo ngày giờ
function createDateTime(date, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

// Tạo suất chiếu cho CGV Bà Triệu
dates.forEach(date => {
  if (roomsCGVBaTrieu.length > 0) {
    const room = roomsCGVBaTrieu[0];
    times.slice(0, 4).forEach(time => {
      const startTime = createDateTime(date, time);
      showtimesData.push({
        movie: deadpool._id,
        cinema: cgvBaTrieu._id,
        room: room._id,
        start_time: startTime,
        end_time: new Date(startTime.getTime() + deadpool.duration * 60000),
        price: prices[room.type] || 75000,
        is_active: true,
        booked_seats: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
});

// Tạo suất chiếu cho BHD Phạm Ngọc Thạch
dates.forEach(date => {
  if (roomsBHDPNT.length > 0) {
    const room = roomsBHDPNT[0];
    times.slice(1, 5).forEach(time => {
      const startTime = createDateTime(date, time);
      showtimesData.push({
        movie: avatar._id,
        cinema: bhdPNT._id,
        room: room._id,
        start_time: startTime,
        end_time: new Date(startTime.getTime() + avatar.duration * 60000),
        price: prices[room.type] || 75000,
        is_active: true,
        booked_seats: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
});

// Tạo suất chiếu cho Lotte Đống Đa
dates.forEach(date => {
  if (roomsLotteDongDa.length > 0) {
    roomsLotteDongDa.forEach(room => {
      times.slice(2, 6).forEach(time => {
        const startTime = createDateTime(date, time);
        const movie = room.type === '3D' ? avatar : mai;
        showtimesData.push({
          movie: movie._id,
          cinema: lotteDongDa._id,
          room: room._id,
          start_time: startTime,
          end_time: new Date(startTime.getTime() + movie.duration * 60000),
          price: prices[room.type] || 75000,
          is_active: true,
          booked_seats: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    });
  }
});

// Tạo suất chiếu cho Beta Giải Phóng
dates.forEach(date => {
  if (roomsBetaGiaiPhong.length > 0) {
    const room = roomsBetaGiaiPhong[0];
    times.slice(0, 5).forEach(time => {
      const startTime = createDateTime(date, time);
      showtimesData.push({
        movie: daoPho._id,
        cinema: betaGiaiPhong._id,
        room: room._id,
        start_time: startTime,
        end_time: new Date(startTime.getTime() + daoPho.duration * 60000),
        price: prices[room.type] || 65000,
        is_active: true,
        booked_seats: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
});

if (showtimesData.length > 0) {
  db.showtimes.insertMany(showtimesData);
  print('Da them ' + showtimesData.length + ' suat chieu moi');
}

print('');
print('=== HOAN TAT ===');
print('He thong rap: ' + db.cinemasystems.countDocuments());
print('Rap phim: ' + db.cinemas.countDocuments());
print('Phong chieu: ' + db.rooms.countDocuments());
print('Suat chieu: ' + db.showtimes.countDocuments());
