// Appwrite Client Configuration for Frontend
import { Client, Account } from 'appwrite';

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT || '');

export const account = new Account(client);

export { client };

// Auth functions
export async function login(email, password) {
  try {
    const session = await account.createEmailSession(email, password);
    return { success: true, session };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function register(email, password, name) {
  try {
    const user = await account.create('unique()', email, password, name);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logout() {
  try {
    await account.deleteSession('current');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getCurrentUser() {
  try {
    const user = await account.get();
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function isLoggedIn() {
  try {
    await account.get();
    return true;
  } catch {
    return false;
  }
}

