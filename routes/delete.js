const express = require('express');
const fs = require('fs');

module.exports = (db) => {
  const router = express.Router();

  router.delete('/file/:accessCode', async (req, res) => {
    const accessCode = req.params.accessCode.toUpperCase();
    
    try {
        const result = await db.query('SELECT * FROM files WHERE "accessCode" = $1', [accessCode]);
        const fileRecord = result.rows[0];

        if (!fileRecord) {
            return res.status(200).json({ message: 'Record already deleted.' });
        }

        console.log(`User canceled. Deleting file: ${fileRecord.originalName}`);
        
        if (fs.existsSync(fileRecord.path)) {
            fs.unlinkSync(fileRecord.path);
        }
        
        await db.query('DELETE FROM files WHERE "accessCode" = $1', [accessCode]);
        
        res.status(200).json({ message: 'Upload canceled and file successfully deleted.' });

    } catch (error) {
        console.error(`Error deleting file during cancellation:`, error);
        res.status(500).json({ message: 'Could not cancel upload.' });
    }
  });

  return router;
};
