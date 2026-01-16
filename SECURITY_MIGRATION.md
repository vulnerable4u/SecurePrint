# Security Migration Summary

This document outlines the security enforcement changes made to migrate from insecure services (Cloudinary, Firebase) to secure Appwrite Cloud backend.

## Changes Made

### 1. Removed Insecure Dependencies

**Backend (`backend/package.json`):**
- Removed `cloudinary` (public file access)
- Removed `firebase-admin` (client-side Firebase)
- Removed `streamifier` (no longer needed)

**Frontend (`frontend/package.json`):**
- Removed `firebase` client SDK

### 2. Deleted Insecure Files
- Deleted `backend/firebaseAdmin.js` - Firebase Admin SDK configuration

### 3. Added Appwrite Integration

**Backend Configuration (`backend/appwrite.js`):**
- Appwrite Client setup for Auth, Database, and Storage
- Configuration for database and bucket IDs

**Backend Server (`backend/server.js`):**
- Complete rewrite with secure file handling
- AES-256-GCM encryption for files
- OTC (One-Time Code) generation and validation
- File streaming through backend only
- Automatic file deletion after one use

**Frontend Libraries (`frontend/src/lib/`):**
- `appwrite.js` - Appwrite Auth integration
- `encryption.js` - Client-side file encryption
- `api.js` - Backend API communication

### 4. Environment Configuration

**Backend (`backend/.env.example`):**
```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=secure_print
APPWRITE_COLLECTION_OTC=one_time_codes
APPWRITE_BUCKET_ID=secure_files
ENCRYPTION_KEY=your_32_byte_key
```

**Frontend (`frontend/.env.example`):**
```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT=your_project_id
VITE_API_URL=http://localhost:3001
VITE_ENCRYPTION_KEY=your_32_byte_key
```

## New Secure Architecture

```
Frontend (Render) → Backend API (Render) → Appwrite Cloud (Auth, Storage, DB)
```

### Security Flow

1. **User Authentication:**
   - Users authenticate via Appwrite Auth
   - Session managed securely server-side

2. **File Upload:**
   - File is encrypted on client using AES-256-GCM
   - Encrypted file uploaded to Appwrite Storage (private bucket)
   - OTC + metadata stored in Appwrite Database
   - User receives OTC code to share

3. **File Retrieval:**
   - Shopkeeper submits OTC code
   - Backend validates OTC (server-side only)
   - Backend downloads encrypted file from Appwrite Storage
   - Backend decrypts file in memory
   - File streamed directly to print (no direct URL to client)
   - File deleted from storage after one use
   - OTC invalidated

## Appwrite Console Setup

1. **Create Project:**
   - Go to https://cloud.appwrite.io/
   - Create new project

2. **Create Database:**
   - Database ID: `secure_print`
   - Collection: `one_time_codes`
     - Attributes: otc (string), fileId (string), fileName (string), fileSize (integer), mimeType (string), createdAt (datetime), used (boolean), userId (string)

3. **Create Storage Bucket:**
   - Bucket ID: `secure_files`
   - **IMPORTANT:** Set bucket to PRIVATE (not public)
   - No read permissions for "All Users" or "Guests"

4. **Create API Key:**
   - Go to Project Settings → API Keys
   - Create new key with permissions:
     - databases.read, databases.write
     - storage.read, storage.write, storage.delete

## Testing

1. Copy `backend/.env.example` to `backend/.env`
2. Copy `frontend/.env.example` to `frontend/.env`
3. Configure all values in both files
4. Start backend: `cd backend && npm run dev`
5. Install frontend deps: `cd frontend && npm install`
6. Start frontend: `cd frontend && npm run dev`

## Security Checklist

- [x] Cloudinary completely removed
- [x] Firebase completely removed
- [x] Files never publicly accessible (Appwrite bucket is private)
- [x] No direct file URLs returned to clients
- [x] Client-side encryption (AES-256-GCM)
- [x] OTC stored and validated server-side only
- [x] Files streamed through backend
- [x] Files deleted after one use
- [x] OTC invalidated after use

