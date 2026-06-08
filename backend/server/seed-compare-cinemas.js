/**
 * Script cập nhật tọa độ cho các rạp hiện có trong DB
 * và tạo thêm dữ liệu mẫu nếu cần để test chức năng So sánh Rạp
 * 
 * Chạy: node seed-compare-cinemas.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

// Dữ liệu tọa độ mẫu cho các rạp tại Hà Nội
const CINEMA_COORDINATES = [
  // CGV
  { namePattern: /cgv.*vincom.*bà triệu/i, latitude: 21.0112, longitude: 105.8492 },
  { namePattern: /cgv.*royal/i, latitude: 21.0245, longitude: 105.8518 },
  { namePattern: /cgv.*aeon.*long biên/i, latitude: 21.0370, longitude: 105.9100 },
  { namePattern: /cgv.*aeon.*hà đông/i, latitude: 20.9812, longitude: 105.7570 },
  { namePattern: /cgv/i, latitude: 21.0285, longitude: 105.8542 }, // fallback CGV

  // Lotte
  { namePattern: /lotte.*ba đình/i, latitude: 21.0320, longitude: 105.8120 },
  { namePattern: /lotte.*landmark/i, latitude: 21.0036, longitude: 105.7919 },
  { namePattern: /lotte/i, latitude: 21.0036, longitude: 105.7919 }, // fallback Lotte

  // Beta
  { namePattern: /beta.*mỹ đình/i, latitude: 21.0310, longitude: 105.7682 },
  { namePattern: /beta.*thanh xuân/i, latitude: 21.0010, longitude: 105.8050 },
  { namePattern: /beta.*giải phóng/i, latitude: 20.9970, longitude: 105.8430 },
  { namePattern: /beta/i, latitude: 21.0310, longitude: 105.7682 }, // fallback Beta

  // Galaxy
  { namePattern: /galaxy.*nguyễn du/i, latitude: 21.0175, longitude: 105.8523 },
  { namePattern: /galaxy/i, latitude: 21.0175, longitude: 105.8523 }, // fallback Galaxy

  // BHD
  { namePattern: /bhd.*phạm ngọc thạch/i, latitude: 21.0038, longitude: 105.8378 },
  { namePattern: /bhd/i, latitude: 21.0038, longitude: 105.8378 }, // fallback BHD

  // Mega GS
  { namePattern: /mega/i, latitude: 21.0063, longitude: 105.8203 },
  
  // Cinestar
  { namePattern: /cinestar/i, latitude: 21.0152, longitude: 105.8492 },
];

async function main() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI chưa được cấu hình trong .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB');

    const db = mongoose.connection.db;
    const cinemasCollection = db.collection('cinemas');

    // 1. Lấy tất cả rạp hiện có
    const allCinemas = await cinemasCollection.find({}).toArray();
    console.log(`📋 Tìm thấy ${allCinemas.length} rạp trong DB`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const cinema of allCinemas) {
      // Bỏ qua rạp đã có tọa độ
      if (cinema.latitude != null && cinema.longitude != null) {
        skippedCount++;
        continue;
      }

      // Tìm tọa độ phù hợp dựa trên tên rạp
      const match = CINEMA_COORDINATES.find(c => c.namePattern.test(cinema.name));
      
      if (match) {
        // Thêm một chút random offset để các rạp không chồng nhau trên bản đồ
        const latOffset = (Math.random() - 0.5) * 0.005;
        const lngOffset = (Math.random() - 0.5) * 0.005;

        await cinemasCollection.updateOne(
          { _id: cinema._id },
          {
            $set: {
              latitude: Math.round((match.latitude + latOffset) * 10000) / 10000,
              longitude: Math.round((match.longitude + lngOffset) * 10000) / 10000,
              isActive: true,
            },
          },
        );
        updatedCount++;
        console.log(`  ✅ Đã cập nhật: ${cinema.name} → (${match.latitude}, ${match.longitude})`);
      } else {
        // Nếu không match được pattern nào, gán tọa độ mặc định Hà Nội + random offset lớn hơn
        const latOffset = (Math.random() - 0.5) * 0.03;
        const lngOffset = (Math.random() - 0.5) * 0.03;
        
        await cinemasCollection.updateOne(
          { _id: cinema._id },
          {
            $set: {
              latitude: Math.round((21.0285 + latOffset) * 10000) / 10000,
              longitude: Math.round((105.8542 + lngOffset) * 10000) / 10000,
              isActive: true,
            },
          },
        );
        updatedCount++;
        console.log(`  ⚠️ Không match pattern, gán tọa độ mặc định: ${cinema.name}`);
      }
    }

    console.log(`\n📊 Kết quả:`);
    console.log(`  - Đã cập nhật: ${updatedCount} rạp`);
    console.log(`  - Bỏ qua (đã có tọa độ): ${skippedCount} rạp`);

    // 2. Đảm bảo tất cả rạp đều có isActive
    const result = await cinemasCollection.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    if (result.modifiedCount > 0) {
      console.log(`  - Đã thêm isActive cho ${result.modifiedCount} rạp`);
    }

    console.log('\n✅ Hoàn thành cập nhật tọa độ rạp!');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
  }
}

main();
