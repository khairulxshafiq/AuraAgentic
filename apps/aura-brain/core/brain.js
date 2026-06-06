/**
 * @module core/brain
 * Core LLM reasoning module. Handles intent detection and direct LLM responses.
 * Uses OpenRouter API for LLM inference.
 */

'use strict';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-flash-1.5';

class Brain {
  /**
   * @param {Object} config - Brain config from shared-config
   * @param {Object} logger - Pino logger
   */
  constructor(config, logger) {
    this.apiKey = config.openrouterApiKey;
    this.model = DEFAULT_MODEL;
    this.logger = logger;
  }

  /**
   * Call OpenRouter LLM API.
   * @param {Array} messages - Chat messages array [{role, content}]
   * @param {Object} [options] - Additional options
   * @returns {Promise<string>} LLM response text
   */
  async callLLM(messages, options = {}) {
    const model = options.model || this.model;
    const temperature = options.temperature || 0.7;
    const maxTokens = options.max_tokens || 2000;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://aura-brain.up.railway.app',
        'X-Title': 'AURA Brain'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    return { content, tokensUsed, model };
  }

  /**
   * Detect user intent from a message.
   * @param {string} userMessage - User's message
   * @param {Array} registeredIntents - All registered plugin intents
   * @param {Array} [conversationHistory] - Recent conversation history
   * @returns {Promise<Object>} {intent, confidence, entities}
   */
  async detectIntent(userMessage, registeredIntents, conversationHistory = []) {
    const intentList = registeredIntents.join(', ');

    const systemPrompt = `You are AURA's intent classifier. Analyze the user's message and classify it into one of these intents:

Available intents: ${intentList}

If the message doesn't match any specific intent, classify as "chat" (general conversation).

Respond with ONLY a JSON object (no markdown, no code blocks):
{"intent": "detected_intent", "confidence": 0.0 to 1.0, "entities": {"key": "value"}}

Examples:
- "Hello" => {"intent": "chat", "confidence": 0.95, "entities": {}}
- "Research example.com" => {"intent": "research_website", "confidence": 0.92, "entities": {"url": "example.com"}}
- "Create an image for my product" => {"intent": "build_image", "confidence": 0.88, "entities": {"subject": "product"}}
- "Research this site and create image" => {"intent": "multi_step_campaign", "confidence": 0.85, "entities": {"actions": ["research", "image"]}}`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent conversation history for context
    for (const msg of conversationHistory.slice(-5)) {
      messages.push({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.content || msg.user_message || msg.bot_response || ''
      });
    }

    messages.push({ role: 'user', content: userMessage });

    try {
      const { content, tokensUsed } = await this.callLLM(messages, {
        temperature: 0.3,
        max_tokens: 200
      });

      // Parse JSON response
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      this.logger.info({
        intent: parsed.intent,
        confidence: parsed.confidence,
        tokens: tokensUsed
      }, 'Intent detected');

      return {
        intent: parsed.intent || 'chat',
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || {}
      };
    } catch (error) {
      this.logger.error({ error: error.message }, 'Intent detection failed, defaulting to chat');
      return {
        intent: 'chat',
        confidence: 0.3,
        entities: {}
      };
    }
  }

  /**
   * Generate a direct LLM response (for simple chat/Q&A).
   * @param {string} userMessage
   * @param {string} systemPrompt - AURA persona system prompt
   * @param {Array} conversationHistory
   * @param {Array} memories - Relevant memories
   * @returns {Promise<Object>} {content, tokensUsed, model}
   */
  async generateDirectResponse(userMessage, systemPrompt, conversationHistory = [], memories = []) {
    const messages = [{ role: 'system', content: systemPrompt }];

    // Inject memories as context
    if (memories.length > 0) {
      const memoryContext = memories.map(m => `- ${m.content}`).join('\n');
      messages.push({
        role: 'system',
        content: `Relevant memories about the user:\n${memoryContext}`
      });
    }

    // Add conversation history
    for (const msg of conversationHistory.slice(-10)) {
      if (msg.user_message) {
        messages.push({ role: 'user', content: msg.user_message });
      }
      if (msg.bot_response) {
        messages.push({ role: 'assistant', content: msg.bot_response });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    return await this.callLLM(messages);
  }
}

module.exports = Brain;
