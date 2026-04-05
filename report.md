# Tech Stack Report

## Overview
This project is a full-stack web application consisting of a React-based frontend and a Node.js/Express backend. It is a secure print service that allows users to upload files, generate one-time codes (OTC) for access, and manage file printing with encryption and auto-deletion features.

## Tech Stack

### Frontend
- **React**: A JavaScript library for building user interfaces (v18.3.1).
- **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript (v5.8.3).
- **Vite**: A fast build tool and development server for modern web projects (5.4.21).
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development (3.4.17).
- **shadcn/ui**: A collection of reusable UI components built on top of Radix UI and styled with Tailwind CSS.
- **Radix UI**: A set of low-level UI primitives for building high-quality, accessible design systems (multiple components including Dialog, Dropdown Menu, Toast, Tabs, etc.).
- **React Router DOM**: Declarative routing for React applications (6.30.1).
- **React Hook Form**: Performant, flexible forms with easy validation (7.61.1).
- **Zod**: TypeScript-first schema declaration and validation library (3.25.76).
- **Framer Motion**: A production-ready motion library for React (11.18.2).
- **Lucide React**: Beautiful & consistent icon toolkit (v0.462.0).
- **TanStack Query (React Query)**: Powerful data synchronization and state management for React (v5.83.0).
- **Next Themes**: Theme abstraction for React applications (v0.3.0).
- **Appwrite**: Backend-as-a-Service platform for authentication, database, and storage (v13.0.0).
- **Web Crypto API**: Native browser API for AES-256-GCM encryption (no external crypto library).
- **Sonner**: Modern toast notifications for React (v1.7.4).
- **Recharts**: Composable charting library for React (v2.15.4).
- **date-fns**: Modern JavaScript date utility library (v3.6.0).

### Backend
- **Node.js**: JavaScript runtime built on Chrome's V8 JavaScript engine (v20+).
- **Express.js**: Fast, unopinionated, minimalist web framework for Node.js (v4.19.2).
- **Appwrite SDK**: Server-side SDK for Appwrite database (metadata/OTC) + node-appwrite (22.1.3); Backblaze for file storage.
- **Multer**: Middleware for handling multipart/form-data, used for file uploads (2.1.1).
- **Backblaze B2**: Scalable object storage for files (backblaze-b2 1.7.1) - direct pre-signed uploads for high performance.
- **UUID**: For generating unique identifiers (9.0.1).
- **CORS**: Middleware for enabling Cross-Origin Resource Sharing (v2.8.5).
- **Dotenv**: Module for loading environment variables from a .env file (v16.4.5).
- **Native Crypto**: Node.js built-in crypto module for AES-256-GCM encryption.

### Development Tools
- **ESLint**: Tool for identifying and reporting on patterns in ECMAScript/JavaScript code (v9.32.0).
- **TypeScript ESLint**: ESLint rules for TypeScript (v8.38.0).
- **PostCSS**: Tool for transforming CSS with JavaScript (v8.5.6).
- **Autoprefixer**: PostCSS plugin to parse CSS and add vendor prefixes automatically (v10.4.21).
- **Nodemon**: Utility that monitors for changes in source code and automatically restarts the server (v3.1.0).
- **Bun**: Fast JavaScript runtime and package manager (indicated by bun.lockb file).
- **concurrently**: Run multiple commands simultaneously (v8.2.2).

## How to Use the Project

