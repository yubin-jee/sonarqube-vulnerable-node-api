const express = require('express');
const axios = require('axios');
const router = express.Router();

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';

const ENDPOINT_URLS = new Map([
  ['users', 'https://api.external-service.com/v1/users'],
  ['products', 'https://api.external-service.com/v1/products'],
  ['orders', 'https://api.external-service.com/v1/orders'],
  ['inventory', 'https://api.external-service.com/v1/inventory'],
  ['status', 'https://api.external-service.com/v1/status'],
]);

router.get('/data', async (req, res) => {
  const { endpoint } = req.query;
  const url = ENDPOINT_URLS.get(endpoint);

  if (!url) {
    return res.status(400).json({ error: 'Invalid endpoint. Allowed: ' + [...ENDPOINT_URLS.keys()].join(', ') });
  }

  try {
    const response = await axios.get(url, {
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

const ALLOWED_WEBHOOK_HOSTS = new Set(['webhook-service.internal']);

router.post('/register-webhook', async (req, res) => {
  const { callbackUrl } = req.body;

  try {
    const parsedUrl = new URL(callbackUrl);
    if (!ALLOWED_WEBHOOK_HOSTS.has(parsedUrl.hostname) || parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Callback URL host not allowed' });
    }

    const sanitizedUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
    await axios.post('https://webhook-service.internal/register', {
      url: sanitizedUrl,
      secret: EXTERNAL_API_KEY
    });

    res.json({ message: 'Webhook registered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

module.exports = router;
