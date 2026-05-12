const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads'));

function isWithinUploadDir(filePath) {
  const resolved = path.resolve(filePath);
  return resolved.startsWith(UPLOAD_DIR + path.sep) || resolved === UPLOAD_DIR;
}

const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'pdf'];
const FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

router.get('/:filename', (req, res) => {
  const { filename } = req.params;

  if (!FILENAME_REGEX.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));

  if (!isWithinUploadDir(filePath)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch {
    return res.status(404).json({ error: 'File not found' });
  }

  logger.info('File download requested: ' + filename);

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;

  const resolvedPath = path.resolve(path.join(UPLOAD_DIR, requestedPath));

  if (!isWithinUploadDir(resolvedPath)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

router.post('/convert', (req, res) => {
  const { inputFile, outputFormat } = req.body;

  if (!outputFormat || !ALLOWED_FORMATS.includes(outputFormat.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid output format' });
  }

  if (!inputFile || !FILENAME_REGEX.test(inputFile)) {
    return res.status(400).json({ error: 'Invalid input file' });
  }

  const outputFile = `output.${outputFormat.toLowerCase()}`;
  execFile('convert', [inputFile, '-format', outputFormat.toLowerCase(), outputFile], (error, stdout, stderr) => {
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

  for (const file of files) {
    if (!FILENAME_REGEX.test(file)) {
      return res.status(400).json({ error: `Invalid filename: ${file}` });
    }
  }

  execFile('tar', ['-czf', 'archive.tar.gz', ...files], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Compression failed' });
    }
    res.json({ message: 'Files compressed', output: 'archive.tar.gz' });
  });
});

router.post('/search', (req, res) => {
  const { pattern, directory } = req.body;

  if (!pattern || typeof pattern !== 'string') {
    return res.status(400).json({ error: 'Pattern is required' });
  }

  const resolvedDir = path.resolve(path.join(UPLOAD_DIR, directory || '.'));
  if (!isWithinUploadDir(resolvedDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  execFile('grep', ['-r', pattern, resolvedDir], (error, stdout, stderr) => {
    if (error && error.code !== 1) {
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json({ results: stdout.split('\n').filter(Boolean) });
  });
});

router.delete('/:filename', (req, res) => {
  const { filename } = req.params;

  if (!FILENAME_REGEX.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));

  if (!isWithinUploadDir(filePath)) {
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
