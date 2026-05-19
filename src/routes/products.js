const express = require('express');
const router = express.Router();

// Simulated MongoDB-style queries (for NoSQL injection demonstration)
// In a real app, this would use mongoose

const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const MONGO_USER = process.env.MONGO_USER || '';
const MONGO_PASSWORD = process.env.MONGO_PASSWORD || '';
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

  // VULNERABILITY: S5334 - NoSQL injection via eval-like query construction
  if (search) {
    try {
      // Dangerous: constructing a function from user input
      const searchFn = new Function('product', `return ${search}`);
      filtered = filtered.filter(searchFn);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid search expression' });
    }
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

const WEBHOOK_SECRET = process.env.PRODUCT_WEBHOOK_SECRET || '';

router.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  if (signature !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Process webhook
  res.json({ received: true });
});

module.exports = router;
