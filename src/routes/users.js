const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');
const { hashPassword } = require('../utils/crypto');
const logger = require('../utils/logger');

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

router.get('/', async (req, res) => {
  try {
    const db = await getConnection();
    const [users] = await db.query('SELECT id, username, email, role FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/search', async (req, res) => {
  const { name, email, role } = req.query;

  try {
    const db = await getConnection();

    let query = 'SELECT id, username, email, role FROM users WHERE 1=1';
    const params = [];

    if (name) {
      query += ' AND username LIKE ?';
      params.push(`%${name}%`);
    }
    if (email) {
      query += ' AND email = ?';
      params.push(email);
    }
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    logger.info('User search query: ' + logger.sanitize(name));

    const [users] = await db.query(query, params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/profile/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const db = await getConnection();

    const [rows] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    res.send(`
      <html>
        <body>
          <h1>User Profile</h1>
          <p>Username: ${escapeHtml(user.username)}</p>
          <p>Email: ${escapeHtml(user.email)}</p>
          <p>Bio: ${escapeHtml(user.bio)}</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const db = await getConnection();
    const hashedPassword = hashPassword(password);

    const query = 'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)';
    const queryParams = [username, email, hashedPassword, role || 'user'];

    const [result] = await db.query(query, queryParams);

    logger.info('Created user: ' + logger.sanitize(username) + ' with email: ' + logger.sanitize(email));

    res.status(201).json({ id: result.insertId, username, email });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.delete('/:id', async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const db = await getConnection();
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
