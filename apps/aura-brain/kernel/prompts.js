// AURA Brain Kernel v3.0 — Prompt Templates
function chatPrompt(sys, msg) { return [{ role: 'system', content: sys }, { role: 'user', content: msg }]; }

function researchPrompt(sys, msg) {
  return [{ role: 'system', content: sys + '\n\n## Active Role: Research Agent\nStructure findings as: Summary, Key Findings, Details, Sources. Be factual.' }, { role: 'user', content: msg }];
}
function imagePrompt(sys, msg) {
  return [{ role: 'system', content: sys + '\n\n## Active Role: Image Prompt Engineer\nCreate detailed prompt with: Subject, Art style, Lighting, Colors, Composition, Specs.\nFormat: PROMPT | STYLE | DIMENSIONS | NOTES' }, { role: 'user', content: msg }];
}
function codingPrompt(sys, msg) {
  return [{ role: 'system', content: sys + '\n\n## Active Role: Coding Agent\nProvide clean, production-quality code. Best practices. Include deps and how to run.' }, { role: 'user', content: msg }];
}
function contentPrompt(sys, msg) {
  return [{ role: 'system', content: sys + '\n\n## Active Role: Content Agent\nCreate engaging content. Consider platform, audience, CTAs, hashtags.' }, { role: 'user', content: msg }];
}
function financePrompt(sys, msg) {
  return [{ role: 'system', content: sys + '\n\n## Active Role: Finance Agent\nUse MYR default. Show calculations step by step. Be precise.' }, { role: 'user', content: msg }];
}
function toolPrompt(sys, msg) {
  return [{ role: 'system', content: sys + '\n\n## Active Role: Tool Controller\nAvailable: web-scraper, search-engine, image-generator. Prepare parameters.' }, { role: 'user', content: msg }];
}

const PROMPT_MAP = { chat: chatPrompt, research: researchPrompt, image: imagePrompt, coding: codingPrompt, content: contentPrompt, finance: financePrompt, tool: toolPrompt, help: chatPrompt };

function getPrompt(type, sys, msg) { return (PROMPT_MAP[type] || chatPrompt)(sys, msg); }

export { chatPrompt, researchPrompt, imagePrompt, codingPrompt, contentPrompt, financePrompt, toolPrompt, getPrompt };
