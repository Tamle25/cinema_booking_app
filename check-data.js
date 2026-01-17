// Kiểm tra dữ liệu
print('=== HE THONG RAP ===');
db.cinemasystems.find({},{name:1,slug:1,color_code:1}).forEach(d => {
  print('- ' + d.name + ' (' + d.slug + ') - ' + (d.color_code || 'N/A'));
});

print('');
print('=== RAP PHIM (THEO HE THONG) ===');
db.cinemas.aggregate([
  {
    $lookup: {
      from: 'cinemasystems',
      localField: 'cinema_system',
      foreignField: '_id',
      as: 'system'
    }
  },
  {
    $project: {
      name: 1,
      city: 1,
      system_name: { $arrayElemAt: ['$system.name', 0] }
    }
  },
  { $sort: { system_name: 1, city: 1 } }
]).forEach(d => {
  print('- [' + (d.system_name || 'N/A') + '] ' + d.name + ' (' + (d.city || 'N/A') + ')');
});

print('');
print('=== PHONG CHIEU ===');
db.rooms.aggregate([
  {
    $lookup: {
      from: 'cinemas',
      localField: 'cinema',
      foreignField: '_id',
      as: 'cinema_info'
    }
  },
  {
    $project: {
      name: 1,
      type: 1,
      rows: 1,
      columns: 1,
      cinema_name: { $arrayElemAt: ['$cinema_info.name', 0] }
    }
  },
  { $sort: { cinema_name: 1 } }
]).forEach(d => {
  print('- [' + (d.cinema_name || 'KHONG RO') + '] ' + d.name + ' (' + d.type + ') - ' + d.rows + 'x' + d.columns + ' ghe');
});

print('');
print('=== SUAT CHIEU THEO NGAY ===');
db.showtimes.aggregate([
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$start_time' } },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]).forEach(d => {
  print('- ' + d._id + ': ' + d.count + ' suat chieu');
});

print('');
print('=== THONG KE ===');
print('He thong rap: ' + db.cinemasystems.countDocuments());
print('Rap phim: ' + db.cinemas.countDocuments());
print('Phong chieu: ' + db.rooms.countDocuments());
print('Suat chieu: ' + db.showtimes.countDocuments());
print('Phim: ' + db.movies.countDocuments());
print('User: ' + db.users.countDocuments());
print('Booking: ' + db.bookings.countDocuments());
