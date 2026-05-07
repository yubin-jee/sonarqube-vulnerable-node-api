const crypto = require('crypto');

// VULNERABILITY: S6437 - Hard-coded encryption key
const ENCRYPTION_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
const IV = 'abcdef1234567890';

// VULNERABILITY: S5547 - Using MD5 for password hashing
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// VULNERABILITY: S5547 - Using SHA1 for generating tokens
function generateToken(data) {
  return crypto.createHash('sha1').update(data + Date.now()).digest('hex');
}

function encryptData(plaintext) {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 32));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function encryptStream(data) {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 32));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

// VULNERABILITY: S2245 - Using Math.random() for security-sensitive token generation
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// VULNERABILITY: S2245 - Using Math.random() for API key generation
function generateApiKey() {
  return 'ak_' + Math.random().toString(36).substring(2) +
         Math.random().toString(36).substring(2) +
         Math.random().toString(36).substring(2);
}

function generateWeakKey() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

module.exports = {
  hashPassword,
  generateToken,
  encryptData,
  encryptStream,
  generateSessionId,
  generateApiKey,
  generateWeakKey,
  ENCRYPTION_KEY
};
