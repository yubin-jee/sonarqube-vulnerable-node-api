const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

router.get('/:filename', (req, res) => {
  const { filename } = req.params;

  const filePath = path.resolve(UPLOAD_DIR, filename);

  if (!filePath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
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

  const resolvedPath = path.resolve(UPLOAD_DIR, requestedPath);

  if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
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

  // VULNERABILITY: S2076 - Command injection via user-controlled input
  const command = `convert ${inputFile} -format ${outputFormat} output.${outputFormat}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Conversion failed', details: stderr });
    }
    res.json({ message: 'File converted successfully', output: stdout });
  });
});

router.post('/compress', (req, res) => {
  const { files } = req.body;

  // VULNERABILITY: S2076 - Command injection via user-controlled filenames
  const fileList = files.join(' ');
  const command = `tar -czf archive.tar.gz ${fileList}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Compression failed' });
    }
    res.json({ message: 'Files compressed', output: 'archive.tar.gz' });
  });
});

router.post('/search', (req, res) => {
  const { pattern, directory } = req.body;

  // VULNERABILITY: S2076 - Command injection via grep pattern
  exec(`grep -r "${pattern}" ${directory}`, (error, stdout, stderr) => {
    if (error && error.code !== 1) {
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json({ results: stdout.split('\n').filter(Boolean) });
  });
});

router.delete('/:filename', (req, res) => {
  const { filename } = req.params;

  const filePath = path.resolve(UPLOAD_DIR, filename);

  if (!filePath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  // VULNERABILITY: S2076 - Command injection via filename in rm command
  exec(`rm -f "${filePath}"`, (error) => {
    if (error) {
      return res.status(500).json({ error: 'Delete failed' });
    }
    res.json({ message: 'File deleted' });
  });
});

module.exports = router;
