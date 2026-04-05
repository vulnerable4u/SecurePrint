# SecurePrint Deployment to Render

## Overview
Deploy as two Render services:
1. **Backend** (Web Service): Node.js API on port 3001
2. **Frontend** (Static Site): Vite SPA, proxy API to backend URL

## Prerequisites
- [Render account](https://render.com) (free tier OK)
- GitHub repo with this project (git remote add origin & push)
- Appwrite project setup (update .env vars below)

## Backend Deployment (Web Service)

1. **Connect Repo**
   - New → Web Service → Connect GitHub repo
   - Select `backend` folder (or root + Build Command below)

2. **Settings**
   ```
   Name: secure-print-backend
   Environment: Node
   Region: (Oregon closest)
   Branch: main
   Root Directory: backend
   ```

3. **Build & Start**
   ```
   Build Command: npm install && npm install -g nodemon (if dev) || npm install
   Start Command: node server.js
   ```

4. **Environment Variables** (Dashboard → Environment)
   ```
   PORT=10000  # Render assigns, backend listens on process.env.PORT || 3001
   APPWRITE_ENDPOINT=your-appwrite-url
   APPWRITE_PROJECT=your-project-id
   BACKBLAZE_KEY_ID=your-key
   BACKBLAZE_APP_KEY=your-app-key
   BACKBLAZE_BUCKET_ID=your-bucket
   ```

5. **Deploy** → Backend URL: `https://secure-print-backend-xxx.onrender.com`

## Frontend Deployment (Static Site)

1. **New → Static Site** → Connect same repo

2. **Settings**
   ```
   Name: secure-print-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm ci && npm run build
   Publish Directory: dist
   ```

3. **Environment Variables**
   ```
   VITE_API_URL=https://secure-print-backend-xxx.onrender.com/api
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT=your-project-id
   ```

4. **Deploy** → Frontend URL: `https://secure-print-frontend.onrender.com`

## Auto-Deploys
- Push to GitHub → auto-build/deploy both services

## Custom Domain (Optional)
- Dashboard → Custom Domains → Add domain
- SSL auto-enabled

## Verification
1. Frontend loads without errors
2. Upload/Retrieve works (OTC generated/downloaded)
3. Check Render logs for issues
4. Health: `curl https://backend-url/api/health`

## Local .env Template
```
# backend/.env & frontend/.env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT=your-project
BACKBLAZE_KEY_ID=...
# etc.
```

## Troubleshooting
- **Build fails**: Check package-lock.json, Node version (18+)
- **API 404**: Verify VITE_API_URL exact match
- **CORS**: Backend sets correct headers
- **Free tier sleep**: ~15min idle → wakes on request

**Production Ready** ✅
