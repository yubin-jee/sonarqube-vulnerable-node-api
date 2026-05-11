const express = require('express');
const https = require('https');
const axios = require('axios');
const url = require('url');
const router = express.Router();

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

const ALLOWED_ENDPOINTS = ['users', 'products', 'orders', 'status'];

router.get('/data', async (req, res) => {
  const { endpoint } = req.query;

  if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid or missing endpoint' });
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

const ALLOWED_WEBHOOK_DOMAINS = (process.env.ALLOWED_WEBHOOK_DOMAINS || '').split(',').filter(Boolean);

router.post('/register-webhook', async (req, res) => {
  const { callbackUrl } = req.body;

  if (!callbackUrl) {
    return res.status(400).json({ error: 'callbackUrl is required' });
  }

  try {
    const parsed = new URL(callbackUrl);
    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'callbackUrl must use HTTPS' });
    }
    if (ALLOWED_WEBHOOK_DOMAINS.length > 0 && !ALLOWED_WEBHOOK_DOMAINS.includes(parsed.hostname)) {
      return res.status(400).json({ error: 'callbackUrl domain not allowed' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid callbackUrl' });
  }

  const validatedUrl = new URL(callbackUrl);
  const sanitizedCallbackUrl = validatedUrl.toString();

  try {
    await axios.post('https://webhook-service.internal/register', {
      url: sanitizedCallbackUrl,
      secret: EXTERNAL_API_KEY
    });

    res.json({ message: 'Webhook registered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

module.exports = router;
