import app from './app.js';
import { config } from './config/index.js';
import { initializeSettings } from './modules/settings/settings.routes.js';

const server = app.listen(config.port, async () => {
  console.log(`Server listening on port ${config.port}`);
  
  // Инициализируем настройки
  try {
    await initializeSettings();
  } catch (e) {
    console.warn('Settings initialization failed:', e.message);
  }
  
  // Запускаем планировщик
  try {
    const { getQueue, startScheduler } = await import('./jobs/queue.js');
    if (getQueue()) startScheduler();
  } catch (e) {
    console.warn('Scheduler not started:', e.message);
  }
});
