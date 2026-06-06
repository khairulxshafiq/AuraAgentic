/**
 * @module routes/telegram
 * POST /telegram — Telegram webhook handler.
 * Receives webhook, generates trace_id, forwards to Brain, sends response to Telegram.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { generateTraceId, nowISO } = require('@aura/shared-utils');
const { createGatewayRequest } = require('@aura/shared-types');
const { sendMessage, sendTypingAction, parseWebhookMessage } = require('../telegram');
const { authMiddleware } = require('../middleware/auth');
const { rateLimitMiddleware } = require('../middleware/rate-limit');

// Apply middleware
router.use(authMiddleware());
router.use(rateLimitMiddleware());

router.post('/', async (req, res) => {
  const config = req.app.locals.config;
  const logger = req.app.locals.logger;

  // Immediately acknowledge webhook to Telegram (prevent timeout)
  res.status(200).json({ ok: true });

  try {
    // Parse message
    const parsed = parseWebhookMessage(req.body);
    if (!parsed) {
      logger.debug('No processable message in webhook');
      return;
    }

    const { chat_id, text, from, message_id } = parsed;
    const trace_id = generateTraceId();

    logger.info({
      trace_id, chat_id, message_id,
      user: from.first_name,
      text: text.substring(0, 100)
    }, 'Telegram message received');

    // Send typing indicator
    await sendTypingAction(config.telegramBotToken, chat_id);

    // Build Gateway-to-Brain request
    const gatewayRequest = createGatewayRequest({
      trace_id,
      chat_id,
      user_message: text,
      source: 'telegram',
      message_id: String(message_id),
      timestamp: nowISO(),
      user_metadata: {
        first_name: from.first_name,
        last_name: from.last_name,
        username: from.username,
        language_code: from.language_code
      }
    });

    // Forward to Brain
    const brainUrl = `${config.brainUrl}/process`;
    logger.info({ trace_id, brainUrl }, 'Forwarding to Brain');

    const brainResponse = await fetch(brainUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gatewayRequest)
    });

    if (!brainResponse.ok) {
      const errorText = await brainResponse.text();
      logger.error({ trace_id, status: brainResponse.status, error: errorText }, 'Brain returned error');
      await sendMessage(config.telegramBotToken, chat_id,
        'I encountered an issue processing your request. Please try again.');
      return;
    }

    const brainResult = await brainResponse.json();

    // Send final response to Telegram
    const responseText = brainResult.response || brainResult.summary || 'I processed your request but have no response to show.';

    await sendMessage(config.telegramBotToken, chat_id, responseText);

    logger.info({
      trace_id, chat_id,
      status: brainResult.status,
      mode: brainResult.metadata?.mode
    }, 'Response sent to Telegram');

  } catch (error) {
    logger.error({ error: error.message }, 'Telegram webhook processing error');
    try {
      const chatId = req.body?.message?.chat?.id;
      if (chatId) {
        await sendMessage(config.telegramBotToken, chatId,
          'Sorry, I encountered an unexpected error. Please try again.');
      }
    } catch (_) {
      // Ignore error-reporting errors
    }
  }
});

module.exports = router;
