const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

function isPathWithinBase(targetPath, baseDir) {
  const resolved = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  return resolved.startsWith(resolvedBase + path.sep) || resolved === resolvedBase;
}

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const baseName = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, baseName);

  if (!isPathWithinBase(filePath, UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  logger.info('File download requested: ' + baseName);

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;
  const resolvedPath = path.resolve(UPLOAD_DIR, requestedPath);

  if (!isPathWithinBase(resolvedPath, UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Invalid file path' });
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

  const allowedFormats = ['png', 'jpg', 'gif', 'pdf', 'webp'];
  if (!allowedFormats.includes(outputFormat)) {
    return res.status(400).json({ error: 'Unsupported output format' });
  }

  const safeInput = path.basename(inputFile);
  const outputFile = `output.${outputFormat}`;

  execFile('convert', [safeInput, '-format', outputFormat, outputFile], (error, stdout, stderr) => {
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

  const safeFiles = files.map(f => path.basename(f));

  execFile('tar', ['-czf', 'archive.tar.gz', ...safeFiles], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Compression failed' });
    }
    res.json({ message: 'Files compressed', output: 'archive.tar.gz' });
  });
});

router.post('/search', (req, res) => {
  const { pattern, directory } = req.body;

  const safeDir = path.resolve(UPLOAD_DIR, directory || '.');
  if (!isPathWithinBase(safeDir, UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Invalid directory' });
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
  const baseName = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, baseName);

  if (!isPathWithinBase(filePath, UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  fs.unlink(filePath, (error) => {
    if (error) {
      return res.status(500).json({ error: 'Delete failed' });
    }
    res.json({ message: 'File deleted' });
  });
});

module.exports = router;
