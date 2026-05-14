const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads'));

function isWithinDirectory(filePath, directory) {
  const resolvedPath = path.resolve(filePath);
  return resolvedPath.startsWith(directory + path.sep) || resolvedPath === directory;
}

function sanitizeFilename(filename) {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const safeName = sanitizeFilename(filename);
  const filePath = path.resolve(path.join(UPLOAD_DIR, safeName));

  if (!isWithinDirectory(filePath, UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  logger.info('File download requested: ' + safeName);

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;
  const filePath = path.resolve(path.join(UPLOAD_DIR, requestedPath));

  if (!isWithinDirectory(filePath, UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

router.post('/convert', (req, res) => {
  const { inputFile, outputFormat } = req.body;

  const safeInput = sanitizeFilename(inputFile);
  const safeFormat = String(outputFormat).replace(/[^a-zA-Z0-9]/g, '');
  const outputName = `output.${safeFormat}`;

  execFile('convert', [safeInput, '-format', safeFormat, outputName], (error, stdout, stderr) => {
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

  const safeFiles = files.map(f => sanitizeFilename(f));

  execFile('tar', ['-czf', 'archive.tar.gz', ...safeFiles], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Compression failed' });
    }
    res.json({ message: 'Files compressed', output: 'archive.tar.gz' });
  });
});

router.post('/search', (req, res) => {
  const { pattern, directory } = req.body;

  const safeDir = path.resolve(path.join(UPLOAD_DIR, directory || '.'));
  if (!isWithinDirectory(safeDir, UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  execFile('grep', ['-r', pattern, safeDir], (error, stdout, stderr) => {
    if (error && error.code !== 1) {
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json({ results: stdout.split('\n').filter(Boolean) });
  });
});

router.delete('/:filename', (req, res) => {
  const { filename } = req.params;
  const safeName = sanitizeFilename(filename);
  const filePath = path.resolve(path.join(UPLOAD_DIR, safeName));

  if (!isWithinDirectory(filePath, UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  fs.unlink(filePath, (error) => {
    if (error) {
      return res.status(500).json({ error: 'Delete failed' });
    }
    res.json({ message: 'File deleted' });
  });
});

module.exports = router;
