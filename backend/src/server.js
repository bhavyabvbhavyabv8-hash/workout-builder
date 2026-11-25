import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import seedStarterCatalog from './config/starterCatalog.js';

const port = Number(process.env.PORT) || 5000;

try {
  await connectDatabase(process.env.MONGODB_URI);
  await seedStarterCatalog();
  console.info('[database] Starter exercise library and templates are ready.');
  app.listen(port, () => {
    console.info(`[server] API listening on port ${port}.`);
  });
} catch (error) {
  console.error(
    `[server] Failed to start (${error.name || 'Error'}). Check environment configuration and database availability.`
  );
  process.exitCode = 1;
}
