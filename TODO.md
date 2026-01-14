# SecurePrint Security Enhancement Checklist

## Current State Analysis
- Backend uses Cloudinary for file storage
- OTC codes are generated and returned to client
- Files are accessible via direct Cloudinary URLs
- No client-side encryption implemented

## Required Security Enhancements

### 1. Remove Cloudinary
- [ ] Remove Cloudinary dependencies from backend/package.json
- [ ] Remove Cloudinary configuration from backend/server.js
- [ ] Remove Cloudinary upload logic

### 2. Disable and remove firebase storage & Enable Appwrite Storage
- [ ] Add Appwrite Storage SDK to backend dependencies
- [ ] Initialize Appwrite Storage in backend
- [ ] Implement Appwrite Storage upload functionality
- [ ] Update file upload endpoint to use Appwrite Storage

### 3. Apply Secure Rules
- [ ] Create Storage security rules file
- [ ] Implement rules to deny all direct access (backend-only access)

### 4. Client-side Encryption Implementation
- [ ] Add crypto-js or similar encryption library to frontend
- [ ] Implement file encryption before upload in UploadArea.tsx
- [ ] Generate encryption keys client-side
- [ ] Send encrypted files to backend

### 5. Server-side OTC Storage
- [ ] Modify OTC generation to store OTC server-side only
- [ ] Remove OTC from API responses to client
- [ ] Implement OTC verification endpoint
- [ ] Update file retrieval to require OTC verification

### 6. Backend-only Access to Files
- [ ] Update file retrieval endpoint to serve files through backend
- [ ] Implement file streaming through backend API
- [ ] Add authentication/OTC verification for file access

### 7. File Deletion Enforcement
- [ ] Ensure encrypted files are properly deleted from Appwrite Storage
- [ ] Implement cleanup on OTC expiration
- [ ] Verify deletion after print status update
- [ ] Add error handling for deletion failures

### HENCE THIS IS HOW IT WORKS - 
- User logs in via Appwrite Auth

- File is encrypted on client

- Encrypted file uploaded to Appwrite Storage

- Backend stores OTC + metadata in Appwrite DB

- Shopkeeper enters OTC

- Backend validates OTC

- Backend streams + decrypts file

- File is printed once

- Backend deletes file

- OTC marked as used