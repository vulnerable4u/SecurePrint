# SecurePrint

## Problem Statement

Public print and Xerox shops often require people to hand over sensitive documents to someone else for printing. That creates a privacy gap: personal IDs, resumes, application forms, financial records, and other confidential files can be viewed, copied, or retained without the sender's control. SecurePrint addresses that gap by giving users a way to share files for one-time retrieval in a short-lived print workflow.

## Solution

SecurePrint is a one-time file sharing app for print workflows. Users sign in with Appwrite, upload up to 5 files, receive a 6-character OTC, and the recipient can download the files exactly once before they are deleted from storage.

## What It Does

- Authenticates users with Appwrite email/password sessions
- Uploads 1 to 5 files per request
- Stores file binaries in Backblaze B2
- Stores OTC metadata in an Appwrite database
- Validates OTCs before download
- Deletes files and metadata after successful retrieval
- Expires OTCs after 10 minutes

## Current Architecture

### Frontend

- React + Vite
- Tailwind CSS + shadcn-style UI components
- Appwrite Web SDK for auth
- Direct browser calls to Appwrite for login, register, profile, and session checks
- Direct browser calls to the backend for upload, OTC validation, and retrieval

### Backend

- Node.js + Express
- Multer for multipart uploads
- Appwrite server SDK for OTC metadata
- Backblaze B2 for file storage
- `archiver` for multi-file ZIP downloads
- Rate limiting on upload and retrieve routes

## Important Implementation Notes

- Files are not currently encrypted client-side before upload.
- Files are uploaded from the browser to the backend, then stored in Backblaze B2.
- OTCs are 6-character alphanumeric codes, not 6-digit numeric codes.
- A single OTC can represent multiple files.
- Successful retrieval deletes the stored files and the OTC document.

## Project Structure

```text
secure-print-flow/
├── backend/
│   ├── appwrite.js
│   ├── backblaze.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── types/
│   └── package.json
├── package.json
└── README.md
```

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### Environment Variables

Create `backend/.env` with:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT=your_project_id
APPWRITE_API_KEY=your_appwrite_api_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_COLLECTION_OTC=your_otc_collection_id
APPWRITE_COLLECTION_FILES=your_files_collection_id

BACKBLAZE_KEY_ID=your_backblaze_key_id
BACKBLAZE_APPLICATION_KEY=your_backblaze_application_key
BACKBLAZE_BUCKET_ID=your_backblaze_bucket_id
BACKBLAZE_BUCKET_NAME=your_backblaze_bucket_name

PORT=3001
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:8081
```

Create `frontend/.env` for local development:

```env
VITE_API_URL=http://localhost:3001
VITE_APPWRITE_ENDPOINT=https://syd.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT=your_project_id
```

### Run

From the repo root:

```bash
npm run dev
```

This starts:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001`

## Production / Render Setup

### Frontend

- Deploy `frontend/` as a Render static site
- Set `VITE_API_URL` to your backend base URL, for example:
  `https://secureprint-api.onrender.com`
- Set `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT`

### Backend

- Deploy `backend/` as a Render web service
- Add all Appwrite and Backblaze environment variables from `backend/.env`
- Set `ALLOWED_ORIGINS` to include your frontend origin, for example:
  `https://secureprint.onrender.com`

### Appwrite Platform Configuration

Appwrite auth is called directly from the browser, so your frontend origin must be registered in Appwrite.

Add a Web platform in the Appwrite console for:

- `secureprint.onrender.com`
- `localhost`

If the hosted site is missing from Appwrite platforms, login and registration will fail with an origin error even if the backend is deployed correctly.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/upload` | Upload 1 to 5 files and generate a single OTC |
| `POST` | `/api/validate-otc` | Check whether an OTC is still valid |
| `POST` | `/api/retrieve` | Download the file or ZIP and consume the OTC |
| `GET` | `/api/health` | Health check |

## File Rules

- Supported types: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG
- Backend upload limit: 100 MB per file
- Frontend UX currently limits total selected size to 50 MB
- Maximum files per upload: 5
- OTC expiry: 10 minutes

## Scripts

### Root

- `npm run dev` - start frontend and backend together
- `npm run build:frontend` - build the frontend
- `npm run start:backend` - start the backend

### Frontend

- `npm run dev`
- `npm run build`
- `npm run lint`

### Backend

- `npm run dev`
- `npm start`

## Known Gaps

- README claims from earlier versions about AES-256-GCM client-side encryption are no longer accurate for the current codebase.
- Backend upload auth is not enforced server-side yet; the frontend currently gates upload access.
- There is no automated cleanup job yet for expired OTCs that are never retrieved.
- There are currently no automated tests in the repository.

## License

MIT
