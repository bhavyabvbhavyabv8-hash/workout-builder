import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

function bcryptInput(password) {
  return createHash('sha256')
    .update('workout-builder-password\0')
    .update(password, 'utf8')
    .digest('hex');
}

export function hashPassword(password) {
  return bcrypt.hash(bcryptInput(password), 12);
}

export function comparePassword(password, passwordHash) {
  return bcrypt.compare(bcryptInput(password), passwordHash);
}
