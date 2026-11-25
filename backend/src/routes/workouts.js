import mongoose from 'mongoose';
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireDatabase from '../middleware/requireDatabase.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validateRequest.js';
import ExerciseSet from '../models/ExerciseSet.js';
import WorkoutSession from '../models/WorkoutSession.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';
import {
  exerciseParamsSchema,
  idParamsSchema,
  exerciseCreateSchema,
  exerciseSearchSchema,
  progressQuerySchema,
  saveAsTemplateSchema,
  workoutCreateSchema,
  workoutExerciseSchema,
  workoutExerciseUpdateSchema,
  workoutIdParamsSchema,
  workoutUpdateSchema
} from '../validation/schemas.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Exercise from '../models/Exercise.js';
import { resolveExerciseReference, toWorkoutExercise } from '../utils/exerciseInput.js';

const router = Router();

router.use(requireDatabase, authenticate);

function assertWorkoutOwner(workout, userId, expectedTemplate) {
  if (!workout) {
    throw new AppError(404, 'workout_not_found', 'Workout not found.');
  }
  if (
    expectedTemplate !== undefined &&
    (workout.isTemplate ?? false) !== expectedTemplate
  ) {
    throw new AppError(404, 'workout_not_found', 'Workout not found.');
  }
  if (workout.isBuiltIn || !workout.user || !workout.user.equals(userId)) {
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

function copyExerciseEntries(exercises) {
  return exercises.map((exercise, order) => ({
    exercise: exercise.exercise,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    order,
    sets: exercise.sets,
    repetitions: exercise.repetitions,
    weight: exercise.weight,
    durationSeconds: exercise.durationSeconds,
    restSeconds: exercise.restSeconds,
    notes: exercise.notes,
    targetSets: exercise.sets,
    targetRepsMin: exercise.repetitions,
    targetRepsMax: exercise.repetitions
  }));
}

function isAllowedTemplate(template, userId) {
  return template?.isTemplate && (template.isBuiltIn || template.user?.equals(userId));
}

router.get(
  '/exercises',
  validateQuery(exerciseSearchSchema),
  asyncHandler(async (req, res) => {
    const { q, muscleGroup, equipment, difficulty, page, limit } = req.validatedQuery;
    const filter = {
      $or: [
        { createdBy: null, isCustom: false },
        { createdBy: req.authUser._id, isCustom: true }
      ]
    };
    if (q) {
      filter.normalizedName = {
        $regex: q.toLocaleLowerCase('en-US').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      };
    }
    if (muscleGroup) filter.muscleGroup = muscleGroup;
    if (equipment) {
      filter.equipment = {
        $regex: equipment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i'
      };
    }
    if (difficulty) filter.difficulty = difficulty;

    const [exercises, total] = await Promise.all([
      Exercise.find(filter)
        .sort({ normalizedName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Exercise.countDocuments(filter)
    ]);
    res.json({ data: { exercises, page, limit, total } });
  })
);

router.post(
  '/exercises',
  validateBody(exerciseCreateSchema),
  asyncHandler(async (req, res) => {
    const exercise = await Exercise.create({
      ...req.validatedBody,
      normalizedName: req.validatedBody.name.toLocaleLowerCase('en-US'),
      createdBy: req.authUser._id,
      isCustom: true
    });
    res.status(201).json({ data: { exercise } });
  })
);

router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const templates = await WorkoutTemplate.find({
      $or: [
        { user: req.authUser._id, isTemplate: true },
        { isBuiltIn: true, isTemplate: true }
      ]
    })
      .sort({ isBuiltIn: -1, name: 1 })
      .lean();
    res.json({ data: { templates } });
  })
);

router.post(
  '/templates',
  validateBody(workoutCreateSchema),
  asyncHandler(async (req, res) => {
    const { name, description, category, difficulty, durationMinutes, exercises } =
      req.validatedBody;
    const template = await WorkoutTemplate.create({
      user: req.authUser._id,
      isTemplate: true,
      name,
      description,
      category,
      difficulty,
      durationMinutes,
      exercises: await buildExerciseList(exercises, req.authUser._id)
    });
    res.status(201).json({ data: { template } });
  })
);

router.get(
  '/templates/:id',
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const template = await WorkoutTemplate.findById(req.validatedParams.id);
    if (!template || !isAllowedTemplate(template, req.authUser._id)) {
      throw new AppError(404, 'template_not_found', 'Workout template not found.');
    }
    res.json({ data: { template } });
  })
);

