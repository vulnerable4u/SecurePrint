import 'dotenv/config';
import { Client, Databases, ID } from 'node-appwrite';

// Validate required environment variables
const requiredEnvVars = ['APPWRITE_PROJECT', 'APPWRITE_API_KEY', 'APPWRITE_ENDPOINT'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error('Service configuration is incomplete.');
}

const client = new Client();

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Appwrite Configuration with fallbacks
const APPWRITE_CONFIG = {
  databaseId: process.env.APPWRITE_DATABASE_ID || 'secure_print',
  collectionOTC: process.env.APPWRITE_COLLECTION_OTC || 'one_time_codes',
  collectionFiles: process.env.APPWRITE_COLLECTION_FILES || 'files',
};

export function createDatabases() {
  return { databases, APPWRITE_CONFIG };
}

export { databases, APPWRITE_CONFIG, ID };
