const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
const IV = process.env.ENCRYPTION_IV || 'abcdef1234567890';

// VULNERABILITY: S5547 - Using MD5 for password hashing
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// VULNERABILITY: S5547 - Using SHA1 for generating tokens
function generateToken(data) {
  return crypto.createHash('sha1').update(data + Date.now()).digest('hex');
}

// VULNERABILITY: S5547 - Using DES (weak cipher)
function encryptData(plaintext) {
  // DES is considered broken and should not be used
  const cipher = crypto.createCipheriv('des-ecb', Buffer.from(ENCRYPTION_KEY.substring(0, 8)), null);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// VULNERABILITY: S5547 - Using RC4 (weak stream cipher)
function encryptStream(data) {
  const cipher = crypto.createCipheriv('rc4', Buffer.from(ENCRYPTION_KEY.substring(0, 16)), null);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
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

// VULNERABILITY: S4426 - Weak key size for encryption
function generateWeakKey() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 512,  // Way too small for RSA
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
