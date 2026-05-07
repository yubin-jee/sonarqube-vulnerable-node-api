function sanitize(input) {
  if (typeof input !== 'string') return String(input);
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\r\n\t]/g, '_').replace(/[\x00-\x1F\x7F]/g, '');
}

function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${sanitize(message)}`;
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
