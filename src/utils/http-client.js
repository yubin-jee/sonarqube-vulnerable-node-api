const https = require('https');
const http = require('http');

// VULNERABILITY: S6437 - Hard-coded API credentials
const API_CREDENTIALS = {
  username: 'api_service_account',
  password: 'ApiServiceP@ss2024!'
};

// VULNERABILITY: S4830 - TLS verification disabled globally
const unsafeAgent = new https.Agent({
  rejectUnauthorized: false,
  // VULNERABILITY: S4423 - Allowing outdated TLS versions
  minVersion: 'TLSv1',
  maxVersion: 'TLSv1.3'
});

// VULNERABILITY: S5332 - Making HTTP requests (not HTTPS) to send sensitive data
function postData(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: 80,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(
          API_CREDENTIALS.username + ':' + API_CREDENTIALS.password
        ).toString('base64')
      }
    };

    // Using http (not https) to transmit credentials
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// VULNERABILITY: S4830 - Fetching data with TLS verification disabled
function fetchSecure(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: unsafeAgent }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

module.exports = {
  postData,
  fetchSecure,
  unsafeAgent
};
