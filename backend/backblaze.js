import 'dotenv/config';
import B2 from 'backblaze-b2';

/**
 * Backblaze B2 Cloud Storage Service
 * Handles file uploads, downloads, and deletions
 */

// Initialize B2 client
const b2 = new B2({
  applicationKeyId: process.env.BACKBLAZE_KEY_ID || '',
  applicationKey: process.env.BACKBLAZE_APPLICATION_KEY || ''
});

// Bucket configuration
const BUCKET_ID = process.env.BACKBLAZE_BUCKET_ID || '';

// Authenticate and get authorization
let authPromise = null;

async function getAuth() {
  // If we already have a valid auth, this will be resolved
  if (!authPromise) {
    authPromise = b2.authorize();
  }
  return authPromise;
}

/**
 * Upload a file to Backblaze B2
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - The file name (UUID)
 * @param {string} mimeType - The MIME type of the file
 * @returns {Promise<Object>} - { fileId, fileName }
 */
export async function uploadFile(fileBuffer, fileName, mimeType = 'application/octet-stream') {
  try {
    await getAuth();

    // Get upload URL first
    const uploadUrlResponse = await b2.getUploadUrl({
      bucketId: BUCKET_ID
    });

    // Upload the file using the returned URL and auth token
    const response = await b2.uploadFile({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      uploadAuthToken: uploadUrlResponse.data.authorizationToken,
      fileName: fileName,
      data: fileBuffer,
      mimeType: mimeType
    });

    return {
      fileId: response.data.fileId,
      fileName: response.data.fileName
    };
  } catch (error) {
    console.error('Backblaze upload error:', error);
    throw new Error(`Failed to upload to Backblaze: ${error.message}`);
  }
}

/**
 * Download a file from Backblaze B2
 * @param {string} fileId - The file ID (stored in Appwrite)
 * @param {string} fileName - Optional file name to download by name instead
 * @returns {Promise<Buffer>} - The file buffer
 */
export async function downloadFile(fileId, fileName) {
  try {
    await getAuth();

    let response;
    
    // If we have a fileName, download by name (more reliable)
    if (fileName) {
      response = await b2.downloadFileByName({
        bucketName: process.env.BACKBLAZE_BUCKET_NAME || 'secureprint-files',
        fileName: fileName
      });
    } else {
      // Otherwise try by ID
      response = await b2.downloadFileById({
        bucketId: BUCKET_ID,
        fileId: fileId
      });
    }

    // Get the data as buffer
    // The response.data can be a Readable stream or a Buffer
    if (Buffer.isBuffer(response.data)) {
      return response.data;
    }
    
    // If it's a stream, collect the chunks
    const chunks = [];
    for await (const chunk of response.data) {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Backblaze download error:', error);
    throw new Error(`Failed to download from Backblaze: ${error.message}`);
  }
}

/**
 * Delete a file from Backblaze B2
 * @param {string} fileIdOrName - The file ID or file name to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(fileIdOrName) {
  try {
    await getAuth();

    // Try to delete by filename first (most common case)
    try {
      await b2.deleteFileVersion({
        fileName: fileIdOrName,
        bucketId: BUCKET_ID
      });
      console.log(`File ${fileIdOrName} deleted from Backblaze B2`);
      return;
    } catch (e) {
      // If that fails, try by fileId
      await b2.deleteFileVersion({
        fileId: fileIdOrName,
        bucketId: BUCKET_ID
      });
      console.log(`File ${fileIdOrName} deleted from Backblaze B2`);
    }
  } catch (error) {
    console.error('Backblaze delete error:', error);
    // Don't throw - file deletion failure shouldn't block the retrieval flow
  }
}

/**
 * Get pre-signed upload URL for direct-to-B2 uploads
 * Frontend can use this to upload files directly to Backblaze B2
 * @returns {Promise<Object>} - { uploadUrl, authorizationToken, bucketId }
 */
export async function getUploadUrl() {
  try {
    await getAuth();

    const response = await b2.getUploadUrl({
      bucketId: BUCKET_ID
    });

    return {
      uploadUrl: response.data.uploadUrl,
      authorizationToken: response.data.authorizationToken,
      bucketId: BUCKET_ID
    };
  } catch (error) {
    console.error('Backblaze getUploadUrl error:', error);
    throw new Error(`Failed to get upload URL: ${error.message}`);
  }
}

export default {
  uploadFile,
  downloadFile,
  deleteFile,
  getUploadUrl
};
