import mongoose from 'mongoose';

const revokedTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, expires: 0 }
  },
  { timestamps: true }
);

revokedTokenSchema.index({ user: 1 });

export default mongoose.model('RevokedToken', revokedTokenSchema);