router.post(
  '/templates/:id/use',
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const template = await WorkoutTemplate.findById(req.validatedParams.id);
    if (!template) {
      throw new AppError(404, 'template_not_found', 'Workout template not found.');
    }
    if (!isAllowedTemplate(template, req.authUser._id)) {
      throw new AppError(403, 'forbidden', 'You are not allowed to use this template.');
    }
    const workout = await WorkoutTemplate.create({
      user: req.authUser._id,
      isTemplate: false,
      name: template.name,
      description: template.description,
      category: template.category,
      difficulty: template.difficulty,
      durationMinutes: template.durationMinutes,
      exercises: copyExerciseEntries(template.exercises)
    });
    res.status(201).json({ data: { workout } });
  })
);

router.patch(
  '/templates/:id',
  validateParams(idParamsSchema),
  validateBody(workoutUpdateSchema),
  asyncHandler(async (req, res) => {
    const template = await WorkoutTemplate.findById(req.validatedParams.id);
    assertWorkoutOwner(template, req.authUser._id, true);
    const { name, description, category, difficulty, durationMinutes, exercises } =
      req.validatedBody;
    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;
    if (category !== undefined) template.category = category;
    if (difficulty !== undefined) template.difficulty = difficulty;
    if (durationMinutes !== undefined) template.durationMinutes = durationMinutes;
    if (exercises !== undefined) {
      template.exercises = await buildExerciseList(exercises, req.authUser._id);
    }
    await template.save();
    res.json({ data: { template } });
  })
);

router.delete(
  '/templates/:id',
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const template = await WorkoutTemplate.findById(req.validatedParams.id);
    assertWorkoutOwner(template, req.authUser._id, true);
    await template.deleteOne();
    res.json({ data: { id: String(template._id), deleted: true } });
  })
);

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
    const [
      completedWorkouts,
      workoutsStarted,
      workoutsThisWeek,
      workoutsThisMonth,
      weeklyCounts,
      volumeResult,
      durationResult,
      recordResults,
      workoutDates
    ] = await Promise.all([
        WorkoutSession.countDocuments(filter),
        WorkoutSession.countDocuments({ user: req.authUser._id }),
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
              totalReps: {
                $sum: { $ifNull: ['$loggedSets.reps', 0] }
              },
              totalVolume: {
                $sum: {
                  $ifNull: [{ $multiply: ['$loggedSets.weight', '$loggedSets.reps'] }, 0]
                }
              }
            }
          }
        ]),
        WorkoutSession.aggregate([
          { $match: filter },
          {
            $project: {
              durationMilliseconds: {
                $cond: [
                  { $gt: ['$completedAt', '$startedAt'] },
                  { $subtract: ['$completedAt', '$startedAt'] },
                  0
                ]
              }
            }
          },
          { $group: { _id: null, totalMilliseconds: { $sum: '$durationMilliseconds' } } }
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
          { $unwind: '$loggedSets' },
          {
            $group: {
              _id: '$loggedSets.exercise',
              exerciseName: { $first: '$loggedSets.exerciseName' },
              maxWeight: { $max: '$loggedSets.weight' },
              maxReps: { $max: '$loggedSets.reps' }
            }
          },
          { $sort: { exerciseName: 1 } }
        ]),
        WorkoutSession.aggregate([
          { $match: filter },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$startedAt',
                  timezone: 'UTC'
                }
              }
            }
          },
          { $sort: { _id: -1 } }
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

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const latestWorkoutDate = workoutDates[0]?._id;
    let currentStreakDays = 0;
    if (
      latestWorkoutDate &&
      new Date(`${latestWorkoutDate}T00:00:00.000Z`) >= yesterday
    ) {
      let expectedDate = new Date(`${latestWorkoutDate}T00:00:00.000Z`);
      for (const { _id: workoutDate } of workoutDates) {
        const date = new Date(`${workoutDate}T00:00:00.000Z`);
        if (date.getTime() !== expectedDate.getTime()) break;
        currentStreakDays += 1;
        expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
      }
    }
    const totalDurationSeconds = Math.floor((durationResult[0]?.totalMilliseconds || 0) / 1000);

    res.json({
      data: {
        completedWorkouts,
        workoutsStarted,
        completionRatePercent: workoutsStarted
          ? Math.round((completedWorkouts / workoutsStarted) * 100)
          : 0,
        workoutsThisWeek,
        workoutsThisMonth,
        totalSets: volumeResult[0]?.totalSets || 0,
        totalReps: volumeResult[0]?.totalReps || 0,
        totalVolume: Math.round((volumeResult[0]?.totalVolume || 0) * 100) / 100,
        totalDurationSeconds,
        averageDurationSeconds: completedWorkouts
          ? Math.round(totalDurationSeconds / completedWorkouts)
          : 0,
        currentStreakDays,
        personalRecords: recordResults.map((record) => ({
          exerciseId: String(record._id),
          exerciseName: record.exerciseName,
          maxWeight: record.maxWeight,
          maxReps: record.maxReps
        })),
        weeklyFrequency
      }
    });
  })
);

