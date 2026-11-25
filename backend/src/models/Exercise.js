import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    muscleGroup: {
      type: String,
      required: true,
      enum: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full-body']
    },
    equipment: { type: String, trim: true, maxlength: 80 },
    instructions: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isCustom: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('Exercise', exerciseSchema);
