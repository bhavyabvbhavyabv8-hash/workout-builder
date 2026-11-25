import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, required: true, default: 0, select: false }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
