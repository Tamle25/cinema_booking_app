/**
 * Script migrate dữ liệu thể loại phim (genre string → genres ObjectId[])
 * 
 * Cách chạy:
 *   npx ts-node scripts/migrate-genres.ts
 * 
 * Yêu cầu: File .env phải có MONGO_URI
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI không được cấu hình trong file .env');
  process.exit(1);
}

// ====== Bảng chuẩn hóa tên thể loại tiếng Việt ======
// Thêm mapping nếu phát hiện thêm biến thể trong DB
const GENRE_NORMALIZE_MAP: Record<string, string> = {
  // Hành động
  'hanh dong': 'Hành động',
  'hành động': 'Hành động',
  'action': 'Hành động',
  // Tình cảm
  'tinh cam': 'Tình cảm',
  'tình cảm': 'Tình cảm',
  'romance': 'Tình cảm',
  // Kinh dị
  'kinh di': 'Kinh dị',
  'kinh dị': 'Kinh dị',
  'horror': 'Kinh dị',
  // Hài
  'hai': 'Hài',
  'hài': 'Hài',
  'hai huoc': 'Hài',
  'hài hước': 'Hài',
  'comedy': 'Hài',
  // Hoạt hình
  'hoat hinh': 'Hoạt hình',
  'hoạt hình': 'Hoạt hình',
  'animation': 'Hoạt hình',
  // Viễn tưởng
  'vien tuong': 'Viễn tưởng',
  'viễn tưởng': 'Viễn tưởng',
  'sci-fi': 'Viễn tưởng',
  'science fiction': 'Viễn tưởng',
  // Phiêu lưu
  'phieu luu': 'Phiêu lưu',
  'phiêu lưu': 'Phiêu lưu',
  'adventure': 'Phiêu lưu',
  // Tâm lý
  'tam ly': 'Tâm lý',
  'tâm lý': 'Tâm lý',
  'drama': 'Tâm lý',
  // Chiến tranh
  'chien tranh': 'Chiến tranh',
  'chiến tranh': 'Chiến tranh',
  'war': 'Chiến tranh',
  // Tài liệu
  'tai lieu': 'Tài liệu',
  'tài liệu': 'Tài liệu',
  'documentary': 'Tài liệu',
  // Cổ trang
  'co trang': 'Cổ trang',
  'cổ trang': 'Cổ trang',
  // Gia đình
  'gia dinh': 'Gia đình',
  'gia đình': 'Gia đình',
  'family': 'Gia đình',
  // Hình sự
  'hinh su': 'Hình sự',
  'hình sự': 'Hình sự',
  'crime': 'Hình sự',
  // Trinh thám
  'trinh tham': 'Trinh thám',
  'trinh thám': 'Trinh thám',
  'mystery': 'Trinh thám',
  // Giả tưởng
  'gia tuong': 'Giả tưởng',
  'giả tưởng': 'Giả tưởng',
  'fantasy': 'Giả tưởng',
  // Âm nhạc
  'am nhac': 'Âm nhạc',
  'âm nhạc': 'Âm nhạc',
  'music': 'Âm nhạc',
  'musical': 'Âm nhạc',
  // Thể thao
  'the thao': 'Thể thao',
  'thể thao': 'Thể thao',
  'sport': 'Thể thao',
  'sports': 'Thể thao',
  // Lịch sử
  'lich su': 'Lịch sử',
  'lịch sử': 'Lịch sử',
  'history': 'Lịch sử',
  // Võ thuật
  'vo thuat': 'Võ thuật',
  'võ thuật': 'Võ thuật',
  'martial arts': 'Võ thuật',
  // Thần thoại
  'than thoai': 'Thần thoại',
  'thần thoại': 'Thần thoại',
  'mythology': 'Thần thoại',
  // Khoa học
  'khoa hoc': 'Khoa học',
  'khoa học': 'Khoa học',
};

// Helper: Bỏ dấu tiếng Việt
function removeVietnameseTones(str: string): string {
  const map: Record<string, string> = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
  };
  return str
    .toLowerCase()
    .split('')
    .map(char => map[char] || char)
    .join('');
}

// Helper: Tạo slug
function generateSlug(name: string): string {
  return removeVietnameseTones(name)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Helper: Chuẩn hóa tên thể loại
function normalizeGenreName(raw: string): string {
  const cleaned = raw.trim().toLowerCase();
  
  // Kiểm tra bảng mapping
  if (GENRE_NORMALIZE_MAP[cleaned]) {
    return GENRE_NORMALIZE_MAP[cleaned];
  }

  // Thử bỏ dấu rồi tra lại
  const noTones = removeVietnameseTones(cleaned);
  if (GENRE_NORMALIZE_MAP[noTones]) {
    return GENRE_NORMALIZE_MAP[noTones];
  }

  // Không tìm thấy → Capitalize chữ cái đầu
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase();
}

async function migrate() {
  console.log('🚀 Bắt đầu migrate thể loại phim...');
  console.log(`📦 Kết nối MongoDB: ${MONGO_URI!.replace(/\/\/.*@/, '//***@')}`);

  await mongoose.connect(MONGO_URI!);
  console.log('✅ Kết nối MongoDB thành công!\n');

  const db = mongoose.connection.db!;
  const moviesCollection = db.collection('movies');
  const genresCollection = db.collection('genres');

  // Step 1: Đọc tất cả thể loại hiện có
  console.log('📖 Step 1: Đọc tất cả thể loại từ movies...');
  const movies = await moviesCollection.find({ genre: { $exists: true, $nin: [null, ''] } }).toArray();
  console.log(`   → Tìm thấy ${movies.length} phim có field "genre"`);

  if (movies.length === 0) {
    console.log('ℹ️  Không có phim nào có genre cũ. Có thể đã migrate rồi.');
    await mongoose.disconnect();
    return;
  }

  // Step 2: Thu thập và chuẩn hóa tất cả tên thể loại
  console.log('\n📋 Step 2: Thu thập và chuẩn hóa thể loại...');
  const rawGenres = new Set<string>();
  const normalizedMap = new Map<string, string>(); // raw → normalized

  for (const movie of movies) {
    const genre = movie.genre as string;
    if (!genre) continue;

    // Có thể lưu dạng "Hành động, Tình cảm" → tách ra
    const parts = genre.split(/[,;，、]/).map((s: string) => s.trim()).filter(Boolean);
    for (const part of parts) {
      rawGenres.add(part);
      const normalized = normalizeGenreName(part);
      normalizedMap.set(part, normalized);
    }
  }

  console.log(`   → Thu thập được ${rawGenres.size} giá trị genre gốc:`);
  for (const [raw, norm] of normalizedMap) {
    console.log(`      "${raw}" → "${norm}"`);
  }

  // Step 3: Tạo danh sách genres unique
  const uniqueGenres = new Set<string>(normalizedMap.values());
  console.log(`\n🏷️  Step 3: Tạo ${uniqueGenres.size} thể loại duy nhất:`);
  for (const g of uniqueGenres) {
    console.log(`   → ${g} (slug: ${generateSlug(g)})`);
  }

  // Step 4: Tạo Genre documents trong DB
  console.log('\n💾 Step 4: Tạo Genre documents...');
  const genreIdMap = new Map<string, mongoose.Types.ObjectId>(); // normalized name → ObjectId

  for (const name of uniqueGenres) {
    const slug = generateSlug(name);

    // Kiểm tra đã tồn tại chưa
    const existing = await genresCollection.findOne({ slug });
    if (existing) {
      console.log(`   ⏭️  "${name}" (slug: ${slug}) đã tồn tại → sử dụng ID: ${existing._id}`);
      genreIdMap.set(name, existing._id as mongoose.Types.ObjectId);
    } else {
      const result = await genresCollection.insertOne({
        name,
        slug,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`   ✅ Tạo "${name}" (slug: ${slug}) → ID: ${result.insertedId}`);
      genreIdMap.set(name, result.insertedId as mongoose.Types.ObjectId);
    }
  }

  // Step 5: Cập nhật movies
  console.log('\n🔄 Step 5: Cập nhật movies (genre string → genres ObjectId[])...');
  let successCount = 0;
  let errorCount = 0;

  for (const movie of movies) {
    const genre = movie.genre as string;
    if (!genre) continue;

    try {
      const parts = genre.split(/[,;，、]/).map((s: string) => s.trim()).filter(Boolean);
      const genreIds: mongoose.Types.ObjectId[] = [];

      for (const part of parts) {
        const normalized = normalizeGenreName(part);
        const id = genreIdMap.get(normalized);
        if (id) {
          genreIds.push(id);
        } else {
          console.log(`   ⚠️  Phim "${movie.title}": Không tìm thấy genre ID cho "${normalized}"`);
        }
      }

      // Cập nhật movie: thêm genres[], giữ genre cũ (chưa xóa)
      await moviesCollection.updateOne(
        { _id: movie._id },
        { $set: { genres: genreIds } },
      );

      console.log(`   ✅ "${movie.title}": "${genre}" → [${genreIds.join(', ')}] (${genreIds.length} thể loại)`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Lỗi phim "${movie.title}":`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Kết quả cập nhật: ${successCount} thành công, ${errorCount} lỗi`);

  // Step 6: Xóa field genre cũ (chỉ khi không có lỗi)
  if (errorCount === 0) {
    console.log('\n🧹 Step 6: Xóa field "genre" cũ khỏi tất cả movies...');
    const result = await moviesCollection.updateMany(
      {},
      { $unset: { genre: '' } },
    );
    console.log(`   ✅ Đã xóa field "genre" từ ${result.modifiedCount} documents`);
  } else {
    console.log('\n⚠️  Step 6: BỎ QUA việc xóa field "genre" cũ do có lỗi. Hãy sửa lỗi và chạy lại.');
  }

  // Tổng kết
  console.log('\n' + '='.repeat(60));
  console.log('🎉 MIGRATE HOÀN TẤT!');
  console.log(`   📊 Tổng phim xử lý: ${movies.length}`);
  console.log(`   🏷️  Thể loại tạo mới: ${uniqueGenres.size}`);
  console.log(`   ✅ Thành công: ${successCount}`);
  console.log(`   ❌ Lỗi: ${errorCount}`);
  console.log('='.repeat(60));

  await mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối MongoDB.');
}

migrate().catch((error) => {
  console.error('❌ Lỗi migrate:', error);
  mongoose.disconnect();
  process.exit(1);
});
