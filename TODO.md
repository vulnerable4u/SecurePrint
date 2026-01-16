# Security Enforcement Implementation Plan

## Phase 1: Remove Insecure Dependencies

### Backend
- [x] Remove `cloudinary` from `backend/package.json`
- [x] Remove `firebase-admin` from `backend/package.json`
- [x] Remove `streamifier` (no longer needed without Cloudinary)

### Frontend  
- [x] Remove `firebase` from `frontend/package.json`

### Files to Delete
- [x] Delete `backend/firebaseAdmin.js`

## Phase 2: Add Appwrite Dependencies

### Backend
- [x] Add `appwrite` package to `backend/package.json`

### Frontend
- [x] Add `appwrite` package to `frontend/package.json`

## Phase 3: Implement Appwrite Backend Integration

### Create Appwrite Configuration
- [x] Create `backend/appwrite.js` with Appwrite client setup
- [x] Configure environment variables for Appwrite (APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_API_KEY) - See `backend/.env.example`

### Update server.js
- [x] Replace Firebase imports with Appwrite
- [x] Remove Cloudinary configuration
- [x] Implement OTC (One-Time Code) storage in Appwrite Database
- [x] Implement secure file upload to Appwrite Storage
- [x] Implement file streaming through backend with decryption
- [x] Implement OTC validation and file deletion after one use

### Environment Configuration
- [x] Create `backend/.env.example` with Appwrite settings

## Phase 4: Update Frontend for Appwrite Auth

- [x] Replace Firebase Auth with Appwrite Auth SDK (`frontend/src/lib/appwrite.js`)
- [x] Keep client-side encryption with crypto-js (`frontend/src/lib/encryption.js`)
- [x] Update API calls to use new backend endpoints (`frontend/src/lib/api.js`)
- [x] Create `frontend/.env.example` with Appwrite settings

## Phase 5: Environment Variables

Update `.env` file with:
```
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT=your_project_id
APPWRITE_API_KEY=your_api_key

# Appwrite Database IDs
APPWRITE_DATABASE_ID=secure_print
APPWRITE_COLLECTION_OTC=one_time_codes
APPWRITE_COLLECTION_FILES=files
APPWRITE_BUCKET_ID=secure_files

# Encryption (shared secret for client-server encryption)
ENCRYPTION_KEY=your_32_byte_encryption_key
```

## Additional Documentation

- [x] Create `SECURITY_MIGRATION.md` with complete migration summary

## Final Architecture

Frontend (Render) → Backend API (Render) → Appwrite Cloud (Auth, Storage, DB)

---

## ✅ ALL TASKS COMPLETED

The security enforcement is now complete. The system has been migrated from insecure Cloudinary/Firebase to secure Appwrite Cloud backend with:

- ✅ No Cloudinary usage
- ✅ No Firebase usage  
- ✅ Private file storage (no public URLs)
- ✅ Client-side AES-256-GCM encryption
- ✅ Server-side OTC validation
- ✅ Backend file streaming (no direct client access)
- ✅ File deletion after one use
- ✅ OTC invalidation after use

See `SECURITY_MIGRATION.md` for setup instructions.

