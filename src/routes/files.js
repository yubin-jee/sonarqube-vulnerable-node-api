const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

router.get('/:filename', (req, res) => {
  const { filename } = req.params;

  // VULNERABILITY: S4829 - Path traversal via unvalidated user input
  const filePath = path.join(UPLOAD_DIR, filename);

  // No validation that filePath is within UPLOAD_DIR
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // VULNERABILITY: S5145 - Log injection
  logger.info('File download requested: ' + filename);

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;

  // VULNERABILITY: S4829 - Direct path traversal - reading arbitrary files
  try {
    const content = fs.readFileSync(requestedPath, 'utf8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

router.post('/convert', (req, res) => {
  const { inputFile, outputFormat } = req.body;

  if (!inputFile || !outputFormat || !/^[a-zA-Z0-9_.-]+$/.test(outputFormat)) {
    return res.status(400).json({ error: 'Invalid input parameters' });
  }

  const outputFile = `output.${outputFormat}`;
  execFile('convert', [inputFile, '-format', outputFormat, outputFile], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Conversion failed', details: stderr });
    }
    res.json({ message: 'File converted successfully', output: stdout });
  });
});

router.post('/compress', (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Files array is required' });
  }

  const args = ['-czf', 'archive.tar.gz', ...files];
  execFile('tar', args, (error) => {
    if (error) {
      return res.status(500).json({ error: 'Compression failed' });
    }
    res.json({ message: 'Files compressed', output: 'archive.tar.gz' });
  });
});

router.post('/search', (req, res) => {
  const { pattern, directory } = req.body;

  if (!pattern || !directory) {
    return res.status(400).json({ error: 'Pattern and directory are required' });
  }

  execFile('grep', ['-r', pattern, directory], (error, stdout) => {
    if (error && error.code !== 1) {
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json({ results: stdout.split('\n').filter(Boolean) });
  });
});

router.delete('/:filename', (req, res) => {
  const { filename } = req.params;

  const filePath = path.join(UPLOAD_DIR, filename);

  fs.unlink(filePath, (error) => {
    if (error) {
      return res.status(500).json({ error: 'Delete failed' });
    }
    res.json({ message: 'File deleted' });
  });
});

module.exports = router;
