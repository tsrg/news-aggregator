import app from './app.js';
import { config } from './config/index.js';
import { startScheduler } from './jobs/queue.js';

const server = app.listen(config.port, async () => {
  console.log(`Server listening on port ${config.port}`);
  try {
    const { getQueue, startScheduler } = await import('./jobs/queue.js');
    if (getQueue()) startScheduler();
  } catch (e) {
    console.warn('Scheduler not started:', e.message);
  }
});
