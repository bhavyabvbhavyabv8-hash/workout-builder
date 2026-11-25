import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT) || 5000;

try {
  await connectDatabase(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.info(`[server] API listening on port ${port}.`);
  });
} catch (error) {
  console.error('[server] Failed to start:', error);
  process.exitCode = 1;
}
