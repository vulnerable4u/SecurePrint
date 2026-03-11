
import dotenv from 'dotenv';

// Load environment variables from .env file FIRST
dotenv.config();

// Backblaze imports
import { uploadFile as b2Upload, downloadFile as b2Download, deleteFile as b2Delete, getUploadUrl } from './backblaze.js';

// Appwrite imports (only databases for metadata)
import { databases, APPWRITE_CONFIG } from './appwrite.js';
import { Query } from 'node-appwrite';

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 3001;

// Configure multer with security limits
const ALLOWED_MIME_TYPES = [
  'application/pdf',                                      // PDF
  'application/msword',                                   // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain',                                           // TXT
  'image/png',                                            // PNG
  'image/jpeg',                                           // JPG/JPEG
  'application/vnd.openxmlformats-officedocument.presentationml.presentation' // PPTX
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Generate OTC (One-Time Code)
function generateOTC() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// API Routes

/**
 * POST /api/upload
 * Upload file with OTC generation
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = uuidv4();
    const otc = generateOTC();

    // Upload file directly to Backblaze B2 (no encryption)
    // Note: fileId here is used as the filename in Backblaze
    const b2Result = await b2Upload(req.file.buffer, fileId, req.file.mimetype);

    // Store OTC and metadata in Appwrite Database
    // We store the fileId (UUID) as filename reference and the B2 fileId for retrieval
    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      uuidv4(),
      {
        otc: otc,
        fileId: fileId,  // This is the filename in B2
        b2FileId: b2Result.fileId,  // This is the actual B2 file ID
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        createdAt: new Date().toISOString(),
        used: false,
        userId: req.body.userId || 'anonymous'
      }
    );

    res.json({
      success: true,
      otc: otc,
      fileId: fileId,
      message: 'File uploaded securely. Share the OTC code for one-time access.'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

/**
 * POST /api/retrieve
 * Validate OTC and retrieve file (one-time use only)
 */
app.post('/api/retrieve', async (req, res) => {
  try {
    const { otc } = req.body;

    if (!otc) {
      return res.status(400).json({ error: 'OTC is required' });
    }

    // Query Appwrite Database for the OTC
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      [
        Query.equal('otc', [otc])
      ]
    );

    if (response.documents.length === 0) {
      return res.status(404).json({ error: 'Invalid OTC code' });
    }

    const doc = response.documents[0];

    if (doc.used) {
      return res.status(410).json({ error: 'OTC code has already been used' });
    }

    // Download file from Backblaze B2
    // Use fileId as filename since that's what we stored in B2
    const fileBuffer = await b2Download(null, doc.fileId);

    // Mark OTC as used
    await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      doc.$id,
      {
        used: true,
        usedAt: new Date().toISOString()
      }
    );

    // Delete file from Backblaze B2 after one use
    try {
      await b2Delete(doc.fileId);
    } catch (deleteError) {
      console.error('Failed to delete file:', deleteError);
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Retrieve error:', error);
    res.status(500).json({ error: 'Failed to retrieve file', details: error.message });
  }
});

/**
 * POST /api/validate-otc
 * Check if OTC is valid (without retrieving file)
 */
app.post('/api/validate-otc', async (req, res) => {
  try {
    const { otc } = req.body;

    if (!otc) {
      return res.status(400).json({ error: 'OTC is required' });
    }

    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      [
        Query.equal('otc', [otc])
      ]
    );

    if (response.documents.length === 0) {
      return res.status(404).json({ valid: false, error: 'Invalid OTC code' });
    }

    const doc = response.documents[0];

    res.json({
      valid: !doc.used,
      fileName: doc.used ? null : doc.fileName,
      fileSize: doc.used ? null : doc.fileSize,
      mimeType: doc.used ? null : doc.mimeType,
      createdAt: doc.createdAt,
      alreadyUsed: doc.used
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

/**
 * POST /api/upload-url
 * Get pre-signed upload URL for direct-to-B2 uploads (scalability improvement)
 * Frontend uploads directly to Backblaze, bypassing the backend server
 */
app.post('/api/upload-url', async (req, res) => {
  try {
    const { fileName, mimeType, fileSize, userId } = req.body;

    if (!fileName || !mimeType || !fileSize) {
      return res.status(400).json({ error: 'Missing required fields: fileName, mimeType, fileSize' });
    }

    // Validate file size on server side too
    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Get pre-signed upload URL from Backblaze
    const uploadUrlData = await getUploadUrl();

    // Generate fileId and OTC
    const fileId = uuidv4();
    const otc = generateOTC();

    // Store metadata in Appwrite (but NOT the file yet - waiting for upload)
    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      uuidv4(),
      {
        otc: otc,
        fileId: fileId,
        b2FileId: '', // Will be updated after direct upload
        fileName: fileName,
        fileSize: fileSize,
        mimeType: mimeType,
        createdAt: new Date().toISOString(),
        used: false,
        userId: userId || 'anonymous',
        uploadPending: true // Flag to track if direct upload completed
      }
    );

    res.json({
      success: true,
      uploadUrl: uploadUrlData.uploadUrl,
      authorizationToken: uploadUrlData.authorizationToken,
      fileId: fileId,
      otc: otc,
      message: 'Upload URL generated. Upload file directly to Backblaze B2, then confirm with /api/upload-complete'
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL', details: error.message });
  }
});

/**
 * POST /api/upload-complete
 * Confirm direct upload to B2 and finalize the record
 */
app.post('/api/upload-complete', async (req, res) => {
  try {
    const { fileId, b2FileId, otc } = req.body;

    if (!fileId || !b2FileId || !otc) {
      return res.status(400).json({ error: 'Missing required fields: fileId, b2FileId, otc' });
    }

    // Find and update the record
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      [
        Query.equal('otc', [otc]),
        Query.equal('fileId', [fileId])
      ]
    );

    if (response.documents.length === 0) {
      return res.status(404).json({ error: 'Upload record not found' });
    }

    const doc = response.documents[0];

    // Update with B2 file ID
    await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      doc.$id,
      {
        b2FileId: b2FileId,
        uploadPending: false
      }
    );

    res.json({
      success: true,
      otc: otc,
      message: 'File uploaded successfully. Share the OTC code for one-time access.'
    });
  } catch (error) {
    console.error('Upload complete error:', error);
    res.status(500).json({ error: 'Failed to confirm upload', details: error.message });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`Secure Print Backend running on port ${port}`);
  console.log('Appwrite Configuration (Database):');
  console.log(`  - Endpoint: ${process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'}`);
  console.log(`  - Project: ${process.env.APPWRITE_PROJECT || 'Not configured'}`);
  console.log(`  - Database: ${APPWRITE_CONFIG.databaseId}`);
  console.log('Backblaze B2 Configuration (File Storage):');
  console.log(`  - Bucket ID: ${process.env.BACKBLAZE_BUCKET_ID || 'Not configured'}`);
});

export default app;

