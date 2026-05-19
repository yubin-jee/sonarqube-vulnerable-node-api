const express = require('express');
const https = require('https');
const axios = require('axios');
const url = require('url');
const router = express.Router();

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';
const EXTERNAL_API_BASE = process.env.EXTERNAL_API_BASE || 'https://api.external-service.com';
const WEBHOOK_SERVICE_URL = process.env.WEBHOOK_SERVICE_URL || 'https://webhook-service.internal';

const ALLOWED_ENDPOINTS = ['users', 'products', 'orders', 'status'];

function isAllowedCallbackUrl(callbackUrl) {
  try {
    const parsed = new URL(callbackUrl);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', '[::1]'];
    if (blockedHosts.includes(parsed.hostname)) {
      return false;
    }
    const ip = parsed.hostname;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

router.get('/data', async (req, res) => {
  const { endpoint } = req.query;

  if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid or missing endpoint. Allowed: ' + ALLOWED_ENDPOINTS.join(', ') });
  }

  try {
    const response = await axios.get(`${EXTERNAL_API_BASE}/v1/${endpoint}`, {
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

  if (!callbackUrl || !isAllowedCallbackUrl(callbackUrl)) {
    return res.status(400).json({ error: 'Invalid callback URL. Must be HTTPS and not target internal networks.' });
  }

  try {
    await axios.post(`${WEBHOOK_SERVICE_URL}/register`, {
      url: callbackUrl,
      secret: EXTERNAL_API_KEY
    });

    res.json({ message: 'Webhook registered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

module.exports = router;
