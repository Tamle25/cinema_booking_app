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

const combosData = [
  {
    name: 'Combo Solo',
    description: '1 Bắp rang bơ (vừa) + 1 Nước ngọt (vừa)',
    price: 59000,
    image_url: '',
    category: 'combo',
    is_active: true,
    is_popular: false,
  },
  {
    name: 'Combo Couple',
    description: '1 Bắp rang bơ (lớn) + 2 Nước ngọt (lớn)',
    price: 89000,
    image_url: '',
    category: 'combo',
    is_active: true,
    is_popular: true,
  },
  {
    name: 'Combo Family',
    description: '2 Bắp rang bơ (lớn) + 4 Nước ngọt (lớn)',
    price: 149000,
    image_url: '',
    category: 'combo',
    is_active: true,
    is_popular: true,
  },
  {
    name: 'Bắp Rang Bơ Lớn',
    description: 'Bắp rang bơ thơm ngon size lớn',
    price: 45000,
    image_url: '',
    category: 'snack',
    is_active: true,
    is_popular: false,
  },
  {
    name: 'Bắp Rang Phô Mai',
    description: 'Bắp rang vị phô mai đặc biệt size lớn',
    price: 55000,
    image_url: '',
    category: 'snack',
    is_active: true,
    is_popular: false,
  },
  {
    name: 'Coca-Cola Lớn',
    description: 'Coca-Cola size lớn 500ml',
    price: 29000,
    image_url: '',
    category: 'drink',
    is_active: true,
    is_popular: false,
  },
  {
    name: 'Trà Đào',
    description: 'Trà đào cam sả thơm mát 500ml',
    price: 35000,
    image_url: '',
    category: 'drink',
    is_active: true,
    is_popular: false,
  },
  {
    name: 'Combo Party',
    description: '3 Bắp rang bơ (lớn) + 6 Nước ngọt + 1 Khoai tây chiên',
    price: 249000,
    image_url: '',
    category: 'combo',
    is_active: true,
    is_popular: false,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);

    await Combo.deleteMany({});
    await Combo.insertMany(combosData);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Lỗi seed combos:', error);
    process.exit(1);
  }
}

seed();
