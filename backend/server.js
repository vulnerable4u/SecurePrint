import dotenv from 'dotenv';
dotenv.config();

import { uploadFile as b2Upload, downloadFile as b2Download, deleteFile as b2Delete } from './backblaze.js';
import { databases, APPWRITE_CONFIG } from './appwrite.js';
import { Query, ID } from 'node-appwrite';
import archiver from 'archiver';
import crypto from 'node:crypto';

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

const app = express();
const port = process.env.PORT || 3001;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  },
});

app.use(cors());
app.use(express.json());

// Rate limit /api/retrieve: 10/min/IP
const retrieveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const OTC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

async function generateUniqueOTC() {
  while (true) {
    const bytes = crypto.randomBytes(6);
    let otc = '';
    for (let i = 0; i < 6; i++) {
      otc += OTC_CHARS[bytes[i] % OTC_CHARS.length];
    }
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      [Query.equal('otc', [otc])]
    );
    if (res.total === 0) return otc;
  }
}

// POST /api/upload - 1-5 files under one OTC
app.post('/api/upload', upload.array('files', 5), async (req, res) => {
  const b2FileIds = [];
  try {
    const files = req.files;
    if (!files?.length) return res.status(400).json({ error: 'No files uploaded' });
    if (files.length > 5) return res.status(400).json({ error: 'Max 5 files' });

    const fileNames = [];
    const fileSizes = [];
    const mimeTypes = [];

    for (const file of files) {
      const b2Result = await b2Upload(file.buffer, file.originalname, file.mimetype);
      b2FileIds.push(b2Result.fileId);
      fileNames.push(file.originalname);
      fileSizes.push(file.size);
      mimeTypes.push(file.mimetype);
    }

    // Validate arrays match
    const len = files.length;
    if (b2FileIds.length !== len || fileNames.length !== len || fileSizes.length !== len || mimeTypes.length !== len) {
      throw new Error('Metadata array mismatch');
    }

    const otc = await generateUniqueOTC();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const docId = ID.unique();

    await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collectionOTC, docId, {
      otc,
      b2FileIds,
      fileNames,
      fileSizes,
      mimeTypes,
      used: false,
      createdAt: now,
      expiresAt,
      userId: req.body.userId || 'anonymous',
    });

    res.json({ success: true, otc, files: files.length });
  } catch (error) {
    // Cleanup orphan B2 files
    for (const b2FileId of b2FileIds) {
      b2Delete(b2FileId).catch(console.error);
    }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// POST /api/retrieve - one-time download
app.post('/api/retrieve', retrieveLimiter, async (req, res) => {
  try {
    const { otc } = req.body;
    if (!otc) return res.status(400).json({ error: 'OTC required' });

    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      [Query.equal('otc', [otc])]
    );

    if (response.documents.length === 0) return res.status(404).json({ error: 'Invalid OTC' });

    const doc = response.documents[0];
    if (doc.used) return res.status(410).json({ error: 'OTC already used' });
    if (new Date(doc.expiresAt) < new Date()) return res.status(410).json({ error: 'OTC expired' });

    const { b2FileIds, fileNames, mimeTypes, $id: docId } = doc;
    const numFiles = b2FileIds.length;

    let contentBuffer;
    let contentType;
    let filename;

    if (numFiles === 1) {
      contentBuffer = await b2Download(b2FileIds[0]);
      contentType = mimeTypes[0];
      filename = fileNames[0];
    } else {
      contentBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        const zip = archiver('zip', { zlib: { level: 9 } });
        zip.on('data', chunk => chunks.push(chunk));
        zip.on('end', () => resolve(Buffer.concat(chunks)));
        zip.on('error', reject);
          for (let i = 0; i < numFiles; i++) {
                    zip.file(b2Download(b2FileIds[i]), { name: fileNames[i] });      }
                         zip.finalize();
      });
      contentType = 'application/zip';
      filename = `secure-print-${otc}.zip`;
    }

    // Mark used
    await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collectionOTC, docId, {
      used: true,
      usedAt: new Date().toISOString(),
    });

    // Cleanup B2 and doc
    for (const b2FileId of b2FileIds) {
      b2Delete(b2FileId).catch(console.error);
    }
    await databases.deleteDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collectionOTC, docId);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': contentBuffer.length,
    });
    res.send(contentBuffer);
  } catch (error) {
    console.error('Retrieve error:', error);
    res.status(500).json({ error: 'Retrieve failed', details: error.message });
  }
});

// POST /api/validate-otc
app.post('/api/validate-otc', async (req, res) => {
  try {
    const { otc } = req.body;
    if (!otc) return res.status(400).json({ valid: false, error: 'OTC required' });

    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      [Query.equal('otc', [otc])]
    );

    if (response.documents.length === 0) return res.status(404).json({ valid: false, error: 'Invalid OTC' });

    const doc = response.documents[0];
    const expired = new Date(doc.expiresAt) < new Date();

    res.json({
      valid: !doc.used && !expired,
      files: doc.b2FileIds?.length || 0,
      expiresAt: doc.expiresAt,
    });
  } catch (error) {
    console.error('Validate error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

// GET /api/health
app.get('/api/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

app.listen(port, () => {
  console.log(`Secure Print Backend on port ${port}`);
});

export default app;

