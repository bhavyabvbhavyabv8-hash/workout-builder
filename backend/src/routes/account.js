import mongoose from 'mongoose';
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireDatabase from '../middleware/requireDatabase.js';
import { validateBody } from '../middleware/validateRequest.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import Exercise from '../models/Exercise.js';
import ExerciseSet from '../models/ExerciseSet.js';
import ProgressRecord from '../models/ProgressRecord.js';
import RevokedToken from '../models/RevokedToken.js';
import User from '../models/User.js';
import WorkoutSession from '../models/WorkoutSession.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';
import {
  changePasswordSchema,
  deleteAccountSchema,
  profileUpdateSchema
} from '../validation/schemas.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import serializeUser from '../utils/serializeUser.js';

const router = Router();

router.use(requireDatabase, authenticate);

router.get('/', (req, res) => {
  res.json({ data: { user: serializeUser(req.authUser) } });
});

router.patch(
  '/',
  validateBody(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const updates = {};
    if (req.validatedBody.name !== undefined) {
      updates.displayName = req.validatedBody.name;
    }
    if (req.validatedBody.email !== undefined) {
      updates.email = req.validatedBody.email;
    }

    const user = await User.findByIdAndUpdate(req.authUser._id, updates, {
      new: true,
      runValidators: true
    });
    if (!user) {
      throw new AppError(404, 'user_not_found', 'Account not found.');
    }

    res.json({ data: { user: serializeUser(user) } });
  })
);

router.patch(
  '/password',
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.authUser._id).select('+passwordHash +tokenVersion');
    if (!user || !(await comparePassword(req.validatedBody.currentPassword, user.passwordHash))) {
      throw new AppError(401, 'invalid_credentials', 'Current password is incorrect.');
    }

    user.passwordHash = await hashPassword(req.validatedBody.newPassword);
    user.tokenVersion += 1;
    await user.save();

    res.json({ data: { message: 'Password changed. Log in again with your new password.' } });
  })
);

router.delete(
  '/',
  validateBody(deleteAccountSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.authUser._id).select('+passwordHash');
    if (!user || !(await comparePassword(req.validatedBody.password, user.passwordHash))) {
      throw new AppError(401, 'invalid_credentials', 'Password is incorrect.');
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const workoutSessions = await WorkoutSession.find({ user: user._id })
          .select('_id')
          .session(session);
        const sessionIds = workoutSessions.map((workoutSession) => workoutSession._id);

        await ExerciseSet.deleteMany({ session: { $in: sessionIds } }, { session });
        await WorkoutSession.deleteMany({ user: user._id }, { session });
        await WorkoutTemplate.deleteMany({ user: user._id }, { session });
        await ProgressRecord.deleteMany({ user: user._id }, { session });
        await Exercise.deleteMany({ createdBy: user._id, isCustom: true }, { session });
        await RevokedToken.deleteMany({ user: user._id }, { session });
        await User.deleteOne({ _id: user._id }, { session });
      });
    } finally {
      await session.endSession();
    }

    res.json({ data: { message: 'Account and associated workout data deleted.' } });
  })
);

export default router;
