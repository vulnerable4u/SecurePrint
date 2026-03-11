import 'dotenv/config';
import { Client, Databases } from 'node-appwrite';

const client = new Client();

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

// Appwrite Configuration
const APPWRITE_CONFIG = {
  databaseId: process.env.APPWRITE_DATABASE_ID || 'secure_print',
  collectionOTC: process.env.APPWRITE_COLLECTION_OTC || 'one_time_codes',
  collectionFiles: process.env.APPWRITE_COLLECTION_FILES || 'files',
};

export { databases, APPWRITE_CONFIG };

