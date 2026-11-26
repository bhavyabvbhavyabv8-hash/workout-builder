import mongoose from 'mongoose';

const personalGoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weeklyWorkoutTarget: { type: Number, required: true, min: 1, max: 14 },
    totalWorkoutTarget: { type: Number, required: true, min: 1, max: 10000 }
  },
  { timestamps: true }
);

personalGoalSchema.index({ user: 1 }, { unique: true });

export default mongoose.model('PersonalGoal', personalGoalSchema);
 