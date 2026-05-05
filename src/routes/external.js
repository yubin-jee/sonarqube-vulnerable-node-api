const express = require('express');
const https = require('https');
const axios = require('axios');
const router = express.Router();

// VULNERABILITY: S6437 - Hard-coded third-party API key
const EXTERNAL_API_KEY = 'external-api-key-7x8y9z0a1b2c3d4e';

router.get('/data', async (req, res) => {
  const { endpoint } = req.query;

  try {
    // VULNERABILITY: S5332 - Using HTTP instead of HTTPS
    const response = await axios.get(`http://api.external-service.com/v1/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${EXTERNAL_API_KEY}`
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch external data' });
  }
});

router.get('/secure-data', async (req, res) => {
  try {
    // VULNERABILITY: S4830 - Disabling TLS certificate verification
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    const response = await axios.get('https://internal-api.company.com/data', {
      httpsAgent: agent,
      headers: {
        'X-API-Key': EXTERNAL_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch secure data' });
  }
});

// VULNERABILITY: S5332 - Webhook configured over HTTP
router.post('/register-webhook', async (req, res) => {
  const { callbackUrl } = req.body;

  try {
    await axios.post('http://webhook-service.internal/register', {
      url: callbackUrl,
      secret: EXTERNAL_API_KEY
    });

    res.json({ message: 'Webhook registered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

module.exports = router;
