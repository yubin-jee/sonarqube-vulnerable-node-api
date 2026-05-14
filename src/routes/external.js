const express = require('express');
const https = require('https');
const axios = require('axios');
const router = express.Router();

// VULNERABILITY: S6437 - Hard-coded third-party API key
const EXTERNAL_API_KEY = 'external-api-key-7x8y9z0a1b2c3d4e';

const ALLOWED_ENDPOINTS = new Set(['users', 'products', 'orders', 'status']);

router.get('/data', async (req, res) => {
  const { endpoint } = req.query;

  if (!endpoint || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint. Allowed: ' + [...ALLOWED_ENDPOINTS].join(', ') });
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

const ALLOWED_CALLBACK_HOSTS = new Set(['api.external-service.com', 'webhook.external-service.com']);

router.post('/register-webhook', async (req, res) => {
  const { callbackUrl } = req.body;

  let validatedHost;
  let validatedPath;
  try {
    const parsed = new URL(callbackUrl);
    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid callback URL: must use HTTPS' });
    }
    if (!ALLOWED_CALLBACK_HOSTS.has(parsed.hostname)) {
      return res.status(400).json({ error: 'Invalid callback URL: host not allowed' });
    }
    validatedHost = parsed.hostname;
    validatedPath = parsed.pathname;
  } catch (urlError) {
    return res.status(400).json({ error: 'Invalid URL format: ' + urlError.message });
  }

  const registrationUrl = `https://${validatedHost}${validatedPath}`;

  try {
    await axios.post('https://webhook-service.internal/register', {
      url: registrationUrl,
      secret: EXTERNAL_API_KEY
    });

    res.json({ message: 'Webhook registered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

module.exports = router;
