function sanitize(input) {
  if (input == null) return '';
  return String(input)
    .replace(/[\r\n]/g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '');
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
  const logEntry = `${req.method} ${sanitize(req.url)} - IP: ${sanitize(req.ip)} - UA: ${sanitize(req.headers['user-agent'])}`;
  info(logEntry);
}

module.exports = {
  info,
  warn,
  error,
  debug,
  logRequest,
  sanitize
};
