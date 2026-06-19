import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cinema';

const ComboSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    image_url: String,
    category: String,
    is_active: Boolean,
    is_popular: Boolean,
  },
  { timestamps: true },
);

const Combo = mongoose.model('Combo', ComboSchema);

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);

    await Combo.deleteMany({});

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Lỗi seed combos:', error);
    process.exit(1);
  }
}

seed();
