import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (!uri) {
    console.warn('[database] MONGODB_URI is not set; starting without a database connection.');
    return false;
  }

  await mongoose.connect(uri);
  console.info('[database] Connected to MongoDB.');
  return true;
}
