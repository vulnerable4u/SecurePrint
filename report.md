# Tech Stack Report

## Overview
This project is a full-stack web application consisting of a React-based frontend and a Node.js/Express backend. It is a secure print service that allows users to upload files, generate one-time codes (OTC) for access, and manage file printing with encryption and auto-deletion features.

## Tech Stack

### Frontend
- **React**: A JavaScript library for building user interfaces (v18.3.1).
- **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript (v5.8.3).
- **Vite**: A fast build tool and development server for modern web projects (v5.4.19).
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development (v3.4.17).
- **shadcn/ui**: A collection of reusable UI components built on top of Radix UI and styled with Tailwind CSS.
- **Radix UI**: A set of low-level UI primitives for building high-quality, accessible design systems (multiple components including Dialog, Dropdown Menu, Toast, Tabs, etc.).
- **React Router DOM**: Declarative routing for React applications (v6.30.1).
- **React Hook Form**: Performant, flexible forms with easy validation (v7.61.1).
- **Zod**: TypeScript-first schema declaration and validation library (v3.25.76).
- **Framer Motion**: A production-ready motion library for React (v11.18.2).
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
- **Appwrite SDK**: Server-side SDK for Appwrite database and storage (v13.0.0).
- **Multer**: Middleware for handling multipart/form-data, used for file uploads (v2.0.2).
- **UUID**: For generating unique identifiers (v9.0.1).
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
     APPWRITE_BUCKET_ID=secure_files
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
The backend provides the following API endpoints:

- `POST /api/upload`: Upload an encrypted file and generate a 6-digit OTC (One-Time Code)
- `POST /api/retrieve`: Validate OTC and retrieve/decrypt file (OTC becomes invalid after retrieval)
- `POST /api/validate-otc`: Check if an OTC is valid without retrieving the file
- `GET /api/health`: Health check endpoint

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

### End-to-End Encryption
- **AES-256-GCM**: All files are encrypted using industry-standard AES-256-GCM encryption
- **Client-side Encryption**: Files are encrypted in the browser before upload using the native Web Crypto API
- **Server-side Decryption**: Files are decrypted on retrieval with the user's encryption key
- **Format**: IV (16 bytes) + Authentication Tag (16 bytes) + Ciphertext

### One-Time Code (OTC) System
- **6-digit numeric codes**: Each uploaded file gets a unique 6-digit code
- **Single-use**: Each OTC can only be used once
- **Auto-deletion**: File is deleted from storage immediately after successful retrieval
- **Validation endpoint**: Check OTC validity without consuming it

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

