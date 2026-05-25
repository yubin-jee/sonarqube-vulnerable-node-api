const express = require('express');
const path = require('path');
const fs = require('fs');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads'));

const ALLOWED_FORMATS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'pdf', 'txt']);

function isWithinDirectory(filePath, directory) {
  const resolved = path.resolve(filePath);
  return resolved.startsWith(directory + path.sep) || resolved === directory;
}

function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

router.get('/:filename', (req, res) => {
  const filename = sanitizeFilename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!isWithinDirectory(filePath, UPLOAD_DIR)) {
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
  const filePath = path.resolve(UPLOAD_DIR, requestedPath);

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

  if (!ALLOWED_FORMATS.has(safeFormat.toLowerCase())) {
    return res.status(400).json({ error: 'Unsupported output format' });
  }

  const inputPath = path.join(UPLOAD_DIR, safeInput);
  if (!isWithinDirectory(inputPath, UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    fs.accessSync(inputPath, fs.constants.R_OK);
    const outputName = `output.${safeFormat}`;
    const outputPath = path.join(UPLOAD_DIR, outputName);
    fs.copyFileSync(inputPath, outputPath);
    res.json({ message: 'File converted successfully', output: outputName });
  } catch (error) {
    logger.error('Conversion failed: ' + error.message);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

router.post('/compress', (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Files array required' });
  }

  const safeFiles = files.map(f => sanitizeFilename(f));
  const outputPath = path.join(UPLOAD_DIR, 'archive.gz');

  try {
    const firstFile = path.join(UPLOAD_DIR, safeFiles[0]);
    if (!isWithinDirectory(firstFile, UPLOAD_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const input = fs.createReadStream(firstFile);
    const output = fs.createWriteStream(outputPath);
    const gzip = zlib.createGzip();

    pipeline(input, gzip, output, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Compression failed' });
      }
      res.json({ message: 'Files compressed', output: 'archive.gz' });
    });
  } catch (error) {
    logger.error('Compression failed: ' + error.message);
    res.status(500).json({ error: 'Compression failed' });
  }
});

router.post('/search', (req, res) => {
  const { pattern, directory } = req.body;

  if (!pattern || typeof pattern !== 'string') {
    return res.status(400).json({ error: 'Search pattern required' });
  }

  const safeDir = path.resolve(UPLOAD_DIR, directory || '.');
  if (!isWithinDirectory(safeDir, UPLOAD_DIR)) {
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
            lines.forEach((line, idx) => {
              if (line.includes(pattern)) {
                const relativePath = path.relative(UPLOAD_DIR, fullPath);
                results.push(`${relativePath}:${idx + 1}:${line}`);
              }
            });
          } catch (readErr) {
            logger.debug('Skipping unreadable file: ' + entry.name);
          }
        }
      }
    };
    searchDir(safeDir);
    res.json({ results });
  } catch (error) {
    logger.error('Search failed: ' + error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.delete('/:filename', (req, res) => {
  const filename = sanitizeFilename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);

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
