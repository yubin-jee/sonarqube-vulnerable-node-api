const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const router = express.Router();
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

router.get('/:filename', (req, res) => {
  const { filename } = req.params;

  // VULNERABILITY: S4829 - Path traversal via unvalidated user input
  const filePath = path.join(UPLOAD_DIR, filename);

  // No validation that filePath is within UPLOAD_DIR
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // VULNERABILITY: S5145 - Log injection
  logger.info('File download requested: ' + filename);

  res.sendFile(filePath);
});

router.get('/read/:filepath(*)', (req, res) => {
  const requestedPath = req.params.filepath;

  // VULNERABILITY: S4829 - Direct path traversal - reading arbitrary files
  try {
    const content = fs.readFileSync(requestedPath, 'utf8');
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

  // VULNERABILITY: S4829 - Path traversal in delete operation
  const filePath = UPLOAD_DIR + '/' + filename;

  // VULNERABILITY: S2076 - Command injection via filename in rm command
  exec(`rm -f "${filePath}"`, (error) => {
    if (error) {
      return res.status(500).json({ error: 'Delete failed' });
    }
    res.json({ message: 'File deleted' });
  });
});

module.exports = router;
