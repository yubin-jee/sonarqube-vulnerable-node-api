const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads'));

function isPathWithinBase(targetPath, basePath) {
  const resolved = path.resolve(targetPath);
  return resolved.startsWith(basePath + path.sep) || resolved === basePath;
}

const ALLOWED_OUTPUT_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'pdf'];

function isValidFilename(name) {
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));

  if (!isPathWithinBase(filePath, UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  logger.info('File download requested: ' + filename);

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;
  const filePath = path.resolve(path.join(UPLOAD_DIR, requestedPath));

  if (!isPathWithinBase(filePath, UPLOAD_DIR)) {
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

  if (!isValidFilename(inputFile) || !ALLOWED_OUTPUT_FORMATS.includes(outputFormat)) {
    return res.status(400).json({ error: 'Invalid input file or output format' });
  }

  const inputPath = path.resolve(path.join(UPLOAD_DIR, inputFile));
  if (!isPathWithinBase(inputPath, UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const outputFile = `output.${outputFormat}`;
  execFile('convert', [inputPath, '-format', outputFormat, outputFile], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Conversion failed' });
    }
    res.json({ message: 'File converted successfully', output: stdout });
  });
});

router.post('/compress', (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Files array is required' });
  }

  const resolvedFiles = [];
  for (const file of files) {
    if (!isValidFilename(file)) {
      return res.status(400).json({ error: `Invalid filename: ${file}` });
    }
    const filePath = path.resolve(path.join(UPLOAD_DIR, file));
    if (!isPathWithinBase(filePath, UPLOAD_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    resolvedFiles.push(filePath);
  }

  execFile('tar', ['-czf', 'archive.tar.gz', ...resolvedFiles], (error, stdout, stderr) => {
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

  const searchDir = path.resolve(path.join(UPLOAD_DIR, directory || '.'));
  if (!isPathWithinBase(searchDir, UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  execFile('grep', ['-r', pattern, searchDir], (error, stdout, stderr) => {
    if (error && error.code !== 1) {
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json({ results: (stdout || '').split('\n').filter(Boolean) });
  });
});

router.delete('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));

  if (!isPathWithinBase(filePath, UPLOAD_DIR)) {
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
