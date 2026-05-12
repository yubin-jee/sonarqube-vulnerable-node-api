const express = require('express');
const axios = require('axios');
const router = express.Router();
const url = require('url');

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';

const ALLOWED_ENDPOINTS = ['users', 'products', 'orders', 'status'];
const ENDPOINT_REGEX = /^[a-zA-Z0-9_-]+$/;

function isAllowedUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const blockedRanges = ['127.', '10.', '192.168.', '172.16.', '172.17.', '172.18.',
      '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
      '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
      '169.254.', '0.0.0.0'];
    if (parsed.hostname === 'localhost' || parsed.hostname === '::1' ||
        blockedRanges.some(r => parsed.hostname.startsWith(r))) {
      return false;
    }
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

router.get('/data', async (req, res) => {
  const { endpoint } = req.query;

  if (!endpoint || !ENDPOINT_REGEX.test(endpoint)) {
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

  if (!callbackUrl || !isAllowedUrl(callbackUrl)) {
    return res.status(400).json({ error: 'Invalid callback URL. Must be HTTPS and not point to internal networks.' });
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
