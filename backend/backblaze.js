import B2 from 'backblaze-b2';

let KEY_ID, APP_KEY, BUCKET_ID, BUCKET_NAME;
let b2;

function initBackblaze() {
  KEY_ID = process.env.BACKBLAZE_KEY_ID;
  APP_KEY = process.env.BACKBLAZE_APPLICATION_KEY;
  BUCKET_ID = process.env.BACKBLAZE_BUCKET_ID;
  BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME;

  // Validate required environment variables
  if (!KEY_ID || !APP_KEY || !BUCKET_ID) {
    console.error('❌ Backblaze configuration missing:');
    console.error(`   BACKBLAZE_KEY_ID: ${KEY_ID ? '✅ Set' : '❌ Missing'}`);
    console.error(`   BACKBLAZE_APPLICATION_KEY: ${APP_KEY ? '✅ Set' : '❌ Missing'}`);
    console.error(`   BACKBLAZE_BUCKET_ID: ${BUCKET_ID ? '✅ Set' : '❌ Missing'}`);
    console.error(`   BACKBLAZE_BUCKET_NAME: ${BUCKET_NAME ? '✅ Set' : '❌ Optional'}`);
    throw new Error('Backblaze configuration incomplete. Check your .env file.');
  }

  console.log('🔧 Backblaze configuration loaded');

  b2 = new B2({
    applicationKeyId: KEY_ID,
    applicationKey: APP_KEY
  });
}

let authToken = null;
let authExpiresAt = 0;

async function authorize() {
  if (!b2) initBackblaze();
  
  try {
    console.log('🔐 Authorizing with Backblaze...');
    const res = await b2.authorize();
    authToken = res.data.authorizationToken;
    authExpiresAt = Date.now() + 1000 * 60 * 60;
    console.log('✅ Backblaze authorization successful');
  } catch (error) {
    console.error('❌ Backblaze authorization failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      throw new Error('Invalid Backblaze credentials. Check BACKBLAZE_KEY_ID and BACKBLAZE_APPLICATION_KEY.');
    } else if (error.response?.status === 403) {
      throw new Error('Backblaze access forbidden. Check bucket permissions and application key restrictions.');
    } else {
      throw new Error(`Backblaze authentication failed: ${error.message}`);
    }
  }
}

async function ensureAuth() {
  if (!authToken || Date.now() >= authExpiresAt) {
    await authorize();
  }
}

async function uploadFile(fileBuffer, fileName, mimeType = 'application/octet-stream') {
  await ensureAuth();

  const uploadUrlResponse = await b2.getUploadUrl({ bucketId: BUCKET_ID });

  const response = await b2.uploadFile({
    uploadUrl: uploadUrlResponse.data.uploadUrl,
    uploadAuthToken: uploadUrlResponse.data.authorizationToken,
    fileName,
    data: fileBuffer,
    mimeType
  });

  return {
    fileId: response.data.fileId,
    fileName: response.data.fileName
  };
}

async function downloadFile(fileId, fileName) {
  await ensureAuth();

  let response;

  if (fileName && BUCKET_NAME) {
    response = await b2.downloadFileByName({
      bucketName: BUCKET_NAME,
      fileName
    });
  } else {
    response = await b2.downloadFileById({
      bucketId: BUCKET_ID,
      fileId
    });
  }

  if (Buffer.isBuffer(response.data)) return response.data;

  const chunks = [];
  for await (const chunk of response.data) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

async function deleteFile(fileId, fileName) {
  await ensureAuth();

  try {
    return await b2.deleteFileVersion({ fileId, fileName });
  } catch (error) {
    if (error?.statusCode === 404 || error?.message?.includes('not found')) {
      return { alreadyDeleted: true };
    }
    throw error;
  }
}

async function getUploadUrl() {
  await ensureAuth();

  const response = await b2.getUploadUrl({ bucketId: BUCKET_ID });

  return {
    uploadUrl: response.data.uploadUrl,
    authorizationToken: response.data.authorizationToken,
    bucketId: BUCKET_ID
  };
}

export {
  uploadFile,
  downloadFile,
  deleteFile,
  getUploadUrl
};
