/**
 * @module routes/reply
 * POST /telegram/reply — Receives async responses from Brain/Worker and forwards to Telegram.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { sendMessage } = require('../telegram');

router.post('/', async (req, res) => {
  const config = req.app.locals.config;
  const logger = req.app.locals.logger;

  const { chat_id, response, trace_id } = req.body;

  if (!chat_id || !response) {
    logger.warn({ trace_id, body: req.body }, 'Reply request missing chat_id or response');
    return res.status(400).json({ status: 'error', error: 'Missing chat_id or response' });
  }

  logger.info({ trace_id, chat_id }, 'Sending async reply to Telegram');

  try {
    await sendMessage(config.telegramBotToken, chat_id, response);
    res.json({ status: 'success' });
  } catch (error) {
    logger.error({ trace_id, chat_id, error: error.message }, 'Failed to send async Telegram message');
    res.status(500).json({ status: 'error', error: error.message });
  }
});

module.exports = router;
