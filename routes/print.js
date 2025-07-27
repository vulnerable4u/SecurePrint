const express = require('express');
const fs = require('fs');

module.exports = (db) => {
  const router = express.Router();

  router.post('/print', async (req, res) => {
    const { accessCode } = req.body;
    const upperAccessCode = accessCode.toUpperCase();
    
    try {
        const result = await db.query('SELECT * FROM files WHERE "accessCode" = $1', [upperAccessCode]);
        const fileRecord = result.rows[0];

        if (!fileRecord) {
            return res.status(404).json({ error: 'Invalid access code.' });
        }

        const now = new Date();
        const expiryTime = new Date(fileRecord.expiryTime);
        if (now > expiryTime) {
            await db.query('DELETE FROM files WHERE "accessCode" = $1', [upperAccessCode]);
            if(fs.existsSync(fileRecord.path)) fs.unlinkSync(fileRecord.path);
            return res.status(404).json({ error: 'This access code has expired.' });
        }

        console.log(`File sent for printing: ${fileRecord.originalName} with code: ${upperAccessCode}`);
        
        res.download(fileRecord.path, fileRecord.originalName, async (err) => {
            if (err) {
                console.error(`Error sending file for printing: ${err}`);
            }
            
            if (fs.existsSync(fileRecord.path)) {
                fs.unlinkSync(fileRecord.path);
            }
            await db.query('DELETE FROM files WHERE "accessCode" = $1', [upperAccessCode]);
            console.log(`Record for code ${upperAccessCode} has been deleted after print request.`);
        });

    } catch (error) {
        console.error('Error during print process:', error);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
  });

  router.get('/file-info/:accessCode', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM files WHERE "accessCode" = $1', [req.params.accessCode.toUpperCase()]);
        const fileRecord = result.rows[0];
        if (!fileRecord || new Date() > new Date(fileRecord.expiryTime)) {
            return res.status(404).json({ error: 'Invalid or expired access code.' });
        }
        res.status(200).json({ requiresPassword: false });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
  });

  return router;
};
