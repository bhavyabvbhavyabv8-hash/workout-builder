import mongoose from 'mongoose';
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireDatabase from '../middleware/requireDatabase.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';
import ExerciseSet from '../models/ExerciseSet.js';
import WorkoutSession from '../models/WorkoutSession.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';
import {
  exerciseParamsSchema,
  idParamsSchema,
  workoutCreateSchema,
  workoutExerciseSchema,
  workoutExerciseUpdateSchema,
  workoutIdParamsSchema,
  workoutUpdateSchema
} from '../validation/schemas.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { resolveExerciseReference, toWorkoutExercise } from '../utils/exerciseInput.js';

const router = Router();

router.use(requireDatabase, authenticate);

function assertWorkoutOwner(workout, userId) {
  if (!workout) {
    throw new AppError(404, 'workout_not_found', 'Workout not found.');
  }
  if (!workout.user.equals(userId)) {
    throw new AppError(403, 'forbidden', 'You are not allowed to access this workout.');
  }
}

async function buildExerciseList(exercises, userId) {
  return Promise.all(
    exercises.map(async (exercise, order) => {
      const exerciseReference = await resolveExerciseReference(exercise.exerciseId, userId);
      return toWorkoutExercise(exercise, order, exerciseReference);
    })
  );
}

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const frequencyStart = new Date(weekStart);
    frequencyStart.setUTCDate(frequencyStart.getUTCDate() - 7 * 7);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const filter = { user: req.authUser._id, completedAt: { $ne: null } };
    const [completedWorkouts, workoutsThisWeek, workoutsThisMonth, weeklyCounts, volumeResult] =
      await Promise.all([
        WorkoutSession.countDocuments(filter),
        WorkoutSession.countDocuments({ ...filter, startedAt: { $gte: weekStart } }),
        WorkoutSession.countDocuments({ ...filter, startedAt: { $gte: monthStart } }),
        WorkoutSession.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(String(req.authUser._id)),
              completedAt: { $ne: null },
              startedAt: { $gte: frequencyStart }
            }
          },
          {
            $group: {
              _id: {
                $dateTrunc: {
                  date: '$startedAt',
                  unit: 'week',
                  startOfWeek: 'monday',
                  timezone: 'UTC'
                }
              },
              workouts: { $sum: 1 }
            }
          }
        ]),
        WorkoutSession.aggregate([
          { $match: filter },
          {
            $lookup: {
              from: ExerciseSet.collection.name,
              localField: '_id',
              foreignField: 'session',
              as: 'loggedSets'
            }
          },
          { $unwind: { path: '$loggedSets', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              totalSets: {
                $sum: { $cond: [{ $ifNull: ['$loggedSets._id', false] }, 1, 0] }
              },
              totalVolume: {
                $sum: {
                  $ifNull: [{ $multiply: ['$loggedSets.weight', '$loggedSets.reps'] }, 0]
                }
              }
            }
          }
        ])
      ]);

    const frequencyByWeek = new Map(
      weeklyCounts.map((entry) => [entry._id.toISOString().slice(0, 10), entry.workouts])
    );
    const weeklyFrequency = [];
    for (let offset = 0; offset < 8; offset += 1) {
      const start = new Date(weekStart);
      start.setUTCDate(start.getUTCDate() - 7 * (7 - offset));
      const weekStartDate = start.toISOString().slice(0, 10);
      weeklyFrequency.push({
        weekStart: weekStartDate,
        workouts: frequencyByWeek.get(weekStartDate) || 0
      });
    }

    res.json({
      data: {
        completedWorkouts,
        workoutsThisWeek,
        workoutsThisMonth,
        totalSets: volumeResult[0]?.totalSets || 0,
        totalVolume: Math.round((volumeResult[0]?.totalVolume || 0) * 100) / 100,
        weeklyFrequency
      }
    });
  })
);

