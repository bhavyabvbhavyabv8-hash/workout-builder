import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import accountRouter from './routes/account.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import goalsRouter from './routes/goals.js';
import sessionsRouter from './routes/sessions.js';
import workoutsRouter from './routes/workouts.js';
import AppError from './utils/AppError.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new AppError(403, 'forbidden_origin', 'Request origin is not allowed.'));
    }
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/account', accountRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/workouts/sessions', sessionsRouter);
app.use('/api/workouts', workoutsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
