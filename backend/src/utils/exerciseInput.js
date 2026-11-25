import mongoose from 'mongoose';
import Exercise from '../models/Exercise.js';
import AppError from './AppError.js';

export async function resolveExerciseReference(exerciseId, userId) {
  if (!exerciseId) {
    return null;
  }

  const exercise = await Exercise.findById(exerciseId);
  if (!exercise) {
    throw new AppError(404, 'exercise_not_found', 'Exercise not found.');
  }

  if (exercise.createdBy && !exercise.createdBy.equals(userId)) {
    throw new AppError(403, 'forbidden', 'You cannot use this exercise.');
  }

  return exercise._id;
}

export function toWorkoutExercise(input, order, exerciseReference = null) {
  return {
    ...(input._id && mongoose.isValidObjectId(input._id) ? { _id: input._id } : {}),
    exercise: exerciseReference,
    name: input.name,
    muscleGroup: input.muscleGroup,
    order,
    sets: input.sets,
    repetitions: input.repetitions,
    weight: input.weight ?? 0,
    durationSeconds: input.durationSeconds,
    restSeconds: input.restSeconds,
    notes: input.notes,
    targetSets: input.sets,
    targetRepsMin: input.repetitions,
    targetRepsMax: input.repetitions
  };
}

export async function getOrCreateCustomExercise(userId, name, muscleGroup) {
  const normalizedName = name.trim().toLocaleLowerCase('en-US');
  let exercise = await Exercise.findOne({
    createdBy: userId,
    normalizedName,
    muscleGroup,
    isCustom: true
  });

  if (exercise) {
    return exercise;
  }

  try {
    exercise = await Exercise.create({
      name: name.trim(),
      normalizedName,
      muscleGroup,
      createdBy: userId,
      isCustom: true
    });
    return exercise;
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    exercise = await Exercise.findOne({
      createdBy: userId,
      normalizedName,
      muscleGroup,
      isCustom: true
    });
    if (!exercise) {
      throw error;
    }
    return exercise;
  }
}
