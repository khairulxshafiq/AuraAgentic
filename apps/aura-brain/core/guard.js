/**
 * @module core/guard
 * Response quality guardrails. Filters responses for quality, safety, completeness.
 */

'use strict';

const BLOCKED_PATTERNS = [
  /^I('m| am) (just )?an? (AI|language model|assistant)/i,
  /^As an AI/i,
  /^I('m| am) sorry,? (but )?I (can't|cannot|don't)/i,
  /^I do not have (the ability|access)/i,
  /^Unfortunately,? I/i
];

const UNSAFE_PATTERNS = [
  /\b(password|api[_\s]?key|secret[_\s]?key|token)\s*[:=]\s*\S+/i,
  /\b(SUPABASE|OPENROUTER|TELEGRAM)_\w+\s*[:=]/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /eyJhbGciOi[a-zA-Z0-9._-]+/
];

const MIN_RESPONSE_LENGTH = 5;
const MAX_RESPONSE_LENGTH = 4000;

/**
 * Check a response against guardrails.
 * @param {string} response - Response text to check
 * @returns {Object} {passed: boolean, reason: string|null, filtered_response: string}
 */
function checkResponse(response) {
  // Null/undefined check
  if (!response) {
    return {
      passed: false,
      reason: 'Response is null or undefined',
      filtered_response: 'I apologize, but I was unable to generate a response. Please try again.'
    };
  }

  const text = String(response).trim();

  // Empty or too short
  if (text.length < MIN_RESPONSE_LENGTH) {
    return {
      passed: false,
      reason: `Response too short (${text.length} chars, minimum ${MIN_RESPONSE_LENGTH})`,
      filtered_response: 'I apologize, but I was unable to generate a meaningful response. Please try rephrasing your request.'
    };
  }

  // Check blocked patterns (generic AI disclaimers)
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        passed: false,
        reason: `Response matches blocked pattern: ${pattern}`,
        filtered_response: text.replace(pattern, '').trim() || 'Let me help you with that. Could you provide more details?'
      };
    }
  }

  // Check unsafe patterns (leaked credentials)
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        passed: false,
        reason: 'Response contains potentially sensitive data',
        filtered_response: text.replace(pattern, '[REDACTED]')
      };
    }
  }

  // Truncate if too long (for Telegram)
  let finalText = text;
  if (finalText.length > MAX_RESPONSE_LENGTH) {
    finalText = finalText.substring(0, MAX_RESPONSE_LENGTH - 20) + '\n\n... [truncated]';
  }

  return {
    passed: true,
    reason: null,
    filtered_response: finalText
  };
}

module.exports = { checkResponse };
