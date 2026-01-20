// ============================================
// SEED DATA SCRIPT v2 - Movie Booking System
// Chạy: mongosh "mongodb://127.0.0.1:27017/movie_booking_db" seed-data-v2.js
// ============================================

print("=".repeat(60));
print("BẮT ĐẦU SEED DATA v2");
print("=".repeat(60));

// ============================================
// DANH SÁCH 63 TỈNH/THÀNH PHỐ VIỆT NAM
// ============================================
const VIETNAM_PROVINCES = [
  // 5 Thành phố trực thuộc TW
  "Hà Nội",
  "TP. Hồ Chí Minh", 
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  
  // Miền Bắc (25 tỉnh)
  "Hà Giang", "Cao Bằng", "Bắc Kạn", "Tuyên Quang", "Lào Cai",
  "Điện Biên", "Lai Châu", "Sơn La", "Yên Bái", "Hòa Bình",
  "Thái Nguyên", "Lạng Sơn", "Quảng Ninh", "Bắc Giang", "Phú Thọ",
  "Vĩnh Phúc", "Bắc Ninh", "Hải Dương", "Hưng Yên", "Thái Bình",
  "Hà Nam", "Nam Định", "Ninh Bình",
  
  // Miền Trung (19 tỉnh)  
  "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Quảng Trị",
  "Thừa Thiên Huế", "Quảng Nam", "Quảng Ngãi", "Bình Định", "Phú Yên",
  "Khánh Hòa", "Ninh Thuận", "Bình Thuận",
  "Kon Tum", "Gia Lai", "Đắk Lắk", "Đắk Nông", "Lâm Đồng",
  
  // Miền Nam (17 tỉnh)
  "Bình Phước", "Tây Ninh", "Bình Dương", "Đồng Nai", "Bà Rịa - Vũng Tàu",
  "Long An", "Tiền Giang", "Bến Tre", "Trà Vinh", "Vĩnh Long",
  "Đồng Tháp", "An Giang", "Kiên Giang", "Hậu Giang", "Sóc Trăng",
  "Bạc Liêu", "Cà Mau"
];

print("\n📍 Tổng số tỉnh/thành: " + VIETNAM_PROVINCES.length);

// ============================================
// 1. LẤY ID CÁC HỆ THỐNG RẠP
// ============================================
print("\n" + "=".repeat(60));
print("1. KIỂM TRA HỆ THỐNG RẠP");
print("=".repeat(60));

const cgv = db.cinemasystems.findOne({slug: 'cgv'});
const bhd = db.cinemasystems.findOne({slug: 'bhd-star'});
const lotte = db.cinemasystems.findOne({slug: 'lotte-cinema'});
const beta = db.cinemasystems.findOne({slug: 'beta-cinemas'});

if (!cgv || !bhd || !lotte || !beta) {
  print("❌ Thiếu hệ thống rạp! Vui lòng tạo cinema systems trước.");
  quit();
}

print("✅ CGV: " + cgv._id);
print("✅ BHD Star: " + bhd._id);
print("✅ Lotte: " + lotte._id);
print("✅ Beta: " + beta._id);

// ============================================
// 2. THÊM PHIM MỚI
// ============================================
print("\n" + "=".repeat(60));
print("2. THÊM PHIM MỚI");
print("=".repeat(60));

