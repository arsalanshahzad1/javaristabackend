import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BrewMethod from '../models/BrewMethod';

dotenv.config();

const migrate = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('MongoDB connected');

  const result = await BrewMethod.updateMany(
    { category: { $exists: false } },
    { $set: { category: 'coffee' } }
  );

  console.log(`Migration complete: ${result.modifiedCount} brew methods updated to category='coffee'`);

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