### Prerequisites
- Node.js (version 18 or higher recommended)
- npm or bun package manager
- Git

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd secure-print-flow
   ```

2. Install dependencies:
   ```bash
   npm install
   # or if using bun
   bun install
   ```

3. Set up environment variables:
   - Create a `.env` file in the `backend/` directory
   - Add the following variables (replace with your actual values):
     ```
     # Appwrite Configuration
     APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
     APPWRITE_PROJECT=your_project_id
     APPWRITE_DATABASE_ID=secure_print
     APPWRITE_COLLECTION_OTC=one_time_codes
     # Note: APPWRITE_BUCKET_ID not used (Backblaze used for storage)
     # Backblaze B2 config:
     BACKBLAZE_KEY_ID=your_key_id
     BACKBLAZE_APP_KEY=your_app_key
     BACKBLAZE_BUCKET_ID=your_bucket_id
     ```

### Running the Application

#### Development Mode
Run both frontend and backend simultaneously:
```bash
npm run dev
```
This starts:
- Frontend development server at http://localhost:8080
- Backend API server at http://localhost:3001

#### Alternative: Run services separately
```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Start frontend
npm run dev:frontend
```

#### Production Build
1. Build the frontend:
   ```bash
   npm run build:frontend
   ```

2. Start the backend in production:
   ```bash
   npm run start:backend
   ```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Legacy: Upload file via backend (100MB max) |
| POST | `/api/upload-url` | Get pre-signed Backblaze URL for direct upload (scalable) |
| POST | `/api/upload-complete` | Confirm direct B2 upload and finalize OTC |
| POST | `/api/retrieve` | Validate OTC, stream file from B2, auto-delete |
| POST | `/api/validate-otc` | Check OTC validity (file info preview) |
| GET | `/api/health` | Health check

### Project Structure
```
secure-print-flow/
├── backend/
│   ├── appwrite.js      # Appwrite SDK configuration (client, databases, storage)
│   ├── server.js        # Express server with API routes
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components (shadcn/ui, theme-toggle, etc.)
│   │   ├── pages/       # Page components (Home, Login, Register)
│   │   ├── hooks/       # Custom React hooks (useAuth)
│   │   ├── lib/         # Utility functions (api.js, appwrite.js, encryption.ts)
│   │   └── main.tsx     # Application entry point
│   └── package.json
├── package.json         # Root package.json with concurrently scripts
└── report.md
```

### Additional Commands
- `npm run lint`: Run ESLint for code linting
- `npm run build:dev`: Build for development mode

## Security Features

### Current Architecture
- **Appwrite**: Metadata storage and OTC validation (server-side only)
- **Backblaze B2**: Private file storage with direct pre-signed uploads (no public access)
- **No client-side encryption** (raw print documents stored securely)

### Access Control
- **OTC System**: 6-digit single-use codes validated server-side
- **Auto-deletion**: Files + OTC records cleaned up after retrieval
- **File limits**: 100MB max, allowed types (PDF, DOCX, PNG, etc.)

### End-to-End Encryption (Legacy Note)
**Note**: Current implementation stores raw files in B2 for print use cases. E2EE available via Web Crypto API if needed.
- **AES-256-GCM**: Files can be encrypted client-side
- **Format**: IV (16 bytes) + Tag (16 bytes) + Ciphertext

### One-Time Code (OTC) System
- **6-digit numeric codes**: Each uploaded file gets a unique 6-digit code
- **Single-use**: Each OTC can only be used once
- **Auto-deletion**: File is deleted from storage immediately after successful retrieval
- **Validation endpoint**: Check OTC validity without consuming it

## Recent Changes & Features

### Security Migration (v1.1.0+)
- **Migrated from Cloudinary/Firebase** to **Appwrite (DB) + Backblaze B2 (storage)**
- Removed all public file access
- Direct B2 pre-signed uploads (bypasses backend for scale)
- Backend-only OTC validation & file streaming/delete

### New Features
- **Batch upload** with progress tracking (frontend api.js)
- **Retrieve page** enhancements: OTC preview (file info), polished shadcn UI
- **Full shadcn/Radix suite**: 20+ components (accordion, dialog, tabs, toast, etc.)
- **React Query**: Caching, optimistic updates
- **Dark/Light theme** (next-themes)
- **Charts & analytics** (Recharts)
- **Toasts** (Sonner)
- **Motion/animations** (Framer Motion)

## Deployment

### Frontend Deployment (Vite)
The frontend can be deployed to any static hosting service:
- Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.
- Build command: `npm run build:frontend`

### Backend Deployment (Node.js/Express)
The backend requires a Node.js environment (v20+):
- Configure environment variables for Appwrite
- Use a process manager like PM2 for production
- Ensure the server is accessible on port 3001

### Appwrite Cloud
- Create a free account at [cloud.appwrite.io](https://cloud.appwrite.io)
- Create a new project
- Create a database with two collections: `one_time_codes` and `files`
- Create a storage bucket with private permissions
- Update environment variables with your Appwrite credentials

