const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads'));

function isWithinDirectory(baseDir, targetPath) {
  const resolved = path.resolve(targetPath);
  return resolved.startsWith(baseDir + path.sep) || resolved === baseDir;
}

function sanitizeFilename(filename) {
  const basename = path.basename(filename);
  if (!basename || basename === '.' || basename === '..') {
    return null;
  }
  return basename;
}

router.get('/:filename', (req, res) => {
  const { filename } = req.params;

  const sanitized = sanitizeFilename(filename);
  if (!sanitized) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.resolve(path.join(UPLOAD_DIR, sanitized));

  if (!isWithinDirectory(UPLOAD_DIR, filePath)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  logger.info('File download requested: ' + sanitized);

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;

  const filePath = path.resolve(path.join(UPLOAD_DIR, requestedPath));

  if (!isWithinDirectory(UPLOAD_DIR, filePath)) {
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

  const sanitizedInput = sanitizeFilename(inputFile);
  const allowedFormats = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'pdf'];

  if (!sanitizedInput) {
    return res.status(400).json({ error: 'Invalid input file' });
  }

  if (!outputFormat || !allowedFormats.includes(outputFormat.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid output format' });
  }

  const outputFile = `output.${outputFormat.toLowerCase()}`;

  execFile('convert', [sanitizedInput, '-format', outputFormat.toLowerCase(), outputFile], (error, stdout, stderr) => {
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

  const sanitizedFiles = files.map(f => sanitizeFilename(f)).filter(Boolean);

  if (sanitizedFiles.length === 0) {
    return res.status(400).json({ error: 'No valid filenames provided' });
  }

  execFile('tar', ['-czf', 'archive.tar.gz', ...sanitizedFiles], (error) => {
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

  const resolvedDir = path.resolve(path.join(UPLOAD_DIR, directory));

  if (!isWithinDirectory(UPLOAD_DIR, resolvedDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  execFile('grep', ['-r', pattern, resolvedDir], (error, stdout) => {
    if (error && error.code !== 1) {
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json({ results: stdout.split('\n').filter(Boolean) });
  });
});

router.delete('/:filename', (req, res) => {
  const { filename } = req.params;

  const sanitized = sanitizeFilename(filename);
  if (!sanitized) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.resolve(path.join(UPLOAD_DIR, sanitized));

  if (!isWithinDirectory(UPLOAD_DIR, filePath)) {
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
