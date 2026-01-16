import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Appwrite imports
import { client, databases, storage, APPWRITE_CONFIG } from './appwrite.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3001;

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : crypto.randomBytes(KEY_LENGTH);

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Generate OTC (One-Time Code)
function generateOTC() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Encrypt buffer (for file upload)
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Return combined buffer: iv + tag + encrypted
  return Buffer.concat([iv, tag, encrypted]);
}

// Helper: Decrypt buffer (for file retrieval)
function decryptBuffer(encryptedBuffer) {
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// API Routes

/**
 * POST /api/upload
 * Upload encrypted file with OTC generation
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = uuidv4();
    const otc = generateOTC();

    // Encrypt the file buffer
    const encryptedBuffer = encryptBuffer(req.file.buffer);

    // Upload encrypted file to Appwrite Storage
    const uploadResult = await storage.createFile(
      APPWRITE_CONFIG.bucketId,
      fileId,
      encryptedBuffer,
      [
        // Make file private (no public access)
        'private'
      ]
    );

    // Store OTC and metadata in Appwrite Database
    const otcDocument = await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collectionOTC,
      uuidv4(),
      {
        otc: otc,
        fileId: fileId,
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
      message: 'File uploaded successfully. Share the OTC code for one-time access.'
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
        `otc.equal("${otc}")`
      ]
    );

    if (response.documents.length === 0) {
      return res.status(404).json({ error: 'Invalid OTC code' });
    }

    const doc = response.documents[0];

    if (doc.used) {
      return res.status(410).json({ error: 'OTC code has already been used' });
    }

    // Download encrypted file from Appwrite Storage
    const fileBuffer = await storage.getFile(
      APPWRITE_CONFIG.bucketId,
      doc.fileId
    );

    // Get file content as buffer
    let encryptedBuffer;
    if (Buffer.isBuffer(fileBuffer)) {
      encryptedBuffer = fileBuffer;
    } else if (fileBuffer.buffer) {
      encryptedBuffer = Buffer.from(fileBuffer.buffer);
    } else {
      // Handle different response formats
      encryptedBuffer = Buffer.from(JSON.stringify(fileBuffer));
    }

    // Decrypt the file
    const decryptedBuffer = decryptBuffer(encryptedBuffer);

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

    // Delete file from storage after one use
    try {
      await storage.deleteFile(APPWRITE_CONFIG.bucketId, doc.fileId);
    } catch (deleteError) {
      console.error('Failed to delete file:', deleteError);
      // Continue even if delete fails - the OTC is already invalidated
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
    res.setHeader('Content-Length', decryptedBuffer.length);
    res.send(decryptedBuffer);
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
        `otc.equal("${otc}")`
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
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`Secure Print Backend running on port ${port}`);
  console.log('Appwrite Configuration:');
  console.log(`  - Endpoint: ${process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'}`);
  console.log(`  - Project: ${process.env.APPWRITE_PROJECT || 'Not configured'}`);
  console.log(`  - Database: ${APPWRITE_CONFIG.databaseId}`);
  console.log(`  - Bucket: ${APPWRITE_CONFIG.bucketId}`);
});

export default app;