const newMovies = [
  // Phim đang chiếu (is_active: true)
  {
    title: "Quật Mộ Trùng Ma",
    slug: "quat-mo-trung-ma",
    description: "Một nhóm bạn trẻ vô tình đánh thức thế lực hắc ám khi khai quật ngôi mộ cổ bí ẩn trong khu rừng bị nguyền rủa.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/q/u/quat-mo-trung-ma-payoff-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/q/u/quat-mo-trung-ma-240x201.png",
    trailer_url: "https://www.youtube.com/watch?v=qmtm",
    genre: "Kinh dị, Tâm lý",
    duration: 118,
    rating: 4.5,
    is_active: true,
    release_date: new Date("2026-01-10"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Cô Dâu Hào Môn",
    slug: "co-dau-hao-mon",
    description: "Câu chuyện tình yêu và những âm mưu trong gia đình tài phiệt khi cô gái nghèo bước chân vào thế giới thượng lưu.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/c/o/co-dau-hao-mon-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/c/o/co-dau-hao-mon.png",
    trailer_url: "https://www.youtube.com/watch?v=cdhm",
    genre: "Tình cảm, Hài hước",
    duration: 125,
    rating: 4.2,
    is_active: true,
    release_date: new Date("2026-01-15"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Đố Anh Còng Được Tôi",
    slug: "do-anh-cong-duoc-toi",
    description: "Cuộc rượt đuổi hài hước giữa cảnh sát và tên trộm khét tiếng với những tình huống dở khóc dở cười.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/d/o/do-anh-cong-duoc-toi-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/d/o/do-anh-cong.png",
    trailer_url: "https://www.youtube.com/watch?v=dacdt",
    genre: "Hài hước, Hành động",
    duration: 112,
    rating: 4.0,
    is_active: true,
    release_date: new Date("2026-01-12"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Linh Miêu: Quỷ Nhập Tràng",
    slug: "linh-mieu-quy-nhap-trang",
    description: "Truyền thuyết về con mèo ma quái và lời nguyền đáng sợ trong ngôi làng cổ Việt Nam.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/l/i/linh-mieu-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/l/i/linh-mieu.png",
    trailer_url: "https://www.youtube.com/watch?v=lmqnt",
    genre: "Kinh dị, Tâm lý",
    duration: 109,
    rating: 4.3,
    is_active: true,
    release_date: new Date("2026-01-08"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Godzilla x Kong: Đế Chế Mới",
    slug: "godzilla-x-kong-de-che-moi",
    description: "Hai titan huyền thoại hợp sức chống lại mối đe dọa chưa từng có từ lòng đất.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/g/o/godzilla-kong-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/g/o/godzilla-kong.png",
    trailer_url: "https://www.youtube.com/watch?v=gxkdcm",
    genre: "Hành động, Khoa học viễn tưởng",
    duration: 145,
    rating: 4.6,
    is_active: true,
    release_date: new Date("2026-01-05"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Kung Fu Panda 4",
    slug: "kung-fu-panda-4",
    description: "Po tiếp tục hành trình trở thành bậc thầy võ thuật và đối mặt với kẻ thù mới.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/k/f/kfp4-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/k/f/kfp4.png",
    trailer_url: "https://www.youtube.com/watch?v=kfp4",
    genre: "Hoạt hình, Hài hước",
    duration: 94,
    rating: 4.4,
    is_active: true,
    release_date: new Date("2026-01-18"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Dune: Phần Hai",
    slug: "dune-phan-hai",
    description: "Paul Atreides hợp nhất với người Fremen để báo thù những kẻ đã hủy diệt gia đình anh.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/d/u/dune2-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/d/u/dune2.png",
    trailer_url: "https://www.youtube.com/watch?v=dune2",
    genre: "Khoa học viễn tưởng, Hành động",
    duration: 166,
    rating: 4.8,
    is_active: true,
    release_date: new Date("2026-01-01"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Deadpool & Wolverine",
    slug: "deadpool-wolverine",
    description: "Deadpool tìm cách cứu vũ trụ của mình bằng cách thuyết phục Wolverine quay lại.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/d/w/dw-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/d/w/dw.png",
    trailer_url: "https://www.youtube.com/watch?v=dw",
    genre: "Hành động, Hài hước",
    duration: 128,
    rating: 4.7,
    is_active: true,
    release_date: new Date("2026-01-20"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Phim sắp chiếu (is_active: false hoặc release_date > now)
  {
    title: "Inside Out 2",
    slug: "inside-out-2",
    description: "Riley bước vào tuổi teen với những cảm xúc mới: Lo Âu, Ghen Tị, Chán Nản và Xấu Hổ.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/i/o/io2-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/i/o/io2.png",
    trailer_url: "https://www.youtube.com/watch?v=io2",
    genre: "Hoạt hình, Tâm lý",
    duration: 100,
    rating: 0,
    is_active: true,
    release_date: new Date("2026-02-14"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Captain America: Brave New World",
    slug: "captain-america-brave-new-world",
    description: "Sam Wilson đảm nhận vai trò Captain America mới và đối mặt với âm mưu toàn cầu.",
    poster_url: "https://www.cgv.vn/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/c/a/cabnw-poster.jpg",
    banner_url: "https://www.cgv.vn/media/banner/cache/1/b58515f018eb873dafa430b6f9ae0c1e/c/a/cabnw.png",
    trailer_url: "https://www.youtube.com/watch?v=cabnw",
    genre: "Hành động, Siêu anh hùng",
    duration: 140,
    rating: 0,
    is_active: true,
    release_date: new Date("2026-02-28"),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Xóa phim trùng slug trước khi thêm
const existingSlugs = newMovies.map(m => m.slug);
db.movies.deleteMany({ slug: { $in: existingSlugs } });

const insertedMovies = db.movies.insertMany(newMovies);
print("✅ Đã thêm " + insertedMovies.insertedIds.length + " phim mới");

// ============================================
// 3. THÊM RẠP CHIẾU MỚI (TẬP TRUNG HÀ NỘI)
// ============================================
print("\n" + "=".repeat(60));
print("3. THÊM RẠP CHIẾU MỚI");
print("=".repeat(60));

const newCinemas = [
  // === HÀ NỘI (12 rạp) - Để test ===
  { name: "CGV Vincom Royal City", slug: "cgv-royal-city", address: "Tầng B2, TTTM Vincom Mega Mall Royal City, 72A Nguyễn Trãi, Thanh Xuân", city: "Hà Nội", cinema_system: cgv._id },
  { name: "CGV Hồ Gươm Plaza", slug: "cgv-ho-guom-plaza", address: "Tầng 5, TTTM Hồ Gươm Plaza, 110 Trần Phú, Hà Đông", city: "Hà Nội", cinema_system: cgv._id },
  { name: "CGV Vincom Times City", slug: "cgv-times-city", address: "Tầng B1, TTTM Vincom Mega Mall Times City, 458 Minh Khai, Hai Bà Trưng", city: "Hà Nội", cinema_system: cgv._id },
  
  { name: "BHD Star Vincom Plaza Nguyễn Chí Thanh", slug: "bhd-nguyen-chi-thanh", address: "Tầng 6, Vincom Plaza, 54A Nguyễn Chí Thanh, Đống Đa", city: "Hà Nội", cinema_system: bhd._id },
  { name: "BHD Star The Garden", slug: "bhd-the-garden", address: "Tầng 6, The Garden Shopping Center, Mễ Trì, Nam Từ Liêm", city: "Hà Nội", cinema_system: bhd._id },
  
  { name: "Lotte Cinema Thăng Long", slug: "lotte-thang-long", address: "Tầng 6, Big C Thăng Long, 222 Trần Duy Hưng, Cầu Giấy", city: "Hà Nội", cinema_system: lotte._id },
  { name: "Lotte Cinema Hà Đông", slug: "lotte-ha-dong", address: "Tầng 5, Mipec Tower, 229 Tây Sơn, Đống Đa", city: "Hà Nội", cinema_system: lotte._id },
  { name: "Lotte Cinema Long Biên", slug: "lotte-long-bien", address: "Tầng 4, Savico MegaMall, 7-9 Nguyễn Văn Linh, Long Biên", city: "Hà Nội", cinema_system: lotte._id },
  
  { name: "Beta Thanh Xuân", slug: "beta-thanh-xuan", address: "Tầng 3, Hapulico Complex, 1 Nguyễn Huy Tưởng, Thanh Xuân", city: "Hà Nội", cinema_system: beta._id },
  { name: "Beta Đan Phượng", slug: "beta-dan-phuong", address: "TTTM Thị trấn Phùng, Đan Phượng", city: "Hà Nội", cinema_system: beta._id },
  
  // === TP. HỒ CHÍ MINH (8 rạp) ===
  { name: "CGV Crescent Mall", slug: "cgv-crescent-mall", address: "Tầng 5, Crescent Mall, 101 Tôn Dật Tiên, Q.7", city: "TP. Hồ Chí Minh", cinema_system: cgv._id },
  { name: "CGV Vivo City", slug: "cgv-vivo-city", address: "Tầng 5, SC VivoCity, 1058 Nguyễn Văn Linh, Q.7", city: "TP. Hồ Chí Minh", cinema_system: cgv._id },
  { name: "CGV Aeon Tân Phú", slug: "cgv-aeon-tan-phu", address: "Tầng 3, AEON Mall Tân Phú, 30 Bờ Bao Tân Thắng", city: "TP. Hồ Chí Minh", cinema_system: cgv._id },
  
  { name: "BHD Star Bitexco", slug: "bhd-bitexco", address: "Tầng 3-4, Bitexco Financial Tower, 2 Hải Triều, Q.1", city: "TP. Hồ Chí Minh", cinema_system: bhd._id },
  { name: "BHD Star Phạm Hùng", slug: "bhd-pham-hung", address: "Tầng 4, TTTM Satra Phạm Hùng, Q.8", city: "TP. Hồ Chí Minh", cinema_system: bhd._id },
  
  { name: "Lotte Cinema Cộng Hòa", slug: "lotte-cong-hoa", address: "Tầng 4, Pico Plaza, 20 Cộng Hòa, Tân Bình", city: "TP. Hồ Chí Minh", cinema_system: lotte._id },
  { name: "Lotte Cinema Gò Vấp", slug: "lotte-go-vap", address: "Tầng 3-4, Lotte Mart, 242 Nguyễn Văn Lượng, Gò Vấp", city: "TP. Hồ Chí Minh", cinema_system: lotte._id },
  
  { name: "Beta Hẻm Phim", slug: "beta-hem-phim", address: "80 Lý Tự Trọng, Q.1", city: "TP. Hồ Chí Minh", cinema_system: beta._id },
  
  // === ĐÀ NẴNG (3 rạp) ===
  { name: "CGV Vĩnh Trung Plaza", slug: "cgv-vinh-trung-plaza", address: "Tầng 5, Vĩnh Trung Plaza, 255-257 Hùng Vương", city: "Đà Nẵng", cinema_system: cgv._id },
  { name: "Lotte Cinema Đà Nẵng", slug: "lotte-da-nang", address: "Tầng 5, Lotte Mart, 6 Nại Nam, Hải Châu", city: "Đà Nẵng", cinema_system: lotte._id },
  { name: "BHD Star Vincom Đà Nẵng", slug: "bhd-vincom-da-nang", address: "Tầng 4, Vincom Plaza, 910A Ngô Quyền, Sơn Trà", city: "Đà Nẵng", cinema_system: bhd._id },
  
  // === HẢI PHÒNG (2 rạp) ===
  { name: "CGV Vincom Hải Phòng", slug: "cgv-vincom-hai-phong", address: "Tầng 4, Vincom Plaza, 1 Lê Thánh Tông", city: "Hải Phòng", cinema_system: cgv._id },
  { name: "Lotte Cinema Hải Phòng", slug: "lotte-hai-phong", address: "Tầng 4, Lotte Mart, 10 Lê Hồng Phong", city: "Hải Phòng", cinema_system: lotte._id },
  
  // === CẦN THƠ (2 rạp) ===
  { name: "CGV Vincom Cần Thơ", slug: "cgv-vincom-can-tho", address: "Tầng 5, Vincom Plaza, 209 đường 30/4", city: "Cần Thơ", cinema_system: cgv._id },
  { name: "Lotte Cinema Cần Thơ", slug: "lotte-can-tho", address: "Tầng 2, Lotte Mart, 68 Trần Hưng Đạo, Ninh Kiều", city: "Cần Thơ", cinema_system: lotte._id },
  
  // === CÁC TỈNH KHÁC (Mỗi tỉnh 1 rạp) ===
  { name: "CGV Quảng Ninh", slug: "cgv-quang-ninh", address: "Tầng 4, Vincom Hạ Long, TP. Hạ Long", city: "Quảng Ninh", cinema_system: cgv._id },
  { name: "Lotte Cinema Bình Dương", slug: "lotte-binh-duong", address: "Tầng 3, Lotte Mart, Lái Thiêu, Thuận An", city: "Bình Dương", cinema_system: lotte._id },
  { name: "CGV Đồng Nai", slug: "cgv-dong-nai", address: "Tầng 4, Vincom Biên Hòa", city: "Đồng Nai", cinema_system: cgv._id },
  { name: "Lotte Cinema Vũng Tàu", slug: "lotte-vung-tau", address: "Tầng 3, Lotte Mart, 36 Lê Lợi, TP. Vũng Tàu", city: "Bà Rịa - Vũng Tàu", cinema_system: lotte._id },
  { name: "CGV Thừa Thiên Huế", slug: "cgv-hue", address: "Tầng 4, Vincom Plaza Huế, 50A Hùng Vương", city: "Thừa Thiên Huế", cinema_system: cgv._id },
  { name: "CGV Khánh Hòa", slug: "cgv-khanh-hoa", address: "Tầng 3, Nha Trang Center, 20 Trần Phú, Nha Trang", city: "Khánh Hòa", cinema_system: cgv._id },
  { name: "Lotte Cinema Thanh Hóa", slug: "lotte-thanh-hoa", address: "Tầng 4, Vincom Thanh Hóa, TP. Thanh Hóa", city: "Thanh Hóa", cinema_system: lotte._id },
  { name: "CGV Nghệ An", slug: "cgv-nghe-an", address: "Tầng 4, Vincom Vinh, 25 Quang Trung, TP. Vinh", city: "Nghệ An", cinema_system: cgv._id },
  { name: "Beta Thái Nguyên", slug: "beta-thai-nguyen", address: "TTTM Big C Thái Nguyên", city: "Thái Nguyên", cinema_system: beta._id },
  { name: "CGV Lâm Đồng", slug: "cgv-lam-dong", address: "Tầng 3, Dalat Mall, 01 Hùng Vương, TP. Đà Lạt", city: "Lâm Đồng", cinema_system: cgv._id }
];

// Thêm timestamps
newCinemas.forEach(c => {
  c.createdAt = new Date();
  c.updatedAt = new Date();
});

// Xóa rạp trùng slug trước khi thêm
const existingCinemaSlugs = newCinemas.map(c => c.slug);
db.cinemas.deleteMany({ slug: { $in: existingCinemaSlugs } });

const insertedCinemas = db.cinemas.insertMany(newCinemas);
print("✅ Đã thêm " + insertedCinemas.insertedIds.length + " rạp chiếu mới");

// ============================================
// 4. THÊM PHÒNG CHIẾU CHO CÁC RẠP MỚI Ở HÀ NỘI
// ============================================
print("\n" + "=".repeat(60));
print("4. THÊM PHÒNG CHIẾU CHO RẠP HÀ NỘI");
print("=".repeat(60));

const hanoiCinemas = db.cinemas.find({ city: "Hà Nội" }).toArray();
let roomCount = 0;

hanoiCinemas.forEach(cinema => {
  // Kiểm tra xem rạp đã có phòng chưa
  const existingRooms = db.rooms.countDocuments({ cinema: cinema._id });
  if (existingRooms > 0) {
    print("⏭️ Rạp " + cinema.name + " đã có " + existingRooms + " phòng");
    return;
  }
  
  // Tạo 3-5 phòng cho mỗi rạp
  const roomTypes = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];
  const numRooms = Math.floor(Math.random() * 3) + 3; // 3-5 phòng
  
  const rooms = [];
  for (let i = 1; i <= numRooms; i++) {
    const type = i <= 2 ? "2D" : roomTypes[Math.min(i-1, roomTypes.length-1)];
    const rows = type === "IMAX" ? 12 : 10;
    const columns = type === "IMAX" ? 16 : 12;
    
    rooms.push({
      name: "Phòng " + (i < 10 ? "0" + i : i),
      cinema: cinema._id,
      type: type,
      rows: rows,
      columns: columns,
      total_seats: rows * columns,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  db.rooms.insertMany(rooms);
  roomCount += rooms.length;
  print("✅ Rạp " + cinema.name + ": " + rooms.length + " phòng");
});

print("📊 Tổng số phòng đã thêm: " + roomCount);

// ============================================
// 5. TẠO LỊCH CHIẾU CHO CÁC PHIM Ở HÀ NỘI
// ============================================
print("\n" + "=".repeat(60));
print("5. TẠO LỊCH CHIẾU (CHỈ HÀ NỘI)");
print("=".repeat(60));

// Lấy các phim đang chiếu
const activeMovies = db.movies.find({ 
  is_active: true, 
  release_date: { $lte: new Date() }
}).toArray();

// Lấy 5 rạp ở Hà Nội để tạo lịch chiếu test
const testCinemas = db.cinemas.find({ city: "Hà Nội" }).limit(5).toArray();
let showtimeCount = 0;

// Giờ chiếu mẫu
const showHours = [
  { h: 9, m: 30 },
  { h: 11, m: 45 },
  { h: 14, m: 0 },
  { h: 16, m: 30 },
  { h: 19, m: 0 },
  { h: 21, m: 30 }
];

// Tạo lịch chiếu cho 7 ngày tới
const today = new Date();
today.setHours(0, 0, 0, 0);

testCinemas.forEach(cinema => {
  // Lấy phòng của rạp này
  const rooms = db.rooms.find({ cinema: cinema._id }).limit(3).toArray();
  if (rooms.length === 0) return;
  
  // Mỗi phim chiếu ở 1-2 phòng
  activeMovies.forEach((movie, movieIndex) => {
    const room = rooms[movieIndex % rooms.length];
    
    // Tạo lịch chiếu cho 7 ngày
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      
      // Mỗi ngày 2-3 suất chiếu
      const numShowtimes = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numShowtimes; i++) {
        const showTime = showHours[(movieIndex + i) % showHours.length];
        
        const startTime = new Date(date);
        startTime.setHours(showTime.h, showTime.m, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + movie.duration);
        
        // Kiểm tra trùng lịch
        const existing = db.showtimes.findOne({
          room: room._id,
          start_time: startTime
        });
        
        if (!existing) {
          db.showtimes.insertOne({
            movie: movie._id,
            cinema: cinema._id,
            room: room._id,
            start_time: startTime,
            end_time: endTime,
            price: room.type === "IMAX" ? 150000 : (room.type === "3D" ? 120000 : 90000),
            is_active: true,
            booked_seats: [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
          showtimeCount++;
        }
      }
    }
  });
});

print("✅ Đã tạo " + showtimeCount + " lịch chiếu mới");

// ============================================
// 6. THỐNG KÊ KẾT QUẢ
// ============================================
print("\n" + "=".repeat(60));
print("📊 THỐNG KÊ DATABASE SAU KHI SEED");
print("=".repeat(60));

print("- Cinema Systems: " + db.cinemasystems.countDocuments());
print("- Phim: " + db.movies.countDocuments());
print("- Rạp chiếu: " + db.cinemas.countDocuments());
print("  + Hà Nội: " + db.cinemas.countDocuments({ city: "Hà Nội" }));
print("  + TP.HCM: " + db.cinemas.countDocuments({ city: "TP. Hồ Chí Minh" }));
print("  + Khác: " + db.cinemas.countDocuments({ city: { $nin: ["Hà Nội", "TP. Hồ Chí Minh"] } }));
print("- Phòng chiếu: " + db.rooms.countDocuments());
print("- Lịch chiếu: " + db.showtimes.countDocuments());
print("- Bookings: " + db.bookings.countDocuments());
print("- Users: " + db.users.countDocuments());

print("\n" + "=".repeat(60));
print("✅ SEED DATA HOÀN TẤT!");
print("=".repeat(60));
