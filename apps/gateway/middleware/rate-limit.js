/**
 * @module middleware/rate-limit
 * In-memory per-user rate limiting for Gateway.
 * Max 30 requests per minute per user.
 */

'use strict';

const WINDOW_MS = 60 * 1000;  // 1 minute
const MAX_REQUESTS = 30;

// In-memory store: userId -> {count, windowStart}
const store = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware.
 * @returns {Function} Express middleware
 */
function rateLimitMiddleware() {
  return (req, res, next) => {
    // Extract user ID from Telegram message body
    const chatId = req.body?.message?.chat?.id ||
                   req.body?.edited_message?.chat?.id ||
                   req.body?.callback_query?.message?.chat?.id ||
                   'unknown';

    const userId = String(chatId);
    const now = Date.now();

    let entry = store.get(userId);

    if (!entry || (now - entry.windowStart) > WINDOW_MS) {
      // New window
      entry = { count: 1, windowStart: now };
      store.set(userId, entry);
      return next();
    }

    entry.count++;

    if (entry.count > MAX_REQUESTS) {
      const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please wait ${retryAfter} seconds.`,
        retry_after_seconds: retryAfter
      });
    }

    next();
  };
}

module.exports = { rateLimitMiddleware };
