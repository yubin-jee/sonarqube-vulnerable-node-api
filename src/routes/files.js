const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads'));

function isWithinDirectory(baseDir, targetPath) {
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(baseDir + path.sep) || resolvedTarget === baseDir;
}

router.get('/:filename', (req, res) => {
  const { filename } = req.params;

  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));

  if (!isWithinDirectory(UPLOAD_DIR, filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  logger.info('File download requested: ' + filename);

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;

  const resolvedPath = path.resolve(path.join(UPLOAD_DIR, requestedPath));

  if (!isWithinDirectory(UPLOAD_DIR, resolvedPath)) {
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

  if (!inputFile || !outputFormat || !/^[a-zA-Z0-9]+$/.test(outputFormat)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const resolvedInput = path.resolve(path.join(UPLOAD_DIR, inputFile));
  if (!isWithinDirectory(UPLOAD_DIR, resolvedInput)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const outputFile = `output.${outputFormat}`;
  execFile('convert', [resolvedInput, '-format', outputFormat, outputFile], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Conversion failed', details: stderr });
    }
    res.json({ message: 'File converted successfully', output: stdout });
  });
});

router.post('/compress', (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Invalid files list' });
  }

  const resolvedFiles = files.map(f => {
    const resolved = path.resolve(path.join(UPLOAD_DIR, f));
    if (!isWithinDirectory(UPLOAD_DIR, resolved)) {
      return null;
    }
    return resolved;
  });

  if (resolvedFiles.some(f => f === null)) {
    return res.status(400).json({ error: 'Invalid file path' });
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

  if (!pattern || !directory) {
    return res.status(400).json({ error: 'Pattern and directory are required' });
  }

  const resolvedDir = path.resolve(path.join(UPLOAD_DIR, directory));
  if (!isWithinDirectory(UPLOAD_DIR, resolvedDir)) {
    return res.status(400).json({ error: 'Invalid directory path' });
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

  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));

  if (!isWithinDirectory(UPLOAD_DIR, filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
