# Secure Print Flow - Multer & Upload Optimization

## Task: Improve Multer + FormData combo for efficiency and scalability

### Implementation Plan

#### Step 1: Enhanced Multer Configuration (backend/server.js) ✅ COMPLETED
- [x] Add file size limits (100MB max)
- [x] Add file type validation (whitelist allowed MIME types)
- [x] Add error handling for malformed uploads

#### Step 2: Direct-to-B2 Upload Implementation (Scalability Improvement) ✅ COMPLETED
- [x] Create pre-signed URL endpoint in backend (`/api/upload-url`)
- [x] Create upload completion endpoint (`/api/upload-complete`)
- [x] Add getUploadUrl function in backblaze.js
- [x] Update frontend with client-side file validation (matching backend)

#### Step 3: Cleanup & Testing
- [ ] Test upload flow end-to-end
- [ ] Verify OTC generation works with new flow
- [ ] Document changes

---

## Completed Improvements

### 1. Enhanced Multer Configuration
- **File size limit**: 100MB max (prevents memory exhaustion attacks)
- **File type whitelist**: Only allows PDF, DOC, DOCX, TXT, PNG, JPG, JPEG, PPTX
- **Single file limit**: Only 1 file per upload

### 2. Direct-to-B2 Upload Endpoints
- **`/api/upload-url`**: Generates pre-signed upload URL for direct B2 uploads
- **`/api/upload-complete`**: Confirms upload completion and finalizes record
- Frontend can now upload files directly to Backblaze, bypassing the backend

### Benefits of Direct-to-B2:
- **Your server is not bottlenecked** by file transfer
- **Handles larger files** without memory issues
- **Scales better** with concurrent users
- **Reduces server bandwidth** costs

