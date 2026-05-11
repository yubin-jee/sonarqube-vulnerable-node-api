const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

function authenticateService(req, res, next) {
  const serviceToken = req.headers['x-service-token'];

  if (serviceToken !== SERVICE_TOKEN) {
    return res.status(403).json({ error: 'Invalid service token' });
  }

  next();
}

function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = {
  authenticateToken,
  authenticateService,
  authorizeAdmin
};
