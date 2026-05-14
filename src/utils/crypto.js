const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(data) {
  return crypto.createHash('sha256').update(data + Date.now()).digest('hex');
}

function encryptData(plaintext) {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function encryptStream(data) {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function generateApiKey() {
  return 'ak_' + crypto.randomBytes(24).toString('hex');
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
