// 1. Import Dependencies
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const initializeDatabase = require('./database');

// 2. Initialize App
const app = express();
const PORT = process.env.PORT || 3001;

// --- Main async function to start the server ---
async function startServer() {
    // Await the database connection before starting the rest of the app
    const db = await initializeDatabase();

    // 3. Configure Multer for file storage on the local disk
    // In Docker on Render, this path should point to your persistent disk mount point.
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s/g, '_'));
      }
    });
    const upload = multer({ storage: storage });

    // 4. Import Route Handlers, passing the database connection
    const uploadRoutes = require('./routes/upload')(db, upload);
    const convertRoutes = require('./routes/convert')(db, upload);
    const printRoutes = require('./routes/print')(db);
    const deleteRoutes = require('./routes/delete')(db);
    const secureRoutes = require('./routes/secure')(db);

    // 5. Setup Middleware
    app.use(cors()); 
    app.use(express.json()); 
    app.use(express.urlencoded({ extended: true })); 

    // --- Static File Serving ---
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/uploads', express.static(uploadDir));

    // 6. Define API Routes
    app.use('/api', uploadRoutes);
    app.use('/api', convertRoutes);
    app.use('/api', printRoutes);
    app.use('/api', deleteRoutes);
    app.use('/api', secureRoutes);

    // --- Scheduled Cleanup of Orphaned Files ---
    setInterval(async () => {
        console.log('Running scheduled cleanup for expired files...');
        try {
            const now = new Date();
            const result = await db.query('SELECT * FROM files WHERE "expiryTime" < $1', [now]);
            const expiredFiles = result.rows;

            if (expiredFiles.length === 0) {
                console.log('No expired files to clean up.');
                return;
            }

            for (const file of expiredFiles) {
                console.log(`Deleting expired file: ${file.originalName} (Code: ${file.accessCode})`);
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                await db.query('DELETE FROM files WHERE "accessCode" = $1', [file.accessCode]);
            }
            console.log(`Cleanup complete. Deleted ${expiredFiles.length} expired file(s).`);
        } catch (error) {
            console.error('Error during scheduled cleanup:', error);
        }
    }, 3600000); // 1 hour

    // --- Catch-all Route for Frontend ---
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/index.html'));
    });

    // 7. Start the Server
    app.listen(PORT, () => {
      console.log(`SecurePrint server is running on http://localhost:${PORT}`);
    });
}

startServer();