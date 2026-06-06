/**
 * @module middleware/auth
 * Authentication middleware for Gateway.
 * Validates Telegram webhook requests.
 */

'use strict';

/**
 * Basic authentication middleware.
 * For Telegram webhooks, validates that the request has expected structure.
 * @returns {Function} Express middleware
 */
function authMiddleware() {
  return (req, res, next) => {
    // For Telegram webhooks, validate basic structure
    if (req.path.startsWith('/telegram')) {
      const body = req.body;

      // Check that body exists and has update_id (Telegram requirement)
      if (!body || (!body.message && !body.edited_message && !body.callback_query)) {
        return res.status(400).json({ error: 'Invalid Telegram webhook payload' });
      }
    }

    next();
  };
}

module.exports = { authMiddleware };
