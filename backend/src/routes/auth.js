import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { Router } from 'express';
import RevokedToken from '../models/RevokedToken.js';
import User from '../models/User.js';
import authenticate, { createAccessToken, assertAuthConfiguration } from '../middleware/authenticate.js';
import requireDatabase from '../middleware/requireDatabase.js';
import { validateBody } from '../middleware/validateRequest.js';
import {
  loginSchema,
  registerSchema
} from '../validation/schemas.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import serializeUser from '../utils/serializeUser.js';
import { comparePassword as verifyPassword, hashPassword } from '../utils/password.js';

const router = Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: 'Too many authentication attempts. Try again later.'
      }
    });
  }
});
let dummyPasswordHash;

async function comparePassword(password, hash) {
  if (!hash) {
    dummyPasswordHash ||= hashPassword(randomBytes(32).toString('hex'));
    hash = await dummyPasswordHash;
  }
  return verifyPassword(password, hash);
}

router.use(requireDatabase);

router.post(
  '/register',
  authRateLimit,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    assertAuthConfiguration();
    const { name, email, password } = req.validatedBody;
    const passwordHash = await hashPassword(password);
    const user = await User.create({ displayName: name, email, passwordHash });

    res.status(201).json({ data: { user: serializeUser(user) } });
  })
);

router.post(
  '/login',
  authRateLimit,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    assertAuthConfiguration();
    const { email, password } = req.validatedBody;
    const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
    const matches = await comparePassword(password, user?.passwordHash);
    if (!matches) {
      throw new AppError(401, 'invalid_credentials', 'Email or password is incorrect.');
    }

    const token = createAccessToken(user);
    res.json({
      data: {
        user: serializeUser(user),
        token,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
      }
    });
  })
);

router.use(authenticate);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await RevokedToken.create({
      jti: req.authToken.jti,
      user: req.authUser._id,
      expiresAt: req.authToken.expiresAt
    });
    res.json({ data: { message: 'Logged out.' } });
  })
);

router.get('/me', (req, res) => {
  res.json({ data: { user: serializeUser(req.authUser) } });
});

export default router;
