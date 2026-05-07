const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const fileRoutes = require('./routes/files');
const productRoutes = require('./routes/products');
const importRoutes = require('./routes/import');
const externalRoutes = require('./routes/external');

const app = express();
const PORT = process.env.PORT || 3000;

// VULNERABILITY: S5122 - CORS misconfiguration allowing all origins
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // VULNERABILITY: S2092 - Insecure cookie
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/import', importRoutes);
app.use('/api/external', externalRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Vulnerable Node.js API - For Testing Only' });
});

// Global error handler
app.use((err, req, res, next) => {
  // VULNERABILITY: S5145 - Log injection via error message
  console.error('Error occurred: ' + err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
