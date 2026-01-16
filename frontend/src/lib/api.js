const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API Service for Secure Print Backend
 */

/**
 * Upload a file for secure printing
 * @param {File} file - The file to upload
 * @param {string} encryptionKey - The encryption key (hex string)
 * @param {string} userId - Optional user ID
 * @returns {Promise<Object>} - { success, otc, fileId, message }
 */
export async function uploadFile(file, encryptionKey, userId = 'anonymous') {
  try {
    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    // Encrypt the file
    const encryptedData = await encryptFileForUpload(fileBuffer, encryptionKey);
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', new Blob([encryptedData]), file.name);
    formData.append('userId', userId);
    formData.append('fileName', file.name);
    formData.append('mimeType', file.type);
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    
    return { success: true, ...data };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate an OTC code without retrieving the file
 * @param {string} otc - The One-Time Code
 * @returns {Promise<Object>} - { valid, fileName, fileSize, mimeType, alreadyUsed }
 */
export async function validateOTC(otc) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/validate-otc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ otc })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Validation failed');
    }
    
    return data;
  } catch (error) {
    console.error('Validation error:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Retrieve and decrypt a file using an OTC
 * @param {string} otc - The One-Time Code
 * @param {string} encryptionKey - The encryption key (hex string)
 * @returns {Promise<Object>} - { success, file, fileName, mimeType } or { success: false, error }
 */
export async function retrieveFile(otc, encryptionKey) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ otc })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Retrieval failed');
    }
    
    // Get file blob
    const fileBlob = await response.blob();
    const fileArrayBuffer = await fileBlob.arrayBuffer();
    
    // Decrypt the file
    const decryptedData = decryptFile(fileArrayBuffer, encryptionKey);
    
    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = 'downloaded-file';
    if (contentDisposition && contentDisposition.includes('filename=')) {
      fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
    }
    
    const mimeType = fileBlob.type || 'application/octet-stream';
    
    return {
      success: true,
      file: new Blob([decryptedData], { type: mimeType }),
      fileName,
      mimeType
    };
  } catch (error) {
    console.error('Retrieve error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Health check for the backend
 * @returns {Promise<Object>} - { status, timestamp }
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Health check error:', error);
    return { status: 'unhealthy', error: error.message };
  }
}

// Import encryption functions
import { encryptFileForUpload, decryptFile } from './encryption.js';

