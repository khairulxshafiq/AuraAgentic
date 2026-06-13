// AURA Brain Kernel v3.0 — Utilities
class Logger {
  constructor(component = 'AURA') { this.component = component; }
  _format(level, msg, data) {
    const ts = new Date().toISOString();
    const prefix = `[${ts}] [${level}] [${this.component}]`;
    return data !== undefined ? `${prefix} ${msg} ${JSON.stringify(data)}` : `${prefix} ${msg}`;
  }
  info(msg, data) { console.log(this._format('INFO', msg, data)); }
  warn(msg, data) { console.warn(this._format('WARN', msg, data)); }
  error(msg, data) { console.error(this._format('ERROR', msg, data)); }
  debug(msg, data) {
    if (process.env.AURA_ENV === 'development') console.log(this._format('DEBUG', msg, data));
  }
}

function estimateTokens(text) { return text ? Math.ceil(String(text).length / 4) : 0; }
function formatDate(date) { return (date || new Date()).toISOString(); }
function sanitizeInput(text) { return text ? String(text).trim().slice(0, 10000) : ''; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function generateTraceId() {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `${hex()}-${hex()}-${Date.now().toString(36)}`;
}
function asyncHandler(fn) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (err) { new Logger('AsyncHandler').error('Unhandled', { message: err.message }); throw err; }
  };
}

export { Logger, estimateTokens, formatDate, sanitizeInput, sleep, generateTraceId, asyncHandler };
