const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/movie_booking_db')
  .then(async () => {
    try {
      const db = mongoose.connection.db;
      
      const systems = await db.collection('cinemasystems').find({}).toArray();
      if (systems.length === 0) {
          console.log('No Cinema Systems found to migrate to.');
          process.exit(0);
      }
      const firstSystemId = systems[0]._id;
      
      const combos = await db.collection('combos').find({ cinema_system: { $exists: false } }).toArray();
      const combos2 = await db.collection('combos').find({ cinema_system: null }).toArray();
      const combos3 = await db.collection('combos').find({ cinema_system: undefined }).toArray();
      
      const count = combos.length + combos2.length + combos3.length;
      
      if (count > 0) {
        await db.collection('combos').updateMany(
            { $or: [{ cinema_system: { $exists: false } }, { cinema_system: null }, { cinema_system: undefined }] },
            { $set: { cinema_system: firstSystemId } }
        );
        console.log(`Successfully migrated ${count} legacy combos to Cinema System '${systems[0].name}'.`);
      } else {
        console.log('No legacy combos found that need migration. DB is clean!');
      }
    } catch(e) {
      console.error('Migration failed:', e);
    }
    process.exit(0);
  });
