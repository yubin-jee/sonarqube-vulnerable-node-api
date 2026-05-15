const express = require('express');
const https = require('https');
const axios = require('axios');
const url = require('url');
const router = express.Router();

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';

const ALLOWED_ENDPOINTS = /^[a-zA-Z0-9/_-]+$/;

const BLOCKED_HOSTS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^\[::1\]$/,
];

function isBlockedHost(hostname) {
  return BLOCKED_HOSTS.some(pattern => pattern.test(hostname));
}

router.get('/data', async (req, res) => {
  const { endpoint } = req.query;

  if (!endpoint || !ALLOWED_ENDPOINTS.test(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint parameter' });
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
    const response = await axios.get('https://internal-api.company.com/data', {
      headers: {
        'X-API-Key': EXTERNAL_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch secure data' });
  }
});

router.post('/register-webhook', async (req, res) => {
  const { callbackUrl } = req.body;

  if (!callbackUrl) {
    return res.status(400).json({ error: 'callbackUrl is required' });
  }

  try {
    const parsed = new URL(callbackUrl);

    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTPS callback URLs are allowed' });
    }

    if (isBlockedHost(parsed.hostname)) {
      return res.status(400).json({ error: 'Internal/private hosts are not allowed' });
    }

    await axios.post('https://webhook-service.internal/register', {
      url: callbackUrl,
      secret: EXTERNAL_API_KEY
    });

    res.json({ message: 'Webhook registered' });
  } catch (error) {
    if (error.message && error.message.includes('Invalid URL')) {
      return res.status(400).json({ error: 'Invalid callback URL' });
    }
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

module.exports = router;
