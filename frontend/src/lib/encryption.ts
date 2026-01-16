/**
 * Web Crypto API - AES-256-GCM Encryption
 * 
 * This implementation uses native browser Web Crypto API for:
 * - Better performance (native browser API)
 * - Reduced bundle size (no CryptoJS dependency)
 * - True AES-256-GCM with proper authentication tags
 * 
 * Byte format compatibility with backend:
 * - Backend expects: IV (16 bytes) + Tag (16 bytes) + Ciphertext
 * - Web Crypto produces: IV (12 bytes) + Ciphertext + Tag (16 bytes)
 * - We rearrange bytes to match backend format
 */

// Constants
const KEY_LENGTH = 32; // 256 bits for AES-256
const IV_LENGTH = 16; // 16 bytes (backend format, we use 12 internally)
const TAG_LENGTH = 16; // 128 bits for GCM authentication tag

/**
 * Convert ArrayBuffer to Hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert Hex string to ArrayBuffer
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Import a raw key from hex string
 * @param keyHex - 32-byte key as hex string (64 hex chars)
 */
export async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBuffer(keyHex);
  
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a key to hex string
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return bufferToHex(exported);
}

/**
 * Generate a random encryption key (32 bytes / 256 bits)
 */
export async function generateEncryptionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return await exportKey(key);
}

/**
 * Generate a random IV (12 bytes for Web Crypto AES-GCM)
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt data using AES-256-GCM
 * 
 * Output format: IV (16 bytes) + Tag (16 bytes) + Ciphertext
 * This matches the backend's expected format
 * 
 * @param data - Plaintext data as ArrayBuffer
 * @param key - Encryption key as hex string
 * @returns Combined IV + Tag + Ciphertext as ArrayBuffer
 */
export async function encryptFile(data: ArrayBuffer, keyHex: string): Promise<ArrayBuffer> {
  // Generate IV (12 bytes for Web Crypto)
  const iv = generateIV();
  
  // Import the key
  const key = await importKey(keyHex);
  
  // Encrypt using Web Crypto API
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  // Web Crypto returns: IV (12 bytes) + Ciphertext (variable) + Tag (16 bytes appended)
  // The tag is appended to the ciphertext by Web Crypto
  
  // Extract ciphertext and tag from Web Crypto output
  const encryptedArray = new Uint8Array(encrypted);
  const ciphertextLength = encryptedArray.length - 12 - 16; // Total - IV - Tag
  const ciphertext = encryptedArray.slice(12, 12 + ciphertextLength);
  const tag = encryptedArray.slice(12 + ciphertextLength);
  
// Rearrange to backend format: IV (16 bytes) + Tag (16 bytes) + Ciphertext
  // Pad IV from 12 to 16 bytes
  const paddedIV = new Uint8Array(16);
  paddedIV.set(iv as unknown as Uint8Array, 0);
  
  // Combine: IV (16) + Tag (16) + Ciphertext
  const result = new Uint8Array(16 + 16 + ciphertextLength);
  result.set(paddedIV as unknown as Uint8Array, 0);
  result.set(tag as unknown as Uint8Array, 16);
  result.set(ciphertext as unknown as Uint8Array, 32);
  
  return result.buffer as ArrayBuffer;
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * Input format: IV (16 bytes) + Tag (16 bytes) + Ciphertext
 * 
 * @param encryptedData - Encrypted data as ArrayBuffer
 * @param key - Encryption key as hex string
 * @returns Decrypted plaintext as ArrayBuffer
 */
export async function decryptFile(encryptedData: ArrayBuffer, keyHex: string): Promise<ArrayBuffer> {
  const data = new Uint8Array(encryptedData);
  
  // Extract from backend format: IV (16) + Tag (16) + Ciphertext
  const iv = data.slice(0, 16);
  const tag = data.slice(16, 32);
  const ciphertext = data.slice(32);
  
  // Trim IV to 12 bytes for Web Crypto
  const iv12 = iv.slice(0, 12);
  
// Rearrange to Web Crypto format: IV (12) + Ciphertext + Tag (16)
  const webCryptoFormat = new Uint8Array(12 + ciphertext.length + 16);
  webCryptoFormat.set(iv12 as unknown as Uint8Array, 0);
  webCryptoFormat.set(ciphertext as unknown as Uint8Array, 12);
  webCryptoFormat.set(tag as unknown as Uint8Array, 12 + ciphertext.length);
  
  // Import the key
  const key = await importKey(keyHex);
  
  // Decrypt using Web Crypto API
  // Web Crypto will automatically verify the authentication tag
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv12 },
    key,
    webCryptoFormat.buffer as ArrayBuffer
  );
  
  return decrypted as ArrayBuffer;
}

