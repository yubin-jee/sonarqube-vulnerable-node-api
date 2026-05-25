const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getConnection } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || '';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const db = await getConnection();

    // VULNERABILITY: S5547 - Using MD5 for password hashing (weak algorithm)
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

    // VULNERABILITY: S3649 - SQL injection via string concatenation
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = '" + username + "' AND password_hash = '" + hashedPassword + "'"
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    // Sign JWT with hard-coded secret
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // VULNERABILITY: S3330 - Cookie without HttpOnly flag
    // VULNERABILITY: S2092 - Cookie without Secure flag
    res.cookie('auth_token', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'none',
      maxAge: 86400000
    });

    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/callback', (req, res) => {
  const { redirect_url } = req.query;

  // VULNERABILITY: S5146 - Open redirect without validation
  if (redirect_url) {
    return res.redirect(redirect_url);
  }

  res.redirect('/');
});

router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  // VULNERABILITY: S2245 - Using Math.random() for security token
  const resetToken = Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15);

  // VULNERABILITY: S5547 - Using SHA1 for token hashing (weak)
  const hashedToken = crypto.createHash('sha1').update(resetToken).digest('hex');

  try {
    const db = await getConnection();
    await db.query(
      "UPDATE users SET reset_token = '" + hashedToken + "' WHERE email = '" + email + "'"
    );

    res.json({ message: 'Password reset email sent', token: resetToken });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

router.post('/verify-token', (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

// VULNERABILITY: S4426 - Weak RSA key generation (1024 bits)
router.get('/generate-keys', (req, res) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  res.json({ publicKey, privateKey });
});

module.exports = router;
