import mongoose from 'mongoose';

const exerciseSetSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutSession', required: true },
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    setNumber: { type: Number, required: true, min: 1 },
    reps: { type: Number, required: true, min: 0, max: 1000 },
    weight: { type: Number, required: true, min: 0 },
    rir: { type: Number, min: 0, max: 10 },
    completedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

exerciseSetSchema.index({ session: 1, exercise: 1, setNumber: 1 }, { unique: true });

export default mongoose.model('ExerciseSet', exerciseSetSchema);
