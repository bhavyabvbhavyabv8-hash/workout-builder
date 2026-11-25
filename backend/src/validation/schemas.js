import { z } from 'zod';

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .max(128, 'Password must be no more than 128 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.');
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ID.');
const muscleGroups = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full-body'];
const workoutCategories = ['strength', 'hypertrophy', 'conditioning', 'mobility', 'custom'];
const difficulties = ['beginner', 'intermediate', 'advanced'];

function isValidDateOnly(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDateOnly, 'Must be a valid calendar date.');

export const workoutExerciseSchema = z
  .object({
    exerciseId: objectIdSchema.optional(),
    name: z.string().trim().min(1).max(100),
    muscleGroup: z.enum(muscleGroups),
    sets: z.number().int().min(1).max(30),
    repetitions: z.number().int().min(1).max(1000),
    weight: z.number().finite().min(0).max(100000).optional(),
    durationSeconds: z.number().int().min(0).max(86400).optional(),
    restSeconds: z.number().int().min(0).max(3600).optional(),
    notes: z.string().trim().max(1000).optional()
  })
  .strict();

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    password: passwordSchema
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128)
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: emailSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one profile field is required.');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema
  })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password.'
  });

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1).max(128)
  })
  .strict();

export const workoutCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional(),
    category: z.enum(workoutCategories).optional(),
    difficulty: z.enum(difficulties).optional(),
    durationMinutes: z.number().int().min(1).max(600).optional(),
    exercises: z.array(workoutExerciseSchema).max(100).default([])
  })
  .strict();

export const workoutUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    category: z.enum(workoutCategories).optional(),
    difficulty: z.enum(difficulties).optional(),
    durationMinutes: z.number().int().min(1).max(600).optional(),
    exercises: z.array(workoutExerciseSchema).max(100).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one workout field is required.');

export const workoutExerciseUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    muscleGroup: z.enum(muscleGroups).optional(),
    sets: z.number().int().min(1).max(30).optional(),
    repetitions: z.number().int().min(1).max(1000).optional(),
    weight: z.number().finite().min(0).max(100000).optional(),
    durationSeconds: z.number().int().min(0).max(86400).optional(),
    restSeconds: z.number().int().min(0).max(3600).optional(),
    notes: z.string().trim().max(1000).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one exercise field is required.');

export const startSessionSchema = z
  .object({
    templateId: objectIdSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    notes: z.string().trim().max(2000).optional()
  })
  .strict()
  .refine((value) => value.templateId || value.name, 'Provide a workout template or session name.');

export const exerciseSetSchema = z
  .object({
    exerciseName: z.string().trim().min(1).max(100),
    muscleGroup: z.enum(muscleGroups).optional(),
    setNumber: z.number().int().min(1).max(100),
    reps: z.number().int().min(1).max(1000),
    weight: z.number().finite().min(0).max(100000),
    rir: z.number().finite().min(0).max(10).optional(),
    durationSeconds: z.number().int().min(0).max(86400).optional(),
    notes: z.string().trim().max(1000).optional()
  })
  .strict();

export const idParamsSchema = z.object({ id: objectIdSchema }).strict();
export const workoutIdParamsSchema = z.object({ workoutId: objectIdSchema }).strict();
export const exerciseParamsSchema = z
  .object({ workoutId: objectIdSchema, exerciseId: objectIdSchema })
  .strict();
export const sessionIdParamsSchema = z.object({ sessionId: objectIdSchema }).strict();
export const historyQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
  .strict();

export const exerciseSearchSchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    muscleGroup: z.enum(muscleGroups).optional(),
    equipment: z.string().trim().max(80).optional(),
    difficulty: z.enum(difficulties).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
  .strict();

export const exerciseCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    muscleGroup: z.enum(muscleGroups),
    targetMuscles: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    equipment: z.string().trim().max(80).optional(),
    difficulty: z.enum(difficulties).default('intermediate'),
    instructions: z.string().trim().max(2000).optional()
  })
  .strict();

export const progressQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    exerciseId: objectIdSchema.optional()
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'End date must be on or after the start date.'
  });

export const personalGoalSchema = z
  .object({
    weeklyWorkoutTarget: z.number().int().min(1).max(14),
    totalWorkoutTarget: z.number().int().min(1).max(10000)
  })
  .strict();

export const saveAsTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional()
  })
  .strict();
