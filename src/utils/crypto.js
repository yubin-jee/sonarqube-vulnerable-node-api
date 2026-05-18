const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

function generateToken(data) {
  return crypto.createHash('sha256').update(data + Date.now()).digest('hex');
}

function encryptData(plaintext) {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex').slice(0, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function encryptStream(data) {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex').slice(0, 32);
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

function generateKeyPair() {
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
  generateKeyPair,
  ENCRYPTION_KEY
};
