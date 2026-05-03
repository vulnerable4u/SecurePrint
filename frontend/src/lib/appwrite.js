// Appwrite Client Configuration for Frontend
import { Client, Account } from 'appwrite';

const client = new Client();

client
.setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT || '');

export const account = new Account(client);

export { client };

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function getNetworkErrorMessage(error) {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  if (error.message === 'Network request failed' && currentHost && !isLoopbackHost(currentHost)) {
    return 'Unable to connect to the authentication service. Please try again from the configured app URL.';
  }

  return error.message;
}

// Auth functions
export async function login(email, password) {
  try {
    const session = await account.createEmailSession(email, password);
    return { success: true, session };
  } catch (error) {
    return { success: false, error: getNetworkErrorMessage(error) };
  }
}

export async function register(email, password, name) {
  try {
    const user = await account.create('unique()', email, password, name);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: getNetworkErrorMessage(error) };
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

export async function updateName(name) {
  try {
    const user = await account.updateName(name);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updatePassword(newPassword, oldPassword) {
  try {
    const user = await account.updatePassword(newPassword, oldPassword);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateEmail(email, password) {
  try {
    const user = await account.updateEmail(email, password);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
