import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import RevokedToken from '../models/RevokedToken.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

const JWT_ISSUER = 'workout-builder';
const JWT_AUDIENCE = 'workout-builder-api';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new AppError(503, 'authentication_unavailable', 'Authentication is not configured.');
  }

  return secret;
}

export function assertAuthConfiguration() {
  const secret = getJwtSecret();
  try {
    jwt.sign({}, secret, {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });
  } catch {
    throw new AppError(503, 'authentication_unavailable', 'Authentication configuration is invalid.');
  }
}

export function createAccessToken(user) {
  assertAuthConfiguration();
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(
    { ver: user.tokenVersion || 0 },
    secret,
    {
      algorithm: 'HS256',
      subject: String(user._id),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn,
      jwtid: randomUUID()
    }
  );
}

export default async function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match) {
    return next(new AppError(401, 'unauthorized', 'A valid bearer token is required.'));
  }

  let payload;
  try {
    payload = jwt.verify(match[1], getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError(401, 'unauthorized', 'The authentication token is invalid or expired.'));
  }

  if (
    typeof payload !== 'object' ||
    !payload.sub ||
    !mongoose.isValidObjectId(payload.sub) ||
    !payload.jti ||
    !Number.isInteger(payload.ver)
  ) {
    return next(new AppError(401, 'unauthorized', 'The authentication token is invalid or expired.'));
  }

  try {
    const user = await User.findById(payload.sub)
      .select('displayName email tokenVersion createdAt updatedAt')
      .lean();
    if (!user || user.tokenVersion !== payload.ver) {
      return next(new AppError(401, 'unauthorized', 'The authentication token is invalid or expired.'));
    }

    if (await RevokedToken.exists({ jti: payload.jti })) {
      return next(new AppError(401, 'unauthorized', 'The authentication token has been revoked.'));
    }

    req.authUser = user;
    req.authToken = {
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000)
    };
    return next();
  } catch (error) {
    return next(error);
  }
}
