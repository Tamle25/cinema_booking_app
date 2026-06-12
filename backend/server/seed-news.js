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

const generateFakeLikedUsers = (count) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(`fake_user_${Math.random().toString(36).substr(2, 9)}`);
  }
  return users;
};

const newsData = [
  {
    title: 'Mở bán vé sớm bom tấn siêu anh hùng Avengers: Secret Wars',
    slug: 'mo-ban-ve-som-bom-tan-sieu-anh-hung-avengers-secret-wars',
    shortDescription: 'Lịch mở bán được cập nhật sớm hơn để khán giả dễ dàng chọn suất chiếu đẹp và ghế tốt nhất.',
    content: 'CineMax chính thức mở bán sớm cho siêu bom tấn điện ảnh lớn nhất năm nay. Khán giả có thể theo dõi lịch chiếu chi tiết, lựa chọn vị trí ghế ngồi mong muốn và thanh toán trực tiếp trên hệ thống website/app CineMax.\n\nNhanh tay đặt vé ngay hôm nay để nhận quà tặng độc quyền tại rạp!',
    thumbnail: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'cinema',
    likedUsers: generateFakeLikedUsers(45),
    likesCount: 45,
  },
  {
    title: 'Ưu đãi Combo Bỏng Nước Double cực hời ngày cuối tuần',
    slug: 'uu-dai-combo-bong-nuoc-double-cuc-hoi-ngay-cuoi-tuan',
    shortDescription: 'Nhận ngay mức giá combo ưu đãi siêu hời khi đặt vé xem phim trực tuyến vào thứ Sáu, thứ Bảy và Chủ nhật.',
    content: 'Đồng hành cùng những thước phim kịch tính là gói combo bỏng nước ngập tràn ưu đãi từ CineMax. Chương trình áp dụng cho tất cả khách hàng đặt vé xem phim trực tuyến trên hệ thống website.\n\nCombo Double gồm 1 bỏng lớn và 2 nước ngọt mát lạnh sẽ giúp trải nghiệm xem phim cuối tuần của bạn thêm phần trọn vẹn.',
    thumbnail: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'promotion',
    likedUsers: [],
    likesCount: 88,
  },
  {
    title: 'Đại tiệc CineMax: Đồng giá vé 45k cho học sinh, sinh viên',
    slug: 'dai-tiec-cinemax-dong-gia-ve-45k-cho-hoc-sinh-sinh-vien',
    shortDescription: 'Chương trình tri ân đặc biệt đồng giá vé 45.000 VNĐ dành riêng cho các bạn học sinh, sinh viên trên toàn quốc.',
    content: 'Nhằm mang điện ảnh đến gần hơn với giới trẻ, CineMax tung ra chương trình ưu đãi lớn nhất năm. Chỉ với 45k, các bạn học sinh và sinh viên có thể thưởng thức các bộ phim hot nhất (ngoại trừ các phòng chiếu đặc biệt).\n\nVui lòng xuất trình thẻ học sinh/sinh viên hợp lệ tại quầy vé khi soát vé.',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'promotion',
    likedUsers: [],
    likesCount: 120,
  },
  {
    title: 'Đạo diễn Christopher Nolan hé lộ dự án phim viễn tưởng mới',
    slug: 'dao-dien-christopher-nolan-he-lo-du-an-phim-vien-tuong-moi',
    shortDescription: 'Vị đạo diễn tài ba chuẩn bị bấm máy tác phẩm khoa học viễn tưởng đầy hứa hẹn tiếp theo sau thành công của Oppenheimer.',
    content: 'Theo nguồn tin từ Hollywood, Christopher Nolan đang hoàn thiện kịch bản cho một dự án phim khoa học viễn tưởng mới với kinh phí khổng lồ. Phim dự kiến sẽ tiếp tục hợp tác với các ngôi sao hạng A và ghi hình bằng máy quay IMAX chuyên dụng.\n\nKhán giả yêu điện ảnh toàn cầu đang vô cùng háo hức chờ đợi siêu phẩm này.',
    thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'cinema',
    likedUsers: [],
    likesCount: 32,
  },
  {
    title: 'Review nhanh siêu phẩm kinh dị đang thống trị phòng vé toàn cầu',
    slug: 'review-nhanh-sieu-pham-kinh-di-dang-thong-tri-phong-ve-toan-cau',
    shortDescription: 'Tác phẩm điện ảnh kinh dị mới nhất khiến khán giả khóc thét và gặt hái doanh thu phòng vé khổng lồ.',
    content: 'Bộ phim kinh dị mới ra mắt đã nhanh chóng nhận về cơn mưa lời khen từ giới chuyên môn lẫn khán giả đại chúng. Với bầu không khí u ám, âm thanh giật gân và diễn xuất xuất thần của dàn diễn viên chính, tác phẩm xứng đáng là phim kinh dị đáng xem nhất năm nay.\n\nHiện phim đang được chiếu tại tất cả các cụm rạp đối tác của CineMax.',
    thumbnail: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'cinema',
    likedUsers: [],
    likesCount: 15,
  },
  {
    title: 'Tưng bừng khai trương cụm rạp mới CineMax Landmark quận 1',
    slug: 'tung-bung-khai-truong-cum-rap-moi-cinemax-landmark-quan-1',
    shortDescription: 'Cụm rạp tiêu chuẩn quốc tế mới nhất của CineMax chính thức đi vào hoạt động với nhiều phần quà hấp dẫn.',
    content: 'CineMax hân hạnh giới thiệu cụm rạp thứ 15 tại tòa nhà Landmark Quận 1. Rạp được trang bị hệ thống máy chiếu laser sắc nét cùng âm thanh Dolby Atmos sống động.\n\nTrong tuần lễ khai trương, khách hàng mua vé sẽ được tặng ngay bỏng ngọt miễn phí và có cơ hội bốc thăm trúng thưởng nhiều phần quà giá trị.',
    thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'promotion',
    likedUsers: [],
    likesCount: 50,
  },
  {
    title: 'Điểm danh những bộ phim hoạt hình gia đình xuất sắc nhất hè này',
    slug: 'diem-danh-nhung-bo-phim-hoat-hinh-gia-dinh-xuat-sac-nhat-he-nay',
    shortDescription: 'Gợi ý những tác phẩm hoạt hình vui nhộn, ý nghĩa thích hợp cho cả gia đình cùng thưởng thức trong dịp hè.',
    content: 'Mùa hè là khoảng thời gian tuyệt vời để cả gia đình cùng nhau ra rạp xem phim. Năm nay, các nhà sản xuất mang đến nhiều lựa chọn hoạt hình chất lượng từ vui nhộn, hài hước đến những câu chuyện gia đình đầy cảm động.\n\nHãy cùng CineMax điểm qua danh sách những bộ phim hoạt hình không thể bỏ lỡ nhé!',
    thumbnail: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'cinema',
    likedUsers: [],
    likesCount: 24,
  },
  {
    title: 'Khuyến mãi Tết: Nhận ngay bao lì xì và voucher giảm giá 50%',
    slug: 'khuyen-mai-tet-nhan-ngay-bao-li-xi-va-voucher-giam-gia-50',
    shortDescription: 'Đón Tết ấm áp cùng CineMax với chương trình lì xì đầu năm cực khủng dành tặng tất cả hội viên.',
    content: 'Nhân dịp Tết Nguyên Đán, CineMax gửi lời chúc năm mới an khang thịnh vượng đến toàn thể khách hàng. Khi đặt vé xem phim trong dịp Tết, bạn sẽ được tặng ngay 1 xấp bao lì xì CineMax thiết kế độc quyền và 1 voucher giảm 50% cho lần đặt vé tiếp theo.\n\nSố lượng quà tặng có hạn, hãy nhanh tay đặt vé ngay!',
    thumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'promotion',
    likedUsers: [],
    likesCount: 95,
  },
  {
    title: 'Hành trình xây dựng kỹ xảo điện ảnh đỉnh cao của bom tấn Avatar 3',
    slug: 'hanh-trinh-xay-dung-ky-xao-dien-anh-dinh-cao-cua-bom-tan-avatar-3',
    shortDescription: 'Khám phá hậu trường công nghệ đồ họa và kỹ xảo 3D mang tính cách mạng điện ảnh thế giới.',
    content: 'Phần 3 của loạt phim Avatar hứa hẹn sẽ đưa khán giả đến những vùng đất mới chưa từng thấy trên hành tinh Pandora. Đội ngũ sản xuất đã dành hơn 2 năm để phát triển công nghệ mô phỏng nước và ánh sáng dưới đại dương ở mức độ chân thực chưa từng có.\n\nTác phẩm tiếp tục khẳng định vị thế dẫn đầu của James Cameron về mặt công nghệ điện ảnh.',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'cinema',
    likedUsers: [],
    likesCount: 63,
  },
  {
    title: 'Happy Wednesday: Giảm ngay 30% giá vé vào mỗi thứ Tư hàng tuần',
    slug: 'happy-wednesday-giam-ngay-30-gia-ve-vao-moi-thu-tu-hang-tuan',
    shortDescription: 'Cơ hội vàng xem phim giá rẻ ngập tràn niềm vui vào ngày giữa tuần tại tất cả cụm rạp CineMax.',
    content: 'Để giữa tuần không còn tẻ nhạt, CineMax mang đến chương trình Happy Wednesday. Toàn bộ vé xem phim 2D/3D chiếu vào ngày thứ Tư hàng tuần đều được giảm thẳng 30% giá vé gốc.\n\nLên lịch hẹn hò hoặc tụ tập bạn bè ngay thứ Tư này thôi nào!',
    thumbnail: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'promotion',
    likedUsers: [],
    likesCount: 112,
  },
  {
    title: 'Liên hoan phim Quốc tế Cannes 2026 chính thức khai mạc',
    slug: 'lien-hoan-phim-quoc-te-cannes-2026-chinh-thuc-khai-mac',
    shortDescription: 'Sự kiện điện ảnh danh giá nhất hành tinh quy tụ hàng loạt ngôi sao và những tác phẩm nghệ thuật xuất chúng.',
    content: 'LHP Cannes 2026 đã chính thức mở màn tại thành phố biển xinh đẹp nước Pháp. Năm nay, danh sách tranh giải Cành cọ vàng chứng kiến sự cạnh tranh khốc liệt giữa các nhà làm phim gạo cội và những tài năng trẻ triển vọng.\n\nCineMax sẽ liên tục cập nhật thông tin về các tác phẩm đoạt giải và lịch chiếu tại Việt Nam.',
    thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'cinema',
    likedUsers: [],
    likesCount: 8,
  },
  {
    title: 'Săn vé IMAX nhận quà độc quyền từ nhà phát hành CineMax',
    slug: 'san-ve-imax-nhan-qua-doc-quyen-tu-nha-phat-hanh-cinemax',
    shortDescription: 'Trải nghiệm phòng chiếu IMAX cực đỉnh và nhận ngay poster, kỷ niệm chương giới hạn.',
    content: 'Dành riêng cho các tín đồ của trải nghiệm điện ảnh màn hình lớn cực đại IMAX. Khi mua vé phòng chiếu IMAX của các bộ phim bom tấn tại hệ thống rạp đối tác CineMax, khách hàng sẽ nhận được 1 poster IMAX nghệ thuật phiên bản giới hạn.\n\nChương trình kéo dài cho đến khi hết quà tặng.',
    thumbnail: 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?q=80&w=600&auto=format&fit=crop',
    isPublished: true,
    category: 'promotion',
    likedUsers: [],
    likesCount: 77,
  },
  {
    title: 'Thông báo bảo trì tính năng thanh toán đêm nay',
    slug: 'thong-bao-bao-tri-tinh-nang-thanh-toan-dem-nay',
    shortDescription: 'Hệ thống thanh toán sẽ được bảo trì ngắn trong đêm để nâng cấp hiệu năng và độ ổn định.',
    content: 'Trong khoảng thời gian bảo trì, một số giao dịch thanh toán có thể tạm thời chậm hơn bình thường.\n\nCác tính năng xem lịch chiếu, chọn ghế và đăng nhập vẫn hoạt động. Chúng tôi sẽ mở lại đầy đủ ngay sau khi hoàn tất.',
    thumbnail: '',
    isPublished: false,
    category: 'cinema',
    likedUsers: [],
    likesCount: 0,
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
      newsData.map((item, index) => {
        const likedUsers = item.likedUsers && item.likedUsers.length > 0
          ? item.likedUsers
          : generateFakeLikedUsers(item.likesCount || 0);
        return {
          ...item,
          likedUsers,
          createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        };
      }),
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
