import mongoose from 'mongoose';

const progressRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutSession', default: null },
    recordedAt: { type: Date, required: true, default: Date.now },
    weight: { type: Number, required: true, min: 0 },
    reps: { type: Number, required: true, min: 1, max: 1000 },
    volume: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

progressRecordSchema.index({ user: 1, exercise: 1, recordedAt: -1 });

export default mongoose.model('ProgressRecord', progressRecordSchema);
