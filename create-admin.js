// Script tạo tài khoản Admin
// Chạy: node create-admin.js

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb://127.0.0.1:27017/movie_booking_db';

async function createAdmin() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Đã kết nối MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Thông tin tài khoản admin
    const adminEmail = 'admin@cinema.vn';
    const adminPassword = 'admin123'; // Mật khẩu gốc
    
    // Kiểm tra admin đã tồn tại chưa
    const existingAdmin = await usersCollection.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  Tài khoản admin đã tồn tại!');
      console.log('📧 Email:', adminEmail);
      
      // Cập nhật role thành admin nếu chưa phải
      if (existingAdmin.role !== 'admin') {
        await usersCollection.updateOne(
          { email: adminEmail },
          { $set: { role: 'admin' } }
        );
        console.log('✅ Đã cập nhật role thành admin');
      }
    } else {
      // Hash mật khẩu
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
      
      // Tạo tài khoản admin mới
      const adminUser = {
        full_name: 'Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await usersCollection.insertOne(adminUser);
      console.log('✅ Tạo tài khoản admin thành công!');
    }
    
    console.log('\n========================================');
    console.log('🔐 THÔNG TIN ĐĂNG NHẬP ADMIN:');
    console.log('========================================');
    console.log('📧 Email:    admin@cinema.vn');
    console.log('🔑 Password: admin123');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Đã đóng kết nối MongoDB');
  }
}

createAdmin();
