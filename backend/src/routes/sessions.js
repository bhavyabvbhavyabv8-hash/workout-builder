import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireDatabase from '../middleware/requireDatabase.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validateRequest.js';
import ExerciseSet from '../models/ExerciseSet.js';
import WorkoutSession from '../models/WorkoutSession.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';
import {
  exerciseSetSchema,
  historyQuerySchema,
  sessionIdParamsSchema,
  startSessionSchema
} from '../validation/schemas.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getOrCreateCustomExercise } from '../utils/exerciseInput.js';

const router = Router();

router.use(requireDatabase, authenticate);

function assertSessionOwner(session, userId) {
  if (!session) {
    throw new AppError(404, 'session_not_found', 'Workout session not found.');
  }
  if (!session.user.equals(userId)) {
    throw new AppError(403, 'forbidden', 'You are not allowed to access this workout session.');
  }
}

router.post(
  '/',
  validateBody(startSessionSchema),
  asyncHandler(async (req, res) => {
    const { templateId, name, notes } = req.validatedBody;
    let template = null;
    if (templateId) {
      template = await WorkoutTemplate.findById(templateId);
      if (!template) {
        throw new AppError(404, 'workout_not_found', 'Workout template not found.');
      }
      if (!template.user.equals(req.authUser._id)) {
        throw new AppError(403, 'forbidden', 'You are not allowed to use this workout.');
      }
    }

    const session = await WorkoutSession.create({
      user: req.authUser._id,
      template: template?._id || null,
      name: name || template.name,
      notes,
      plannedExercises: template
        ? template.exercises.map((exercise) => ({
            exercise: exercise.exercise,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: exercise.sets,
            repetitions: exercise.repetitions,
            weight: exercise.weight,
            durationSeconds: exercise.durationSeconds,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes
          }))
        : []
    });

    res.status(201).json({ data: { session } });
  })
);

router.get(
  '/',
  validateQuery(historyQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.validatedQuery;
    const filter = { user: req.authUser._id };
    const [sessions, total] = await Promise.all([
      WorkoutSession.find(filter)
        .sort({ startedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WorkoutSession.countDocuments(filter)
    ]);

    res.json({ data: { sessions, page, limit, total } });
  })
);

router.get(
  '/history',
  validateQuery(historyQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.validatedQuery;
    const filter = { user: req.authUser._id, completedAt: { $ne: null } };
    const [sessions, total] = await Promise.all([
      WorkoutSession.find(filter)
        .sort({ completedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WorkoutSession.countDocuments(filter)
    ]);

    const setSummaries = await ExerciseSet.aggregate([
      { $match: { session: { $in: sessions.map((session) => session._id) } } },
      {
        $group: {
          _id: '$session',
          exerciseNames: { $addToSet: '$exerciseName' }
        }
      }
    ]);
    const exerciseNamesBySession = new Map(
      setSummaries.map((summary) => [String(summary._id), summary.exerciseNames])
    );
    const history = sessions.map((session) => {
      const exerciseNames = new Set([
        ...session.plannedExercises.map((exercise) => exercise.name),
        ...(exerciseNamesBySession.get(String(session._id)) || [])
      ]);
      return {
        ...session,
        durationSeconds: Math.max(
          0,
          Math.floor((session.completedAt.getTime() - session.startedAt.getTime()) / 1000)
        ),
        exerciseNames: [...exerciseNames]
      };
    });

    res.json({ data: { sessions: history, page, limit, total } });
  })
);

router.get(
  '/:sessionId',
  validateParams(sessionIdParamsSchema),
  asyncHandler(async (req, res) => {
    const session = await WorkoutSession.findById(req.validatedParams.sessionId);
    assertSessionOwner(session, req.authUser._id);
    const sets = await ExerciseSet.find({ session: session._id })
      .sort({ completedAt: 1, setNumber: 1 })
      .lean();
    res.json({ data: { session, sets } });
  })
);

router.post(
  '/:sessionId/sets',
  validateParams(sessionIdParamsSchema),
  validateBody(exerciseSetSchema),
  asyncHandler(async (req, res) => {
    const session = await WorkoutSession.findById(req.validatedParams.sessionId);
    assertSessionOwner(session, req.authUser._id);
    if (session.completedAt) {
      throw new AppError(409, 'session_completed', 'Cannot add sets to a completed workout.');
    }

    const input = req.validatedBody;
    const plannedExercise = session.plannedExercises.find(
      (exercise) =>
        exercise.name.toLocaleLowerCase('en-US') === input.exerciseName.toLocaleLowerCase('en-US')
    );
    if (session.plannedExercises.length && !plannedExercise) {
      throw new AppError(400, 'exercise_not_in_workout', 'Exercise is not in this workout plan.');
    }

    const muscleGroup = plannedExercise?.muscleGroup || input.muscleGroup;
    if (!muscleGroup) {
      throw new AppError(
        400,
        'muscle_group_required',
        'Muscle group is required when logging an exercise outside a workout plan.'
      );
    }

    const exercise =
      plannedExercise?.exercise ||
      (await getOrCreateCustomExercise(
        req.authUser._id,
        plannedExercise?.name || input.exerciseName,
        muscleGroup
      ))._id;
    const set = await ExerciseSet.create({
      session: session._id,
      exercise,
      exerciseName: plannedExercise?.name || input.exerciseName,
      setNumber: input.setNumber,
      reps: input.reps,
      weight: input.weight,
      rir: input.rir,
      durationSeconds: input.durationSeconds,
      notes: input.notes
    });

    res.status(201).json({ data: { set } });
  })
);

router.patch(
  '/:sessionId/complete',
  validateParams(sessionIdParamsSchema),
  asyncHandler(async (req, res) => {
    const session = await WorkoutSession.findById(req.validatedParams.sessionId);
    assertSessionOwner(session, req.authUser._id);
    if (session.completedAt) {
      throw new AppError(409, 'session_completed', 'Workout session is already completed.');
    }
    if (!(await ExerciseSet.exists({ session: session._id }))) {
      throw new AppError(400, 'empty_session', 'Record at least one completed set before finishing.');
    }

    const completed = await WorkoutSession.findOneAndUpdate(
      { _id: session._id, user: req.authUser._id, completedAt: null },
      { $set: { completedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!completed) {
      throw new AppError(409, 'session_completed', 'Workout session is already completed.');
    }

    res.json({ data: { session: completed } });
  })
);

export default router;
