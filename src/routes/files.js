const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.resolve(UPLOAD_DIR, filename);

  if (!filePath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  logger.info('File download requested: ' + logger.sanitize(filename));

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;
  const resolvedPath = path.resolve(UPLOAD_DIR, requestedPath);

  if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
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

  if (!inputFile || !outputFormat) {
    return res.status(400).json({ error: 'inputFile and outputFormat are required' });
  }

  const allowedFormats = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'pdf', 'webp'];
  if (!allowedFormats.includes(outputFormat.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid output format' });
  }

  const resolvedInput = path.resolve(UPLOAD_DIR, inputFile);
  if (!resolvedInput.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const outputFile = `output.${outputFormat.toLowerCase()}`;
  const outputPath = path.join(UPLOAD_DIR, outputFile);
  execFile('/usr/bin/convert', [resolvedInput, '-format', outputFormat.toLowerCase(), outputPath], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Conversion failed', details: stderr });
    }
    res.json({ message: 'File converted successfully', output: stdout });
  });
});

router.post('/compress', (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files array is required' });
  }

  const resolvedFiles = files.map(f => {
    const resolved = path.resolve(UPLOAD_DIR, f);
    if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
      return null;
    }
    return resolved;
  });

  if (resolvedFiles.includes(null)) {
    return res.status(403).json({ error: 'Access denied: invalid file path' });
  }

  const archivePath = path.join(UPLOAD_DIR, 'archive.tar.gz');
  execFile('/usr/bin/tar', ['-czf', archivePath, ...resolvedFiles], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Compression failed' });
    }
    res.json({ message: 'Files compressed', output: 'archive.tar.gz' });
  });
});

router.post('/search', (req, res) => {
  const { pattern, directory } = req.body;

  if (!pattern || !directory) {
    return res.status(400).json({ error: 'pattern and directory are required' });
  }

  const resolvedDir = path.resolve(UPLOAD_DIR, directory);
  if (!resolvedDir.startsWith(path.resolve(UPLOAD_DIR) + path.sep) && resolvedDir !== path.resolve(UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  execFile('/usr/bin/grep', ['-r', '--', pattern, resolvedDir], (error, stdout, stderr) => {
    if (error && error.code !== 1) {
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json({ results: (stdout || '').split('\n').filter(Boolean) });
  });
});

router.delete('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.resolve(UPLOAD_DIR, filename);

  if (!filePath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
