const express = require('express');
const short = require('short-uuid');
const fs = require('fs');
const ClamScan = require('clamscan');

const router = express.Router();

let clamscan = null;
const initializeClamScan = async () => {
    try {
        // In a Docker container, the path will be the standard Linux path.
        clamscan = await new ClamScan().init({
            removeInfected: false,
            clamscan: { path: '/usr/bin/clamscan', active: true },
            preference: 'clamscan'
        });
        console.log("ClamAV scanner initialized successfully.");
    } catch (err) {
        console.error("Error initializing ClamAV scanner:", err.message);
        clamscan = null;
    }
};
initializeClamScan();

module.exports = (db, upload) => {
  router.post('/upload', upload.single('document'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    if (clamscan) {
        try {
            const { isInfected } = await clamscan.isInfected(req.file.path);
            if (isInfected) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: `Malicious file detected. Upload rejected.` });
            }
        } catch (err) {
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: 'Could not complete security scan. Upload rejected.' });
        }
    } else {
        console.warn(`WARNING: ClamAV scanner is not available. Skipping security scan.`);
    }

    try {
        const { expiry } = req.body;
        const accessCode = short.generate().slice(0, 6).toUpperCase();
        
        const now = new Date();
        const expiryTime = new Date(now);
        switch (expiry) {
            case '1h': expiryTime.setHours(expiryTime.getHours() + 1); break;
            case '7d': expiryTime.setDate(expiryTime.getDate() + 7); break;
            default: expiryTime.setHours(expiryTime.getHours() + 24); break;
        }

        // Updated SQL query for PostgreSQL with parameterized queries
        const sql = 'INSERT INTO files ("accessCode", "originalName", "fileName", path, "uploadTime", "expiryTime") VALUES ($1, $2, $3, $4, $5, $6)';
        const values = [
            accessCode,
            req.file.originalname,
            req.file.filename,
            req.file.path,
            now.toISOString(),
            expiryTime.toISOString()
        ];
        await db.query(sql, values);

        console.log(`File uploaded and secured: ${req.file.originalname} -> Code: ${accessCode}`);
        res.status(200).json({ accessCode: accessCode });

    } catch (procErr) {
        console.error('Error processing file after scan:', procErr);
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'An internal error occurred during file processing.' });
    }
  });
  
  return router;
};
