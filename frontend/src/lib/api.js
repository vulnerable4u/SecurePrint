
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * API Service for Secure Print Backend
 * Uses Backblaze B2 for file storage and Appwrite for database
 */

/**
 * Upload batch of files under single OTC with total progress
 * @param {File[]} files - Array of files to upload
 * @param {string} [userId='anonymous'] - Optional user ID
 * @param {(progress: number) => void} [onProgress=null] - Callback for progress updates (0-100)
 * @returns {Promise<{success: boolean, otc: string, files: number}>}
 */
export async function uploadBatchFiles(files, userId = 'anonymous', onProgress = null) {
  console.log('🔧 uploadBatchFiles called with:', { filesCount: files.length, userId });
  
  const formData = new FormData();
  files.forEach(file => {
    console.log('📎 Adding file to FormData:', file.name, file.size, file.type);
    formData.append('files', file);
  });
  formData.append('userId', userId);

  console.log('🌐 API_BASE_URL:', import.meta.env.VITE_API_URL);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      console.log('📥 XHR load event:', {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText
      });
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('✅ Parsed response data:', data);
          resolve(data);
        } catch (e) {
          console.error('❌ JSON parse error:', e);
          reject(new Error('Invalid response format from server'));
        }
      } else if (xhr.status === 413) {
        console.error('❌ File too large error');
        reject(new Error('File too large'));
      } else if (xhr.status === 400) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.error('❌ Validation error:', data);
          reject(new Error(data.error || 'Validation failed'));
        } catch {
          console.error('❌ Validation error - invalid JSON');
          reject(new Error('Upload validation failed'));
        }
      } else {
        console.error('❌ Upload failed with status:', xhr.status, xhr.responseText);
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', (e) => {
      console.error('❌ XHR error event:', e);
      reject(new Error('Network error'));
    });
    xhr.addEventListener('abort', (e) => {
      console.error('❌ XHR abort event:', e);
      reject(new Error('Upload cancelled'));
    });
    
    const uploadUrl = `${API_BASE_URL}/upload`;
    console.log('🚀 Opening XHR request to:', uploadUrl);
    xhr.open('POST', uploadUrl);
    
    console.log('📤 Sending XHR request...');
    xhr.send(formData);
  });
}

/**
 * Legacy multi-file (kept for compatibility)
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
    
    xhr.open('POST', `${API_BASE_URL}/upload`);
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
    const response = await fetch(`${API_BASE_URL}/validate-otc`, {
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
    const response = await fetch(`${API_BASE_URL}/retrieve`, {
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
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Health check error:', error);
    return { status: 'unhealthy', error: error.message };
  }
}

