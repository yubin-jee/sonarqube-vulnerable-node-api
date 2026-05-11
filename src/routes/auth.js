const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getConnection } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const db = await getConnection();

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? AND password_hash = ?',
      [username, hashedPassword]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400000
    });

    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/callback', (req, res) => {
  const { redirect_url } = req.query;

  if (redirect_url) {
    const allowedHosts = (process.env.ALLOWED_REDIRECT_HOSTS || '').split(',').filter(Boolean);
    try {
      const parsed = new URL(redirect_url, `${req.protocol}://${req.get('host')}`);
      if (parsed.origin === `${req.protocol}://${req.get('host')}` || allowedHosts.includes(parsed.hostname)) {
        return res.redirect(parsed.toString());
      }
    } catch (e) {
      // invalid URL, fall through to default
    }
    return res.redirect('/');
  }

  res.redirect('/');
});

router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  const resetToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  try {
    const db = await getConnection();
    await db.query(
      'UPDATE users SET reset_token = ? WHERE email = ?',
      [hashedToken, email]
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

router.get('/generate-keys', (req, res) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  res.json({ publicKey, privateKey });
});

module.exports = router;
