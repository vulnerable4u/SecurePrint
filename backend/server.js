import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import { uploadFile as b2Upload, downloadFile as b2Download, deleteFile as b2Delete } from './backblaze.js';
import { createDatabases } from './appwrite.js';
import { Query, ID } from 'node-appwrite';
import archiver from 'archiver';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

// Init Appwrite AFTER explicit dotenv
let databases;
let APPWRITE_CONFIG;
try {
  ({ databases, APPWRITE_CONFIG } = createDatabases());
  console.log('Backend dependencies initialized');
} catch (error) {
  console.error('Backend initialization failed');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const MIME_BY_EXTENSION = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function getSafeMimeType(file) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const fallbackMime = MIME_BY_EXTENSION[ext];
  const genericMime = !file.mimetype || file.mimetype === 'application/octet-stream';

  return genericMime && fallbackMime ? fallbackMime : null;
}

// Use disk storage instead of memory for free tier (Render 512MB RAM)
const uploadDir = path.join(os.tmpdir(), 'secure-print-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
    }
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (req, file, cb) => {
    if (getSafeMimeType(file)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  },
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://localhost:8081,https://secureprint.onrender.com').split(',');
  const isLocalDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):(8080|8081|5173)$/.test(origin || '');
  const isLanDevOrigin = /^http:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):(8080|8081|5173)$/.test(origin || '');

  if (origin && (allowedOrigins.includes(origin) || isLocalDevOrigin || isLanDevOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

// Rate limiters for free tier protection
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute per IP
  message: { error: 'Too many uploads. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Allow health checks and retrieve to bypass
    return req.path === '/api/health';
  }
});

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
app.post('/api/upload', uploadLimiter, upload.array('files', 5), async (req, res) => {
  const b2FileIds = [];
  const tempFiles = [];
  
  try {
    const files = req.files;
    if (!files?.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    if (files.length > 5) {
      return res.status(400).json({ error: 'Max 5 files' });
    }

    const fileNames = [];
    const fileSizes = [];
    const mimeTypes = [];

    for (const file of files) {
      // Read file from disk
      const fileBuffer = fs.readFileSync(file.path);
      tempFiles.push(file.path); // Track for cleanup

      const safeMimeType = getSafeMimeType(file);
      const b2Result = await b2Upload(fileBuffer, file.originalname, safeMimeType);
      
      b2FileIds.push(b2Result.fileId);
      fileNames.push(file.originalname);
      fileSizes.push(file.size);
      mimeTypes.push(safeMimeType);
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
    console.error('Upload failed');
    
    // Cleanup orphan B2 files
    for (let i = 0; i < b2FileIds.length; i++) {
      b2Delete(b2FileIds[i], fileNames[i]).catch(() => console.error('Storage cleanup failed'));
    }
    
    // Clean error messages for clients
    const errorMessage = error.message.includes('Invalid file type')
      ? 'Invalid file type. Only PDF, DOC, DOCX, TXT, PNG, JPG allowed.'
      : error.message.includes('File too large')
      ? 'File exceeds 100MB limit'
      : error.message.includes('Metadata array mismatch')
      ? 'File processing error. Please try again.'
      : error.message.includes('Appwrite')
      ? 'Database error. Please try again.'
      : error.message.includes('Backblaze')
      ? 'Storage error. Please try again.'
      : 'Upload failed. Please try again.';
    
    res.status(400).json({ error: errorMessage });
  } finally {
    // Cleanup temp files
    for (const tempFile of tempFiles) {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.error('Temporary file cleanup failed');
      }
    }
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
        (async () => {
          for (let i = 0; i < numFiles; i++) {
            const buffer = await b2Download(b2FileIds[i]);
            zip.append(buffer, { name: fileNames[i] });
          }
          zip.finalize();
        })().catch(reject);
      });
      contentType = 'application/zip';
      filename = `secure-print-${otc}.zip`;
    }

    // Mark used
    await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collectionOTC, docId, {
      used: true,
      usedAt: new Date().toISOString(),
    });

    // Cleanup B2 files
    for (let i = 0; i < b2FileIds.length; i++) {
      await b2Delete(b2FileIds[i], fileNames[i]).catch(() => {
        console.error('Storage cleanup failed');
      });
    }
    await databases.deleteDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collectionOTC, docId);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': contentBuffer.length,
    });
    res.send(contentBuffer);
  } catch (error) {
    console.error('Retrieve failed');
    res.status(500).json({ error: 'Retrieve failed' });
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
      fileNames: doc.fileNames || [],
      totalFiles: doc.b2FileIds?.length || 0,
      totalSize: (doc.fileSizes || []).reduce((a, b) => a + b, 0),
      isBatch: (doc.b2FileIds?.length || 0) > 1,
      expiresAt: doc.expiresAt,
      error: doc.used ? 'OTC already used' : expired ? 'OTC expired' : null
    });
  } catch (error) {
    console.error('Validation failed');
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`SecurePrint backend listening on port ${port}`);
});

export default app;