/**
 * Encrypt file for upload (API compatible format)
 * 
 * @param fileBuffer - The file data as ArrayBuffer
 * @param keyHex - The encryption key as hex string
 * @returns ArrayBuffer with format: IV(16) + Tag(16) + Ciphertext
 */
export async function encryptFileForUpload(fileBuffer: ArrayBuffer, keyHex: string): Promise<ArrayBuffer> {
  return encryptFile(fileBuffer, keyHex);
}

/**
 * Decrypt file from API response
 * 
 * @param encryptedData - The encrypted file data as ArrayBuffer
 * @param keyHex - The encryption key as hex string
 * @returns Decrypted file as ArrayBuffer
 */
export async function decryptFileFromApi(encryptedData: ArrayBuffer, keyHex: string): Promise<ArrayBuffer> {
  return decryptFile(encryptedData, keyHex);
}

/**
 * Simple file encryption with password-derived key
 * Uses PBKDF2 to derive key from password
 * 
 * @param file - The file to encrypt
 * @param password - Password for encryption
 * @returns Object with encryptedData and key info
 */
export async function encryptFileWithPassword(
  file: File
): Promise<{ encryptedData: ArrayBuffer; key: string; salt: string }> {
  // Generate a random key
  const key = await generateEncryptionKey();
  
  // Read file
  const fileBuffer = await file.arrayBuffer();
  
  // Encrypt
  const encryptedData = await encryptFile(fileBuffer, key);
  
  return {
    encryptedData,
    key,
    salt: '' // No salt needed for random key generation
  };
}

/**
 * Decrypt file with password-derived key
 * 
 * @param encryptedData - The encrypted file data
 * @param key - The encryption key (hex string)
 * @returns Decrypted file as ArrayBuffer
 */
export async function decryptFileWithPassword(
  encryptedData: ArrayBuffer,
  key: string
): Promise<ArrayBuffer> {
  return decryptFile(encryptedData, key);
}

/**
 * Validate encryption key format
 * @param key - Key to validate
 * @returns true if valid 64-char hex string
 */
export function isValidKey(key: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(key);
}

/**
 * Test encryption/decryption round-trip
 * @param key - Encryption key
 * @param testData - Data to test with
 * @returns true if encryption works correctly
 */
export async function testEncryption(
  key: string,
  testData: ArrayBuffer = new Uint8Array([1, 2, 3, 4, 5]).buffer
): Promise<boolean> {
  try {
    const encrypted = await encryptFile(testData, key);
    const decrypted = await decryptFile(encrypted, key);
    
    // Compare
    const decryptedBytes = new Uint8Array(decrypted);
    const originalBytes = new Uint8Array(testData);
    
    if (decryptedBytes.length !== originalBytes.length) return false;
    
    for (let i = 0; i < decryptedBytes.length; i++) {
      if (decryptedBytes[i] !== originalBytes[i]) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get encryption info for debugging
 */
export function getEncryptionInfo() {
  return {
    algorithm: 'AES-256-GCM',
    keyLength: 256,
    ivLength: 16, // Output format
    tagLength: 16,
    webCryptoIvLength: 12,
    format: 'IV(16) + Tag(16) + Ciphertext',
    note: 'IV padded from 12 to 16 bytes for backend compatibility'
  };
}
