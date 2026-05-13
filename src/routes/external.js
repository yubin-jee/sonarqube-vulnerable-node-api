const express = require('express');
const https = require('https');
const axios = require('axios');
const router = express.Router();

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';

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

const ALLOWED_WEBHOOK_HOSTS = ['webhook-service.internal'];

router.post('/register-webhook', async (req, res) => {
  const { callbackUrl } = req.body;

  try {
    const parsedUrl = new URL(callbackUrl);
    if (!ALLOWED_WEBHOOK_HOSTS.includes(parsedUrl.hostname)) {
      return res.status(400).json({ error: 'Callback URL host not allowed' });
    }

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
