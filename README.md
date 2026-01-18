# Secure Print 

A secure file sharing application that allows users to upload encrypted files and share them via one-time codes (OTC). Files are encrypted client-side using AES-256-GCM and can only be retrieved once before being automatically deleted.

## Features

- **End-to-End Encryption**: Files are encrypted in the browser using AES-256-GCM before upload
- **One-Time Codes**: Each file generates a unique 6-digit code that can only be used once
- **Auto-Deletion**: Files are automatically deleted from storage after successful retrieval
- **Secure Authentication**: User registration and login with Appwrite
- **Dark/Light Theme**: Full theme support with dark mode

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **Appwrite** - Backend-as-a-Service (auth, database, storage)
- **Web Crypto API** - Native browser AES-256-GCM encryption

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Appwrite SDK** - Server-side database and storage
- **Multer** - File upload handling
- **Native Crypto** - Server-side encryption

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
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
# or
bun install
```

3. Set up environment variables:
Create a `.env` file in the `backend/` directory:
```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT=your_project_id
APPWRITE_DATABASE_ID=secure_print
APPWRITE_COLLECTION_OTC=one_time_codes
APPWRITE_BUCKET_ID=secure_files
```

### Running the Application

#### Development Mode
Start both frontend and backend simultaneously:
```bash
npm run dev
```

This starts:
- Frontend: http://localhost:8080
- Backend: http://localhost:3001


#### Production Build
```bash
# Build frontend
npm run build:frontend

# Start backend in production
npm run start:backend
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload encrypted file and generate OTC |
| POST | `/api/retrieve` | Validate OTC and decrypt file (consumes OTC) |
| POST | `/api/validate-otc` | Check OTC validity without consuming it |
| GET | `/api/health` | Health check endpoint |

## Project Structure

```
secure-print-flow/
├── backend/
│   ├── appwrite.js      # Appwrite SDK configuration
│   ├── server.js        # Express server with API routes
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # UI components (shadcn/ui, theme-toggle)
│   │   ├── pages/       # Page components (Home, Login, Register)
│   │   ├── hooks/       # Custom hooks (useAuth)
│   │   ├── lib/         # Utilities (api, appwrite, encryption)
│   │   └── main.tsx     # App entry point
│   └── package.json
├── package.json         # Root with concurrently scripts
└── README.md
```

## Security Features

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with SHA-256
- **IV**: 16 bytes per file
- **Authentication Tag**: 16 bytes for integrity verification

### One-Time Code System
- 6-digit numeric codes (000000-999999)
- Single-use only
- Auto-delete after retrieval
- Optional validation without consumption

## License

MIT

