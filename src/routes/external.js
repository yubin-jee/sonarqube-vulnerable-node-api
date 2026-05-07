const express = require('express');
const https = require('https');
const axios = require('axios');
const router = express.Router();

// VULNERABILITY: S6437 - Hard-coded third-party API key
const EXTERNAL_API_KEY = 'external-api-key-7x8y9z0a1b2c3d4e';

const ALLOWED_ENDPOINTS = ['users', 'products', 'orders', 'inventory', 'status'];

router.get('/data', async (req, res) => {
  const { endpoint } = req.query;

  if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint. Allowed: ' + ALLOWED_ENDPOINTS.join(', ') });
  }

  try {
    const response = await axios.get(`https://api.external-service.com/v1/${endpoint}`, {
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

const ALLOWED_CALLBACK_DOMAINS = ['api.external-service.com', 'webhook.external-service.com'];

router.post('/register-webhook', async (req, res) => {
  const { callbackUrl } = req.body;

  if (!callbackUrl) {
    return res.status(400).json({ error: 'callbackUrl is required' });
  }

  try {
    const parsedUrl = new URL(callbackUrl);
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_CALLBACK_DOMAINS.includes(parsedUrl.hostname)) {
      return res.status(400).json({ error: 'Invalid callback URL. Must be HTTPS and from an allowed domain.' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid callback URL format' });
  }

  try {
    await axios.post('https://webhook-service.internal/register', {
      url: callbackUrl,
      secret: EXTERNAL_API_KEY
    });

    res.json({ message: 'Webhook registered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

module.exports = router;
