// routes/download.js
// Handles the logic for checking file info and downloading files.

const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');

const router = express.Router();

// This module exports a function that returns a router.
// It accepts the shared database as an argument.
module.exports = (db) => {
  /**
   * @route   GET /api/file-info/:accessCode
   * @desc    Checks if a file exists and if it requires a password.
   */
  router.get('/file-info/:accessCode', (req, res) => {
    const accessCode = req.params.accessCode.toUpperCase();
    const fileRecord = db[accessCode];
    if (!fileRecord || new Date() > fileRecord.expiryTime) {
      return res.status(404).json({ error: 'Invalid or expired access code.' });
    }
    res.status(200).json({
      requiresPassword: !!fileRecord.passwordHash
    });
  });

  /**
   * @route   POST /api/download
   * @desc    Verifies credentials and provides file for download.
   */
  router.post('/download', async (req, res) => {
    const { accessCode, password } = req.body;
    const upperAccessCode = accessCode.toUpperCase();
    const fileRecord = db[upperAccessCode];

    if (!fileRecord) return res.status(404).json({ error: 'Invalid access code.' });
    if (new Date() > fileRecord.expiryTime) return res.status(404).json({ error: 'This access code has expired.' });

    if (fileRecord.passwordHash) {
      if (!password) return res.status(401).json({ error: 'Password is required for this file.' });
      const isMatch = await bcrypt.compare(password, fileRecord.passwordHash);
      if (!isMatch) return res.status(401).json({ error: 'Incorrect password.' });
    }

    console.log(`File downloaded: ${fileRecord.originalName} with code: ${upperAccessCode}`);
    res.download(fileRecord.path, fileRecord.originalName, (err) => {
      if (err) console.error(`Error during file download: ${err}`);
      fs.unlink(fileRecord.path, (unlinkErr) => {
        if (unlinkErr) console.error(`Error deleting file: ${unlinkErr}`);
      });
      delete db[upperAccessCode];
      console.log(`Record for code ${upperAccessCode} has been deleted.`);
    });
  });

  return router;
};