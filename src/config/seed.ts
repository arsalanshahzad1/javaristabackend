import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import BrewMethod from '../models/BrewMethod';
import Recipe from '../models/Recipe';

dotenv.config();

const seed = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('MongoDB connected');

  // Clear only BrewMethod and Recipe collections
  await BrewMethod.deleteMany({});
  await Recipe.deleteMany({});
  console.log('Cleared BrewMethod and Recipe collections');

  // Create admin user only if none exists
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      name: 'JavaRista Admin',
      email: 'admin@javarista.com',
      password: 'Admin@123',
      role: 'admin',
      isVerified: true,
    });
    console.log('Admin user created:', admin.email);
  } else {
    console.log('Admin user already exists:', admin.email);
  }

  // Insert brew methods
  const brewMethodDocs = await BrewMethod.insertMany([
    {
      name: 'V60 Pour Over',
      slug: 'v60-pour-over',
      difficulty: 'easy',
      ratio: '16:1',
      brewTime: 210,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'AeroPress',
      slug: 'aeropress',
      difficulty: 'easy',
      ratio: '15:1',
      brewTime: 120,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Chemex',
      slug: 'chemex',
      difficulty: 'medium',
      ratio: '16:1',
      brewTime: 300,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'French Press',
      slug: 'french-press',
      difficulty: 'easy',
      ratio: '15:1',
      brewTime: 240,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Moka Pot',
      slug: 'moka-pot',
      difficulty: 'easy',
      ratio: '8:1',
      brewTime: 300,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Espresso',
      slug: 'espresso',
      difficulty: 'hard',
      ratio: '2:1',
      brewTime: 30,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Kalita Wave',
      slug: 'kalita-wave',
      difficulty: 'medium',
      ratio: '15:1',
      brewTime: 225,
      isActive: true,
      createdBy: admin._id,
    },
  ]);
  console.log(`Inserted ${brewMethodDocs.length} brew methods`);

  const v60 = brewMethodDocs.find((m) => m.slug === 'v60-pour-over')!;
  const aeropress = brewMethodDocs.find((m) => m.slug === 'aeropress')!;
  const chemex = brewMethodDocs.find((m) => m.slug === 'chemex')!;

  // Insert recipes
  const recipes = await Recipe.insertMany([
    {
      name: 'Ethiopian Yirgacheffe V60',
      brewMethod: v60._id,
      author: admin._id,
      coffeeDose: 18,
      waterAmount: 300,
      ratio: '16:1',
      grindSize: 'Medium-fine',
      brewTime: 210,
      difficulty: 'easy',
      isPublished: true,
      isFeatured: true,
      steps: [
        { stepNumber: 1, title: 'Rinse & Preheat', description: 'Rinse the V60 filter with hot water to remove paper taste and preheat the vessel. Discard rinse water.', timerSeconds: 30, waterAmount: 0 },
        { stepNumber: 2, title: 'Bloom', description: 'Pour 40ml of water at 93°C in a spiral motion to saturate all grounds. Wait for bloom.', timerSeconds: 45, waterAmount: 40 },
        { stepNumber: 3, title: 'First Pour', description: 'Pour steadily to 150ml in a circular motion, keeping the water level consistent.', timerSeconds: 60, waterAmount: 110 },
        { stepNumber: 4, title: 'Final Pour', description: 'Continue pouring to 300ml total. Allow to drain completely.', timerSeconds: 75, waterAmount: 150 },
      ],
      tags: ['ethiopian', 'fruity', 'floral', 'v60'],
    },
    {
      name: 'Classic AeroPress',
      brewMethod: aeropress._id,
      author: admin._id,
      coffeeDose: 16,
      waterAmount: 240,
      ratio: '15:1',
      grindSize: 'Medium',
      brewTime: 120,
      difficulty: 'easy',
      isPublished: true,
      isFeatured: true,
      steps: [
        { stepNumber: 1, title: 'Setup & Bloom', description: 'Insert filter, rinse it, add 16g medium ground coffee. Pour 40ml water at 85°C and stir gently.', timerSeconds: 30, waterAmount: 40 },
        { stepNumber: 2, title: 'Fill & Steep', description: 'Add remaining 200ml water, stir once. Place plunger just above the water surface to create seal.', timerSeconds: 60, waterAmount: 200 },
        { stepNumber: 3, title: 'Press', description: 'Apply steady downward pressure over 20–30 seconds until you hear a hiss. Stop pressing at the hiss.', timerSeconds: 30, waterAmount: 0 },
      ],
      tags: ['classic', 'smooth', 'aeropress', 'beginner'],
    },
    {
      name: 'Chemex Morning Blend',
      brewMethod: chemex._id,
      author: admin._id,
      coffeeDose: 30,
      waterAmount: 480,
      ratio: '16:1',
      grindSize: 'Medium-coarse',
      brewTime: 300,
      difficulty: 'medium',
      isPublished: true,
      isFeatured: true,
      steps: [
        { stepNumber: 1, title: 'Rinse Filter', description: 'Fold the Chemex filter so three layers face the spout. Rinse thoroughly with hot water. Pour out rinse water.', timerSeconds: 30, waterAmount: 0 },
        { stepNumber: 2, title: 'Bloom', description: 'Add 30g medium-coarse coffee, pour 60ml water at 93°C in a circular motion. Wait for the bloom to subside.', timerSeconds: 45, waterAmount: 60 },
        { stepNumber: 3, title: 'Second Pour', description: 'Slowly pour to 250ml total, maintaining a steady stream. Keep the water level below the top of the filter.', timerSeconds: 90, waterAmount: 190 },
        { stepNumber: 4, title: 'Final Pour', description: 'Pour the remaining water to 480ml total in slow pulses, allowing each pulse to drain slightly.', timerSeconds: 135, waterAmount: 230 },
      ],
      tags: ['clean', 'bright', 'chemex', 'morning'],
    },
  ]);
  console.log(`Inserted ${recipes.length} recipes`);

  console.log('\nSeed complete:');
  console.log(`  Brew methods: ${brewMethodDocs.length}`);
  console.log(`  Recipes:      ${recipes.length}`);
  console.log(`  Admin:        ${admin.email}`);

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
