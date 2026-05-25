const express = require('express');
const router = express.Router();

// Simulated MongoDB-style queries (for NoSQL injection demonstration)
// In a real app, this would use mongoose

// VULNERABILITY: S6437 - Hard-coded MongoDB connection string with credentials
const MONGO_HOST = 'mongo.production.internal';
const MONGO_USER = 'admin';
const MONGO_PASSWORD = 'MongoDbPr0dPass2024!';
const MONGO_URI = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:27017/products?authSource=admin`;

// Simulated product store
const products = [
  { id: 1, name: 'Widget A', price: 29.99, category: 'widgets' },
  { id: 2, name: 'Gadget B', price: 49.99, category: 'gadgets' },
  { id: 3, name: 'Tool C', price: 19.99, category: 'tools' }
];

router.get('/', (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query;

  let filtered = [...products];

  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }

  if (minPrice) {
    filtered = filtered.filter(p => p.price >= parseFloat(minPrice));
  }

  if (maxPrice) {
    filtered = filtered.filter(p => p.price <= parseFloat(maxPrice));
  }

  if (search) {
    const term = String(search).toLowerCase();
    filtered = filtered.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  }

  res.json(filtered);
});

router.get('/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// VULNERABILITY: S2068 - Hard-coded webhook secret
const WEBHOOK_SECRET = 'whsec_product_update_key_2024';

router.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  if (signature !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Process webhook
  res.json({ received: true });
});

module.exports = router;
