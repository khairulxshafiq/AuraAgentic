// apps/aura-brain/persona/response-formatter.js

const BANNED_PHRASES = [
  'sila beritahu saya',
  'jika anda mempunyai',
  'adakah anda mempunyai soalan lain',
  'jangan teragak-agak untuk bertanya',
  'saya di sini untuk membantu',
  'sudah tentu!',
  'tentu sekali!',
  'dengan senang hati',
  'saya harap ini membantu',
  'jika anda ingin tahu lebih lanjut',
  'as an ai language model',
  'i\'m just an ai',
  'i don\'t have personal',
];

const BANNED_PATTERNS = [
  /^(Baiklah|Tentu|Sudah tentu|Dengan senang hati)[!,.]?\s*/i,
  /Sila beritahu saya[.!]?\s*$/i,
  /Jika anda mempunyai.*soalan.*$/i,
  /Adakah anda mempunyai.*\?$/i,
  /Jangan teragak-agak.*$/i,
];

function formatResponse(rawResponse) {
  let cleaned = rawResponse;
  
  // Remove banned phrases
  for (const phrase of BANNED_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remove banned patterns
  for (const pattern of BANNED_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // If response became too short after cleaning, return original
  // (better to be robot than silent)
  if (cleaned.length < 10 && rawResponse.length > 10) {
    return rawResponse.trim();
  }
  
  return cleaned;
}

function detectRobotResponse(response) {
  // Detect if response is a canned/template response
  const robotIndicators = [
    /Brand consistency score: \d+\.\d+/i,
    /Image prompt generated —.*photorealistic/i,
    /^(Ya|Tidak|Betul|Salah)[.!]\s*$/,
  ];
  
  for (const pattern of robotIndicators) {
    if (pattern.test(response)) {
      return { isRobot: true, pattern: pattern.toString() };
    }
  }
  
  return { isRobot: false };
}

module.exports = { formatResponse, detectRobotResponse, BANNED_PHRASES };
