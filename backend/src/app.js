import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { toExpressCorsOrigin } from './config/cors-origins.js';
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
import uploadAdmin from './modules/upload/upload.admin.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import rolesAdmin from './modules/roles/roles.admin.routes.js';
import permissionsAdmin from './modules/roles/permissions.admin.routes.js';
import usersAdmin from './modules/users/users.admin.routes.js';
import regionsPublic from './modules/regions/regions.public.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  cors({
    origin: toExpressCorsOrigin(config.cors.origins),
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Serve uploads folder as static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);

app.use('/api/news', newsPublic);
app.use('/api/sections', sectionsPublic);
app.use('/api/menus', menuPublic);
app.use('/api/pages', pagesPublic);
app.use('/api/regions', regionsPublic);

app.use('/api/admin/news', newsAiRoutes);
app.use('/api/admin/news', newsAdmin);
app.use('/api/admin/sections', sectionsAdmin);
app.use('/api/admin/menus', menuAdmin);
app.use('/api/admin/pages', pagesAdmin);
app.use('/api/admin/sources', sourcesAdmin);
app.use('/api/admin/upload', uploadAdmin);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/permissions', permissionsAdmin);
app.use('/api/admin/roles', rolesAdmin);
app.use('/api/admin/users', usersAdmin);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Centralized error handler: do not leak stack or details to client
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (process.env.NODE_ENV !== 'production') console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
