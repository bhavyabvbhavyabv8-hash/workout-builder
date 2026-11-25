import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Exercise from '../models/Exercise.js';
import ExerciseSet from '../models/ExerciseSet.js';
import ProgressRecord from '../models/ProgressRecord.js';
import RevokedToken from '../models/RevokedToken.js';
import User from '../models/User.js';
import WorkoutSession from '../models/WorkoutSession.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';

try {
  const connected = await connectDatabase(process.env.MONGODB_URI);
  if (!connected) {
    throw new Error('Set MONGODB_URI before creating database indexes.');
  }

  await Promise.all(
    [
      User,
      Exercise,
      WorkoutTemplate,
      WorkoutSession,
      ExerciseSet,
      ProgressRecord,
      RevokedToken
    ].map((model) => model.createIndexes())
  );
  console.info('[database] Required indexes are ready.');
} catch (error) {
  console.error(`[database] Could not create indexes (${error.name || 'Error'}).`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
