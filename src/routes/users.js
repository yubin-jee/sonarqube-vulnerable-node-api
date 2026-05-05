const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');
const { hashPassword } = require('../utils/crypto');
const logger = require('../utils/logger');

// VULNERABILITY: S6437 - Hard-coded admin API key
const ADMIN_API_KEY = 'admin-api-key-9f8e7d6c5b4a3210';

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

    // VULNERABILITY: S3649 - SQL injection via string concatenation
    let query = "SELECT id, username, email, role FROM users WHERE 1=1";

    if (name) {
      query += " AND username LIKE '%" + name + "%'";
    }
    if (email) {
      query += " AND email = '" + email + "'";
    }
    if (role) {
      query += " AND role = '" + role + "'";
    }

    // VULNERABILITY: S5145 - Log injection
    logger.info('User search query: ' + name);

    const [users] = await db.query(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/profile/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const db = await getConnection();

    // VULNERABILITY: S3649 - SQL injection in parameterized-looking but concatenated query
    const [rows] = await db.query(
      "SELECT * FROM users WHERE id = " + userId
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // VULNERABILITY: S5131 - XSS via reflected user data in HTML response
    const user = rows[0];
    res.send(`
      <html>
        <body>
          <h1>User Profile</h1>
          <p>Username: ${user.username}</p>
          <p>Email: ${user.email}</p>
          <p>Bio: ${user.bio}</p>
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

    // VULNERABILITY: S3649 - SQL injection via string interpolation
    const query = `INSERT INTO users (username, email, password_hash, role) 
                   VALUES ('${username}', '${email}', '${hashedPassword}', '${role || 'user'}')`;

    const [result] = await db.query(query);

    // VULNERABILITY: S5145 - Log injection with user input
    logger.info('Created user: ' + username + ' with email: ' + email);

    res.status(201).json({ id: result.insertId, username, email });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.delete('/:id', async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  // VULNERABILITY: S2068 - Hard-coded credential comparison
  if (apiKey !== ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const db = await getConnection();
    await db.query("DELETE FROM users WHERE id = " + req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
