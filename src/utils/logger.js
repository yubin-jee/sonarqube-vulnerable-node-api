function sanitize(input) {
  if (typeof input !== 'string') return String(input);
  return input
    .replace(/[\r\n]/g, '_')
    .replace(/[\x00-\x1F\x7F]/g, '');
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
  const method = sanitize(req.method);
  const url = sanitize(req.url);
  const ip = sanitize(req.ip);
  const ua = sanitize(req.headers['user-agent'] || '');
  const logEntry = `${method} ${url} - IP: ${ip} - UA: ${ua}`;
  info(logEntry);
}

module.exports = {
  info,
  warn,
  error,
  debug,
  logRequest
};
