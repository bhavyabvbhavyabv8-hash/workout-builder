import mongoose from 'mongoose';

const templateExerciseSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    order: { type: Number, required: true, min: 0 },
    targetSets: { type: Number, required: true, min: 1, max: 30 },
    targetRepsMin: { type: Number, required: true, min: 1, max: 100 },
    targetRepsMax: { type: Number, required: true, min: 1, max: 100 },
    restSeconds: { type: Number, min: 0, max: 3600 }
  },
  { _id: false }
);

const workoutTemplateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    exercises: { type: [templateExerciseSchema], default: [] }
  },
  { timestamps: true }
);

workoutTemplateSchema.index({ user: 1, name: 1 });

export default mongoose.model('WorkoutTemplate', workoutTemplateSchema);
