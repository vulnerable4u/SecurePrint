# Tech Stack Report

## Overview
This project is a full-stack web application consisting of a React-based frontend and a Node.js/Express backend. It appears to be a secure print service that allows users to upload files, generate one-time codes (OTC) for access, and manage file printing with expiration and deletion features.

## Tech Stack

### Frontend
- **React**: A JavaScript library for building user interfaces.
- **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
- **Vite**: A fast build tool and development server for modern web projects.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **shadcn-ui**: A collection of reusable UI components built on top of Radix UI and styled with Tailwind CSS.
- **Radix UI**: A set of low-level UI primitives for building high-quality, accessible design systems.
- **React Router DOM**: Declarative routing for React applications.
- **React Hook Form**: Performant, flexible forms with easy validation.
- **Zod**: TypeScript-first schema declaration and validation library.
- **Framer Motion**: A production-ready motion library for React.
- **Lucide React**: Beautiful & consistent icon toolkit made by the creators of Tailwind CSS.
- **React Query**: Powerful data synchronization for React.
- **Next Themes**: An abstraction for themes in React applications.
- **Firebase**: For client-side Firebase integration (authentication, etc.).

### Backend
- **Node.js**: JavaScript runtime built on Chrome's V8 JavaScript engine.
- **Express.js**: Fast, unopinionated, minimalist web framework for Node.js.
- **Firebase Admin SDK**: Server-side Firebase SDK for accessing Firestore database.
- **Cloudinary**: Cloud-based image and video management service (used for file uploads).
- **Multer**: Middleware for handling multipart/form-data, primarily used for uploading files.
- **UUID**: For generating unique identifiers.
- **CORS**: Middleware for enabling Cross-Origin Resource Sharing.
- **Dotenv**: Module for loading environment variables from a .env file.

### Development Tools
- **ESLint**: Tool for identifying and reporting on patterns in ECMAScript/JavaScript code.
- **TypeScript ESLint**: ESLint rules for TypeScript.
- **PostCSS**: Tool for transforming CSS with JavaScript.
- **Autoprefixer**: PostCSS plugin to parse CSS and add vendor prefixes automatically.
- **Nodemon**: Utility that monitors for changes in source code and automatically restarts the server.
- **Bun**: Fast JavaScript runtime and package manager (indicated by bun.lockb file).

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
     CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
     CLOUDINARY_API_KEY=your_cloudinary_api_key
     CLOUDINARY_API_SECRET=your_cloudinary_api_secret
     FIREBASE_PROJECT_ID=your_firebase_project_id
     FIREBASE_PRIVATE_KEY_ID=your_private_key_id
     FIREBASE_PRIVATE_KEY=your_private_key
     FIREBASE_CLIENT_EMAIL=your_client_email
     FIREBASE_CLIENT_ID=your_client_id
     FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
     FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
     FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
     FIREBASE_CLIENT_X509_CERT_URL=your_client_x509_cert_url
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

- `POST /api/upload`: Upload a file and generate an OTC
- `GET /api/file/:otc`: Retrieve file information using OTC
- `POST /api/file/:id/status`: Update file status (printing/printed)

### Project Structure
- `src/`: Frontend source code
  - `components/`: Reusable UI components
  - `pages/`: Page components
  - `hooks/`: Custom React hooks
  - `lib/`: Utility functions
- `public/`: Static assets
- `src/server.js`: Backend Express server
- `src/firebaseAdmin.js`: Firebase Admin SDK configuration

### Additional Commands
- `npm run lint`: Run ESLint for code linting
- `npm run build:dev`: Build for development mode

## Deployment
The project can be deployed using various platforms. For Lovable (as mentioned in README), simply open the Lovable project and click Share -> Publish.

