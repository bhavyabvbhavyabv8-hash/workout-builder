import mongoose from 'mongoose';

const workoutSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutTemplate', default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 2000 }
  },
  { timestamps: true }
);

workoutSessionSchema.index({ user: 1, startedAt: -1 });

export default mongoose.model('WorkoutSession', workoutSessionSchema);
