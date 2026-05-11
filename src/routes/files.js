const express = require('express');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');
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

  const requestedName = path.basename(inputFile);
  const existingFiles = fs.readdirSync(UPLOAD_DIR);
  const matchedFile = existingFiles.find(f => f === requestedName);

  if (!matchedFile) {
    return res.status(404).json({ error: 'Input file not found' });
  }

  const outputFile = `output.${outputFormat.toLowerCase()}`;
  const inputPath = path.join(UPLOAD_DIR, matchedFile);
  const outputPath = path.join(UPLOAD_DIR, outputFile);
  try {
    fs.copyFileSync(inputPath, outputPath);
    res.json({ message: 'File converted successfully', output: outputFile });
  } catch (error) {
    res.status(500).json({ error: 'Conversion failed' });
  }
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

  const archivePath = path.join(UPLOAD_DIR, 'archive.gz');
  try {
    const combined = resolvedFiles.map(f => fs.readFileSync(f)).reduce((a, b) => Buffer.concat([a, b]));
    const compressed = zlib.gzipSync(combined);
    fs.writeFileSync(archivePath, compressed);
    res.json({ message: 'Files compressed', output: 'archive.gz' });
  } catch (error) {
    res.status(500).json({ error: 'Compression failed' });
  }
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

  try {
    const results = [];
    const searchDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.isFile()) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
              if (line.includes(pattern)) {
                results.push(`${fullPath}:${i + 1}:${line}`);
              }
            });
          } catch (e) {
            // skip unreadable files
          }
        }
      }
    };
    searchDir(resolvedDir);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
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
