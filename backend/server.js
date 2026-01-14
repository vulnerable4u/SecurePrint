const cors = require('cors');
const multer = require('multer');
const { db } = require('./firebaseAdmin');
const { v4: uuidv4 } = require('uuid');
const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');
const streamifier = require('streamifier');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3001;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
=======
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { db, bucket } = require('./firebaseAdmin');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3001;

// Encryption helper functions
const algorithm = 'aes-256-cbc';
const keyLength = 32; // 256 bits

function generateEncryptionKey() {
  return crypto.randomBytes(keyLength);
}

function encryptBuffer(buffer, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { encrypted, iv: iv.toString('hex') };
}

function decryptBuffer(encryptedBuffer, key, iv) {
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted;
}
