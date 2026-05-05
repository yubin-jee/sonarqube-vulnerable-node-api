# Vulnerable Node.js API

> **WARNING**: This project contains **intentional security vulnerabilities** for testing SonarQube scanning and remediation workflows. Do NOT deploy this in any real environment.

## Purpose

This is a sample Express.js API designed to trigger SonarQube security vulnerability rules. It is intended for use with the **SonarQube Vulnerability Remediation** playbook to practice identifying and fixing security issues.

## Vulnerability Categories Included

| Category | SonarQube Rules | Files |
|---|---|---|
| Hard-coded credentials | S2068, S6437 | `src/config/database.js`, `src/middleware/auth.js`, `src/routes/users.js` |
| SQL injection | S3649 | `src/routes/users.js` |
| Command injection | S2076 | `src/routes/files.js` |
| Path traversal | S4829 | `src/routes/files.js` |
| Open redirect | S5146 | `src/routes/auth.js` |
| Insecure cryptography | S4426, S5547 | `src/utils/crypto.js`, `src/routes/auth.js` |
| Insecure HTTP | S5332 | `src/utils/http-client.js` |
| Disabled TLS verification | S4830 | `src/utils/http-client.js` |
| Cross-site scripting (XSS) | S5131 | `src/routes/users.js` |
| Weak randomness | S2245 | `src/utils/crypto.js` |
| Log injection | S5145 | `src/utils/logger.js` |
| NoSQL injection | S5334 | `src/routes/products.js` |
| XML external entity (XXE) | S2755 | `src/routes/import.js` |
| Insecure cookie | S2092, S3330 | `src/routes/auth.js` |
| CORS misconfiguration | S5122 | `src/app.js` |

## Setup

```bash
npm install
npm start
```

The server starts on `http://localhost:3000`.

## Endpoints

- `POST /api/auth/login` - User login
- `GET /api/auth/callback` - OAuth callback with redirect
- `GET /api/users` - List users
- `GET /api/users/search` - Search users (SQL injection)
- `POST /api/users` - Create user
- `GET /api/files/:filename` - Download file (path traversal)
- `POST /api/files/convert` - Convert file (command injection)
- `GET /api/products` - List products (NoSQL injection)
- `POST /api/import/xml` - Import XML data (XXE)
- `GET /api/external/data` - Fetch external data (insecure HTTP)

## Running SonarQube Analysis

```bash
# Using SonarQube Scanner CLI
sonar-scanner \
  -Dsonar.projectKey=vulnerable-node-api \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=YOUR_TOKEN
```
