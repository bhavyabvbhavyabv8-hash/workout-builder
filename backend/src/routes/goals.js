import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireDatabase from '../middleware/requireDatabase.js';
import { validateBody } from '../middleware/validateRequest.js';
import PersonalGoal from '../models/PersonalGoal.js';
import WorkoutSession from '../models/WorkoutSession.js';
import { personalGoalSchema } from '../validation/schemas.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(requireDatabase, authenticate);

function getWeekStart() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

async function getGoalProgress(userId, goal) {
  const [completedThisWeek, completedTotal] = await Promise.all([
    WorkoutSession.countDocuments({
      user: userId,
      completedAt: { $ne: null },
      startedAt: { $gte: getWeekStart() }
    }),
    WorkoutSession.countDocuments({ user: userId, completedAt: { $ne: null } })
  ]);
  return {
    completedThisWeek,
    completedTotal,
    weeklyPercent: goal ? Math.min(100, Math.round((completedThisWeek / goal.weeklyWorkoutTarget) * 100)) : 0,
    totalPercent: goal ? Math.min(100, Math.round((completedTotal / goal.totalWorkoutTarget) * 100)) : 0
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const goal = await PersonalGoal.findOne({ user: req.authUser._id }).lean();
    const progress = await getGoalProgress(req.authUser._id, goal);
    res.json({ data: { goal, progress } });
  })
);

router.post(
  '/',
  validateBody(personalGoalSchema),
  asyncHandler(async (req, res) => {
    const exists = await PersonalGoal.exists({ user: req.authUser._id });
    if (exists) {
      throw new AppError(409, 'goal_exists', 'A personal goal already exists. Update it instead.');
    }
    const goal = await PersonalGoal.create({ user: req.authUser._id, ...req.validatedBody });
    res.status(201).json({
      data: { goal, progress: await getGoalProgress(req.authUser._id, goal) }
    });
  })
);

router.patch(
  '/',
  validateBody(personalGoalSchema),
  asyncHandler(async (req, res) => {
    const goal = await PersonalGoal.findOneAndUpdate(
      { user: req.authUser._id },
      { $set: req.validatedBody },
      { new: true, runValidators: true }
    );
    if (!goal) {
      throw new AppError(404, 'goal_not_found', 'Create a personal goal before updating it.');
    }
    res.json({
      data: { goal, progress: await getGoalProgress(req.authUser._id, goal) }
    });
  })
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const result = await PersonalGoal.deleteOne({ user: req.authUser._id });
    if (!result.deletedCount) {
      throw new AppError(404, 'goal_not_found', 'Personal goal not found.');
    }
    res.json({ data: { deleted: true } });
  })
);

export default router;
