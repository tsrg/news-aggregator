import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRoutes from './modules/auth/auth.routes.js';
import newsPublic from './modules/news/news.public.routes.js';
import newsAdmin from './modules/news/news.admin.routes.js';
import newsAiRoutes from './modules/news/news.ai.routes.js';
import sectionsPublic from './modules/sections/sections.public.routes.js';
import sectionsAdmin from './modules/sections/sections.admin.routes.js';
import menuPublic from './modules/menu/menu.public.routes.js';
import menuAdmin from './modules/menu/menu.admin.routes.js';
import pagesPublic from './modules/pages/pages.public.routes.js';
import pagesAdmin from './modules/pages/pages.admin.routes.js';
import sourcesAdmin from './modules/sources/sources.admin.routes.js';

const app = express();
app.use(
  cors({
    origin: config.cors.origins === null ? true : config.cors.origins,
  })
);
app.use(express.json());

app.use('/api/auth', authRoutes);

app.use('/api/news', newsPublic);
app.use('/api/sections', sectionsPublic);
app.use('/api/menus', menuPublic);
app.use('/api/pages', pagesPublic);

app.use('/api/admin/news', newsAiRoutes);
app.use('/api/admin/news', newsAdmin);
app.use('/api/admin/sections', sectionsAdmin);
app.use('/api/admin/menus', menuAdmin);
app.use('/api/admin/pages', pagesAdmin);
app.use('/api/admin/sources', sourcesAdmin);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Centralized error handler: do not leak stack or details to client
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (process.env.NODE_ENV !== 'production') console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
