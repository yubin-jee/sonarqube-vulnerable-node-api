const https = require('https');

const API_CREDENTIALS = {
  username: process.env.API_SERVICE_USERNAME || '',
  password: process.env.API_SERVICE_PASSWORD || ''
};

const secureAgent = new https.Agent({
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3'
});

function postData(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'POST',
      agent: secureAgent,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(
          API_CREDENTIALS.username + ':' + API_CREDENTIALS.password
        ).toString('base64')
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

function fetchSecure(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: secureAgent }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

module.exports = {
  postData,
  fetchSecure,
  secureAgent
};
