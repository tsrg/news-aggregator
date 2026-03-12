import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireAuth } from '../auth/auth.middleware.js';
import { config } from '../../config/index.js';
import { uploadBuffer as s3UploadBuffer } from '../../services/s3.js';

const router = Router();

const memoryStorage = multer.memoryStorage();

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: config.s3.enabled ? memoryStorage : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (config.s3.enabled) {
    try {
      const ext = path.extname(req.file.originalname);
      const key = `uploads/${new Date().getUTCFullYear()}/${randomUUID()}${ext}`;
      const url = await s3UploadBuffer(key, req.file.buffer, req.file.mimetype || 'application/octet-stream');
      if (url) {
        return res.json({ url });
      }
    } catch (err) {
      console.error('S3 upload failed:', err.message);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }

  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
