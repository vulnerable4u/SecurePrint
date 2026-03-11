
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API Service for Secure Print Backend
 * Uses Backblaze B2 for file storage and Appwrite for database
 */

/**
 * Upload multiple files for secure printing with progress tracking
 * @param {File[]} files - Array of files to upload
 * @param {string} userId - Optional user ID
 * @param {function} onProgress - Callback for progress updates (fileIndex, progress 0-100)
 * @returns {Promise<Object>} - { success, results: [{otc, fileId, fileName}], error? }
 */
export async function uploadFiles(files, userId = 'anonymous', onProgress = null) {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('fileName', file.name);
      formData.append('mimeType', file.type);
      formData.append('batchId', `batch_${Date.now()}`);
      formData.append('fileIndex', i.toString());
      
      // Upload with progress tracking using XMLHttpRequest
      const result = await uploadWithProgress(formData, (progress) => {
        if (onProgress) {
          onProgress(i, progress);
        }
      });
      
      results.push({
        success: true,
        otc: result.otc,
        fileId: result.fileId,
        fileName: file.name
      });
    } catch (error) {
      results.push({
        success: false,
        fileName: file.name,
        error: error.message
      });
    }
  }
  
  const allSuccessful = results.every(r => r.success);
  return {
    success: allSuccessful,
    results,
    error: allSuccessful ? null : 'Some files failed to upload'
  };
}

/**
 * Upload a single file with XMLHttpRequest for progress tracking
 * @param {FormData} formData - The form data to send
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Object>}
 */
function uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid response'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });
    
    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.send(formData);
  });
}

/**
 * Upload a file for secure printing (legacy single file version)
 * @param {File} file - The file to upload
 * @param {string} encryptionKey - Parameter kept for API compatibility (not used)
 * @param {string} userId - Optional user ID
 * @returns {Promise<Object>} - { success, otc, fileId, message }
 */
export async function uploadFile(file, encryptionKey, userId = 'anonymous') {
  return uploadFiles([file], userId).then(result => {
    if (result.results[0]) {
      return {
        success: result.results[0].success,
        otc: result.results[0].otc,
        fileId: result.results[0].fileId,
        error: result.results[0].error
      };
    }
    return { success: false, error: 'No result' };
  });
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
 * Retrieve a file using an OTC
 * @param {string} otc - The One-Time Code
 * @param {string} encryptionKey - Parameter kept for API compatibility (not used)
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
    
    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = 'downloaded-file';
    if (contentDisposition && contentDisposition.includes('filename=')) {
      fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
    }
    
    const mimeType = fileBlob.type || 'application/octet-stream';
    
    return {
      success: true,
      file: fileBlob,
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

