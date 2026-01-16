import { Client, Databases, Storage, Account } from 'appwrite';

const client = new Client();

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT || '');

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Appwrite Configuration
const APPWRITE_CONFIG = {
  databaseId: process.env.APPWRITE_DATABASE_ID || 'secure_print',
  collectionOTC: process.env.APPWRITE_COLLECTION_OTC || 'one_time_codes',
  collectionFiles: process.env.APPWRITE_COLLECTION_FILES || 'files',
  bucketId: process.env.APPWRITE_BUCKET_ID || 'secure_files',
};

export { client, account, databases, storage, APPWRITE_CONFIG };