router.get(
  '/progress',
  asyncHandler(async (req, res) => {
    const performance = await WorkoutSession.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(String(req.authUser._id)),
          completedAt: { $ne: null }
        }
      },
      {
        $lookup: {
          from: ExerciseSet.collection.name,
          localField: '_id',
          foreignField: 'session',
          as: 'loggedSets'
        }
      },
      { $unwind: '$loggedSets' },
      {
        $group: {
          _id: {
            exercise: '$loggedSets.exercise',
            name: '$loggedSets.exerciseName',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$startedAt',
                timezone: 'UTC'
              }
            }
          },
          maxWeight: { $max: '$loggedSets.weight' },
          maxReps: { $max: '$loggedSets.reps' },
          volume: { $sum: { $multiply: ['$loggedSets.weight', '$loggedSets.reps'] } },
          sets: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } },
      {
        $group: {
          _id: { exercise: '$_id.exercise', name: '$_id.name' },
          history: {
            $push: {
              date: '$_id.date',
              maxWeight: '$maxWeight',
              maxReps: '$maxReps',
              volume: '$volume',
              sets: '$sets'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          exerciseId: { $toString: '$_id.exercise' },
          exerciseName: '$_id.name',
          history: 1
        }
      },
      { $sort: { exerciseName: 1 } }
    ]);

    res.json({ data: { exercises: performance } });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workouts = await WorkoutTemplate.find({ user: req.authUser._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ data: { workouts } });
  })
);

router.post(
  '/',
  validateBody(workoutCreateSchema),
  asyncHandler(async (req, res) => {
    const { name, description, exercises } = req.validatedBody;
    const workout = await WorkoutTemplate.create({
      user: req.authUser._id,
      name,
      description,
      exercises: await buildExerciseList(exercises, req.authUser._id)
    });
    res.status(201).json({ data: { workout } });
  })
);

router.get(
  '/:id',
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.id);
    assertWorkoutOwner(workout, req.authUser._id);
    res.json({ data: { workout } });
  })
);

router.patch(
  '/:id',
  validateParams(idParamsSchema),
  validateBody(workoutUpdateSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.id);
    assertWorkoutOwner(workout, req.authUser._id);

    const { name, description, exercises } = req.validatedBody;
    if (name !== undefined) workout.name = name;
    if (description !== undefined) workout.description = description;
    if (exercises !== undefined) {
      workout.exercises = await buildExerciseList(exercises, req.authUser._id);
    }
    await workout.save();

    res.json({ data: { workout } });
  })
);

router.delete(
  '/:id',
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.id);
    assertWorkoutOwner(workout, req.authUser._id);

    await WorkoutSession.updateMany(
      { template: workout._id, user: req.authUser._id },
      { $set: { template: null } }
    );
    await workout.deleteOne();
    res.json({ data: { id: String(workout._id), deleted: true } });
  })
);

router.post(
  '/:workoutId/exercises',
  validateParams(workoutIdParamsSchema),
  validateBody(workoutExerciseSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.workoutId);
    assertWorkoutOwner(workout, req.authUser._id);

    const exerciseReference = await resolveExerciseReference(
      req.validatedBody.exerciseId,
      req.authUser._id
    );
    workout.exercises.push(
      toWorkoutExercise(req.validatedBody, workout.exercises.length, exerciseReference)
    );
    await workout.save();

    res.status(201).json({ data: { workout } });
  })
);

router.patch(
  '/:workoutId/exercises/:exerciseId',
  validateParams(exerciseParamsSchema),
  validateBody(workoutExerciseUpdateSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.workoutId);
    assertWorkoutOwner(workout, req.authUser._id);
    const exercise = workout.exercises.id(req.validatedParams.exerciseId);
    if (!exercise) {
      throw new AppError(404, 'exercise_not_found', 'Workout exercise not found.');
    }

    const changes = req.validatedBody;
    Object.assign(exercise, changes);
    if (changes.sets !== undefined) exercise.targetSets = changes.sets;
    if (changes.repetitions !== undefined) {
      exercise.targetRepsMin = changes.repetitions;
      exercise.targetRepsMax = changes.repetitions;
    }
    if (changes.name !== undefined || changes.muscleGroup !== undefined) {
      exercise.exercise = null;
    }

    await workout.save();
    res.json({ data: { workout } });
  })
);

router.delete(
  '/:workoutId/exercises/:exerciseId',
  validateParams(exerciseParamsSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.workoutId);
    assertWorkoutOwner(workout, req.authUser._id);
    const exercise = workout.exercises.id(req.validatedParams.exerciseId);
    if (!exercise) {
      throw new AppError(404, 'exercise_not_found', 'Workout exercise not found.');
    }

    exercise.deleteOne();
    workout.exercises.forEach((entry, order) => {
      entry.order = order;
    });
    await workout.save();
    res.json({ data: { workout } });
  })
);

export default router;
