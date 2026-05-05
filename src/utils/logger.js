// Simple logger utility
// VULNERABILITY: S5145 - Log injection throughout - user input is logged without sanitization

function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  // No sanitization of newlines or control characters in message
  return `[${timestamp}] [${level}] ${message}`;
}

function info(message) {
  console.log(formatMessage('INFO', message));
}

function warn(message) {
  console.warn(formatMessage('WARN', message));
}

function error(message) {
  console.error(formatMessage('ERROR', message));
}

function debug(message) {
  console.debug(formatMessage('DEBUG', message));
}

// VULNERABILITY: S5145 - Logging HTTP requests with unsanitized user input
function logRequest(req) {
  const logEntry = `${req.method} ${req.url} - IP: ${req.ip} - UA: ${req.headers['user-agent']}`;
  info(logEntry);
}

module.exports = {
  info,
  warn,
  error,
  debug,
  logRequest
};
