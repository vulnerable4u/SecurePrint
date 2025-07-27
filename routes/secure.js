const express = require('express');
const path = require('path');
const fs = require('fs');
const short = require('short-uuid');

const router = express.Router();

module.exports = (db) => {
  router.post('/secure-converted-file', async (req, res) => {
    const { tempFileName } = req.body;
    if (!tempFileName) {
      return res.status(400).json({ error: 'No temporary file name provided.' });
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, tempFileName);

    try {
        await fs.promises.access(filePath);

        const accessCode = short.generate().slice(0, 6).toUpperCase();
        const now = new Date();
        const expiryTime = new Date(now);
        expiryTime.setHours(expiryTime.getHours() + 24);

        const sql = 'INSERT INTO files ("accessCode", "originalName", "fileName", path, "uploadTime", "expiryTime") VALUES ($1, $2, $3, $4, $5, $6)';
        const values = [
            accessCode,
            tempFileName,
            tempFileName,
            filePath,
            now.toISOString(),
            expiryTime.toISOString()
        ];
        await db.query(sql, values);

        console.log(`Secured converted file: ${tempFileName} -> Code: ${accessCode}`);
        res.status(200).json({ accessCode });

    } catch (error) {
        console.error('Error securing converted file:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Converted file not found. It may have been deleted.' });
        }
        res.status(500).json({ error: 'Could not secure the file.' });
    }
  });

  return router;
};
