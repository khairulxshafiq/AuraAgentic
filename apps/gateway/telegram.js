/**
 * @module telegram
 * Telegram Bot API helper functions.
 * Gateway is the ONLY service that sends messages to Telegram.
 */

'use strict';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Send a text message to a Telegram chat.
 * @param {string} botToken - Telegram bot token
 * @param {string|number} chatId - Chat ID
 * @param {string} text - Message text
 * @param {Object} [options] - Additional options (parse_mode, reply_markup, etc.)
 * @returns {Promise<Object>} Telegram API response
 */
async function sendMessage(botToken, chatId, text, options = {}) {
  const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;

  // Telegram message limit is 4096 characters
  const truncatedText = text.length > 4000
    ? text.substring(0, 4000) + '\n\n... [truncated]'
    : text;

  const body = {
    chat_id: chatId,
    text: truncatedText,
    parse_mode: options.parse_mode || 'Markdown',
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!data.ok) {
      // Retry without markdown if parse failed
      if (data.description && data.description.includes('parse')) {
        body.parse_mode = undefined;
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        return await retryResponse.json();
      }
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Failed to send Telegram message: ${error.message}`);
  }
}

/**
 * Send typing indicator to a chat.
 * @param {string} botToken
 * @param {string|number} chatId
 */
async function sendTypingAction(botToken, chatId) {
  const url = `${TELEGRAM_API_BASE}${botToken}/sendChatAction`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });
  } catch (_) {
    // Ignore typing indicator failures
  }
}

/**
 * Parse incoming Telegram webhook message.
 * @param {Object} body - Webhook body
 * @returns {Object|null} Parsed message with chat_id, text, from, message_id
 */
function parseWebhookMessage(body) {
  const message = body.message || body.edited_message;
  if (!message) return null;

  const text = message.text || message.caption || '';
  if (!text) return null;

  return {
    chat_id: String(message.chat.id),
    text,
    from: {
      id: message.from?.id,
      first_name: message.from?.first_name || '',
      last_name: message.from?.last_name || '',
      username: message.from?.username || '',
      language_code: message.from?.language_code || 'en'
    },
    message_id: message.message_id,
    date: message.date
  };
}

module.exports = { sendMessage, sendTypingAction, parseWebhookMessage };
