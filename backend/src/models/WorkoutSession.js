import mongoose from 'mongoose';

const plannedExerciseSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    muscleGroup: { type: String, required: true },
    sets: { type: Number, required: true, min: 1 },
    repetitions: { type: Number, required: true, min: 1 },
    weight: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, min: 0 },
    restSeconds: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 }
  },
  { _id: false }
);

const workoutSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutTemplate', default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    plannedExercises: { type: [plannedExerciseSchema], default: [] },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 2000 }
  },
  { timestamps: true }
);

workoutSessionSchema.index({ user: 1, startedAt: -1 });
workoutSessionSchema.index({ user: 1, completedAt: 1, startedAt: -1 });

export default mongoose.model('WorkoutSession', workoutSessionSchema);
