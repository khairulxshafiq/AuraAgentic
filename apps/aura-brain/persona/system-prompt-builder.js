const fs = require('fs');
const path = require('path');

const PERSONA_KERNEL = fs.readFileSync(
  path.join(__dirname, 'persona-kernel.md'),
  'utf-8'
);

function buildSystemPrompt({ userMessage, conversationHistory, userPreferences, memories }) {
  const language = detectLanguage(userMessage || '');
  const complexity = detectComplexity(userMessage || '');

  const systemPrompt = `
${PERSONA_KERNEL}

## CURRENT CONTEXT
- User Language: ${language}
- Response Complexity: ${complexity}
- Conversation Turn: ${conversationHistory?.length || 0}

## CONVERSATION HISTORY (Last 5 turns)
${formatHistory(conversationHistory)}

## USER PREFERENCES
${userPreferences ? JSON.stringify(userPreferences, null, 2) : 'None loaded yet'}

## RELEVANT MEMORIES
${memories?.length ? memories.map(m => `- ${m.content}`).join('\n') : 'No relevant memories'}

## INSTRUCTIONS FOR THIS TURN
- Respond in: ${language === 'malay' ? 'Casual Malay (bukan formal/textbook)' : language === 'mixed' ? 'Manglish' : 'English'}
- Response length: ${complexity === 'simple' ? 'SHORT (1-3 sentences)' : complexity === 'medium' ? 'MEDIUM (1-2 paragraphs)' : 'DETAILED (structured)'}
- Follow ALL Anti-Robot Rules from persona kernel
- Be AURA, not a generic assistant
`.trim();

  return systemPrompt;
}

function detectLanguage(message) {
  const malayIndicators = /\b(aku|kau|nak|tak|boleh|macam|mana|apa|kenapa|dekat|ni|tu|je|dah|lah|kot|kan)\b/i;
  const englishIndicators = /\b(the|is|are|what|where|how|can|please|would|could|should)\b/i;

  const malayScore = (message.match(malayIndicators) || []).length;
  const englishScore = (message.match(englishIndicators) || []).length;

  if (malayScore > 0 && englishScore > 0) return 'mixed';
  if (malayScore > englishScore) return 'malay';
  return 'english';
}

function detectComplexity(message) {
  if (!message) return 'simple';
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount <= 5) return 'simple';
  if (wordCount <= 20) return 'medium';
  return 'complex';
}

function formatHistory(history) {
  if (!history || history.length === 0) return 'No previous conversation';
  return history.slice(-5).map((turn, index) =>
    `Turn ${index + 1}:\n  User: ${turn.user_message || ''}\n  AURA: ${(turn.bot_response || '').substring(0, 200)}...`
  ).join('\n');
}

module.exports = { buildSystemPrompt, detectLanguage, detectComplexity };