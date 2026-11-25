import mongoose from 'mongoose';
import Exercise from './Exercise.js';

const templateExerciseSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    muscleGroup: {
      type: String,
      required: true,
      enum: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full-body']
    },
    order: { type: Number, required: true, min: 0 },
    sets: { type: Number, required: true, min: 1, max: 30 },
    repetitions: { type: Number, required: true, min: 1, max: 1000 },
    weight: { type: Number, required: true, min: 0, default: 0 },
    durationSeconds: { type: Number, min: 0, max: 86400 },
    restSeconds: { type: Number, min: 0, max: 3600 },
    notes: { type: String, trim: true, maxlength: 1000 },
    targetSets: { type: Number, min: 1, max: 30 },
    targetRepsMin: { type: Number, min: 1, max: 1000 },
    targetRepsMax: { type: Number, min: 1, max: 1000 }
  }
);

templateExerciseSchema.pre('validate', async function keepLegacyTargets() {
  if (this.sets == null && this.targetSets != null) {
    this.sets = this.targetSets;
  }
  if (this.repetitions == null && this.targetRepsMin != null) {
    this.repetitions = this.targetRepsMin;
  }
  if (this.targetSets == null && this.sets != null) {
    this.targetSets = this.sets;
  }
  if (this.targetRepsMin == null && this.repetitions != null) {
    this.targetRepsMin = this.repetitions;
  }
  if (this.targetRepsMax == null && this.repetitions != null) {
    this.targetRepsMax = this.repetitions;
  }

  if (this.exercise && (!this.name || !this.muscleGroup)) {
    const referencedExercise = await Exercise.findById(this.exercise).select('name muscleGroup');
    if (referencedExercise) {
      this.name ||= referencedExercise.name;
      this.muscleGroup ||= referencedExercise.muscleGroup;
    }
  }
});

const workoutTemplateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    category: {
      type: String,
      enum: ['strength', 'hypertrophy', 'conditioning', 'mobility', 'custom'],
      default: 'custom'
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    },
    durationMinutes: { type: Number, min: 1, max: 600, default: 45 },
    isTemplate: { type: Boolean, default: false },
    isBuiltIn: { type: Boolean, default: false },
    systemKey: { type: String, trim: true, maxlength: 80 },
    exercises: { type: [templateExerciseSchema], default: [] }
  },
  { timestamps: true }
);

workoutTemplateSchema.index({ user: 1, name: 1 });
workoutTemplateSchema.index(
  { systemKey: 1 },
  { unique: true, partialFilterExpression: { isBuiltIn: true } }
);
workoutTemplateSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('WorkoutTemplate', workoutTemplateSchema);