router.get(
  '/progress',
  validateQuery(progressQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to, exerciseId } = req.validatedQuery;
    const sessionFilter = {
      user: new mongoose.Types.ObjectId(String(req.authUser._id)),
      completedAt: { $ne: null }
    };
    if (from || to) {
      sessionFilter.startedAt = {};
      if (from) sessionFilter.startedAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) {
        const endDate = new Date(`${to}T00:00:00.000Z`);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        sessionFilter.startedAt.$lt = endDate;
      }
    }
    const performancePipeline = [
      {
        $match: sessionFilter
      },
      {
        $lookup: {
          from: ExerciseSet.collection.name,
          localField: '_id',
          foreignField: 'session',
          as: 'loggedSets'
        }
      },
      { $unwind: '$loggedSets' }
    ];
    if (exerciseId) {
      performancePipeline.push({
        $match: { 'loggedSets.exercise': new mongoose.Types.ObjectId(exerciseId) }
      });
    }
    performancePipeline.push(
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
    );
    const performance = await WorkoutSession.aggregate(performancePipeline);

    res.json({ data: { exercises: performance, from: from || null, to: to || null, exerciseId: exerciseId || null } });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workouts = await WorkoutTemplate.find({
      user: req.authUser._id,
      $or: [{ isTemplate: false }, { isTemplate: { $exists: false } }]
    })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ data: { workouts } });
  })
);

router.post(
  '/',
  validateBody(workoutCreateSchema),
  asyncHandler(async (req, res) => {
    const { name, description, category, difficulty, durationMinutes, exercises } = req.validatedBody;
    const workout = await WorkoutTemplate.create({
      user: req.authUser._id,
      name,
      description,
      category,
      difficulty,
      durationMinutes,
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
    assertWorkoutOwner(workout, req.authUser._id, false);
    res.json({ data: { workout } });
  })
);

router.patch(
  '/:id',
  validateParams(idParamsSchema),
  validateBody(workoutUpdateSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.id);
    assertWorkoutOwner(workout, req.authUser._id, false);

    const { name, description, exercises } = req.validatedBody;
    const { category, difficulty, durationMinutes } = req.validatedBody;
    if (name !== undefined) workout.name = name;
    if (description !== undefined) workout.description = description;
    if (category !== undefined) workout.category = category;
    if (difficulty !== undefined) workout.difficulty = difficulty;
    if (durationMinutes !== undefined) workout.durationMinutes = durationMinutes;
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
    assertWorkoutOwner(workout, req.authUser._id, false);

    await WorkoutSession.updateMany(
      { template: workout._id, user: req.authUser._id },
      { $set: { template: null } }
    );
    await workout.deleteOne();
    res.json({ data: { id: String(workout._id), deleted: true } });
  })
);

router.post(
  '/:id/template',
  validateParams(idParamsSchema),
  validateBody(saveAsTemplateSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.id);
    assertWorkoutOwner(workout, req.authUser._id, false);
    const template = await WorkoutTemplate.create({
      user: req.authUser._id,
      isTemplate: true,
      name: req.validatedBody.name || workout.name,
      description: workout.description,
      category: workout.category,
      difficulty: workout.difficulty,
      durationMinutes: workout.durationMinutes,
      exercises: copyExerciseEntries(workout.exercises)
    });
    res.status(201).json({ data: { template } });
  })
);

router.post(
  '/:workoutId/exercises',
  validateParams(workoutIdParamsSchema),
  validateBody(workoutExerciseSchema),
  asyncHandler(async (req, res) => {
    const workout = await WorkoutTemplate.findById(req.validatedParams.workoutId);
    assertWorkoutOwner(workout, req.authUser._id, false);

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
    assertWorkoutOwner(workout, req.authUser._id, false);
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
    assertWorkoutOwner(workout, req.authUser._id, false);
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
