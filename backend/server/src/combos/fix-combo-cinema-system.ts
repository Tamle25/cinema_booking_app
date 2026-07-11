/**
 * Script sửa dữ liệu combo: chuyển cinema_system từ string sang ObjectId.
 * Chạy: node dist/combos/fix-combo-cinema-system.js
 * Hoặc: npx ts-node src/combos/fix-combo-cinema-system.ts
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/movie_booking_db';

async function fixComboCinemaSystem() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Đã kết nối MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      console.error('Không thể truy cập database');
      process.exit(1);
    }
    const combosCollection = db.collection('combos');

    const combos = await combosCollection.find({}).toArray();
    let fixedCount = 0;

    for (const combo of combos) {
      if (typeof combo.cinema_system === 'string') {
        try {
          const objectId = new mongoose.Types.ObjectId(combo.cinema_system);
          await combosCollection.updateOne(
            { _id: combo._id },
            { $set: { cinema_system: objectId } },
          );
          fixedCount++;
          console.log(
            `✅ Fixed combo "${combo.name}": ${combo.cinema_system} -> ObjectId`,
          );
        } catch (e) {
          console.error(`❌ Lỗi convert combo "${combo.name}":`, e);
        }
      } else {
        console.log(`⏭️  Combo "${combo.name}" đã đúng kiểu ObjectId`);
      }
    }

    console.log(`\nHoàn tất! Đã sửa ${fixedCount}/${combos.length} combo.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Lỗi:', error);
    process.exit(1);
  }
}

fixComboCinemaSystem();
