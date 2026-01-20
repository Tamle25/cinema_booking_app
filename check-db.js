// Script sửa database
print("=== BẮT ĐẦU SỬA DATABASE ===\n");

// 1. Cập nhật 4 booking cũ thiếu user/status
const adminUser = db.users.findOne({ role: 'admin' });
print("Admin user: " + adminUser._id);

const updateBookings = db.bookings.updateMany(
  { user: { $exists: false } },
  { 
    $set: { 
      user: adminUser._id,
      status: 'confirmed',
      payment_method: 'momo',
      payment_note: 'Booking cũ - đã migrate'
    }
  }
);
print("\n1. Cập nhật bookings thiếu user:");
print("   - Matched: " + updateBookings.matchedCount);
print("   - Modified: " + updateBookings.modifiedCount);

// 2. Xóa field rooms cũ khỏi cinema
const updateCinema = db.cinemas.updateMany(
  { rooms: { $exists: true } },
  { $unset: { rooms: "" } }
);
print("\n2. Xóa field 'rooms' cũ từ cinemas:");
print("   - Matched: " + updateCinema.matchedCount);
print("   - Modified: " + updateCinema.modifiedCount);

// 3. Verify
print("\n=== KIỂM TRA SAU KHI SỬA ===");
print("Bookings không có user: " + db.bookings.countDocuments({ user: { $exists: false } }));
print("Bookings không có status: " + db.bookings.countDocuments({ status: { $exists: false } }));
print("Cinemas còn field rooms: " + db.cinemas.countDocuments({ rooms: { $exists: true } }));

print("\n=== HOÀN TẤT ===");
