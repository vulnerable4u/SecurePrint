const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { execFile } = require('child_process');
const short = require('short-uuid');

const router = express.Router();

function getSofficePath() {
    // In a Docker environment, we can rely on a standard path.
    return '/usr/bin/soffice';
}

module.exports = (db, upload) => {
  router.post('/convert', upload.single('document'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file for conversion was uploaded.' });
    }

    const { targetFormat } = req.body;
    if (!targetFormat) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Target conversion format was not specified.' });
    }

    const inputPath = req.file.path;
    // Ensure this directory points to the persistent disk mount path in production
    const outputDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const sofficePath = getSofficePath();

    const args = [ '--headless', '--convert-to', targetFormat, '--outdir', outputDir, inputPath ];

    try {
        await new Promise((resolve, reject) => {
            execFile(sofficePath, args, (error, stdout, stderr) => {
                if (error) {
                    console.error('LibreOffice Conversion Error:', stderr);
                    if (error.code === 'ENOENT') {
                        return reject(new Error('LibreOffice could not be found. Please ensure it is installed.'));
                    }
                    return reject(error);
                }
                resolve(stdout);
            });
        });

        const convertedFileName = `${path.parse(req.file.filename).name}.${targetFormat}`;
        const convertedFilePath = path.join(outputDir, convertedFileName);

        // Check if the converted file exists
        await fs.access(convertedFilePath);

        console.log(`File converted successfully: ${convertedFileName}`);
        
        // Return the temporary filename and a direct download URL
        res.status(200).json({
            downloadUrl: `/uploads/${convertedFileName}`,
            tempFileName: convertedFileName
        });

    } catch (error) {
        console.error('An error occurred during file conversion:', error.message);
        res.status(500).json({ error: error.message || 'An unknown error occurred during conversion.' });
    } finally {
        // Clean up the original uploaded file
        await fs.unlink(inputPath);
    }
  });

  return router;
};
