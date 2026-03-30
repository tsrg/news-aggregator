import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { resolveStorageProvider, uploadFileBySettings } from '../../services/storage.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

router.post('/', requireAuth, requirePermission('settings'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const provider = await resolveStorageProvider();

    if (provider === 'minio' || provider === 'cdn') {
      const url = await uploadFileBySettings(req.file);
      return res.json({ url });
    }

    await mkdir('uploads', { recursive: true });
    const ext = path.extname(req.file.originalname);
    const filename = `${randomUUID()}${ext}`;
    await writeFile(path.join('uploads', filename), req.file.buffer);
    const url = `/uploads/${filename}`;
    return res.json({ url });
  } catch (err) {
    console.error('Storage upload failed:', err.message);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

export default router;
