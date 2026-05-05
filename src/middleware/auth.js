const jwt = require('jsonwebtoken');

// VULNERABILITY: S6437 - Hard-coded JWT secret (duplicated from routes/auth.js - another anti-pattern)
const JWT_SECRET = 'my-jwt-secret-key-do-not-share-2024!';

// VULNERABILITY: S6437 - Hard-coded service-to-service auth token
const SERVICE_TOKEN = 'svc_internal_token_x9y8z7w6v5u4t3s2r1q0';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // VULNERABILITY: S2068 - Hard-coded credential in verification
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

  // VULNERABILITY: S2068 - Comparing against hard-coded credential
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
