const express = require('express');
const xml2js = require('xml2js');
const router = express.Router();
const logger = require('../utils/logger');

router.post('/xml', (req, res) => {
  const xmlData = req.body.xml;

  if (!xmlData) {
    return res.status(400).json({ error: 'No XML data provided' });
  }

  // VULNERABILITY: S2755 - XXE (XML External Entity) injection
  // Parser configured to allow external entities
  const parser = new xml2js.Parser({
    explicitArray: false,
    // Dangerous: these options can enable XXE in some parsers
    // xml2js is safe by default, but this demonstrates the anti-pattern
  });

  parser.parseString(xmlData, (err, result) => {
    if (err) {
      // VULNERABILITY: S5145 - Log injection with XML content
      logger.error('XML parse error for input: ' + xmlData);
      return res.status(400).json({ error: 'Invalid XML' });
    }

    // VULNERABILITY: S5131 - Reflecting parsed XML data without sanitization
    res.json({
      message: 'XML imported successfully',
      data: result
    });
  });
});

router.post('/csv', (req, res) => {
  const { data, tableName } = req.body;

  if (!data || !tableName) {
    return res.status(400).json({ error: 'Missing data or table name' });
  }

  // VULNERABILITY: S3649 - SQL injection via table name
  // In a real app with a DB connection:
  // const query = `INSERT INTO ${tableName} VALUES (...)`;

  // VULNERABILITY: S5145 - Log injection
  logger.info('CSV import to table: ' + tableName + ' with ' + data.length + ' rows');

  res.json({ message: `Imported ${data.length} rows into ${tableName}` });
});

module.exports = router;
