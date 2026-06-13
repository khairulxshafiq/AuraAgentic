// AURA Brain Kernel v3.0 — Reasoning Engine
import { Logger } from './utils.js';
const log = new Logger('Reasoning');
const MODES = { FAST: 'fast', DEEP: 'deep' };
const MAP = { chat:'fast', help:'fast', coding:'fast', content:'fast', finance:'fast', research:'deep', image:'deep', tool:'deep' };

class ReasoningEngine {
  constructor() { log.info('ReasoningEngine initialized'); }

  buildPlan(intent, intentResult, message) {
    const mode = MAP[intent] || 'fast';
    let steps = [], reasoning = '';

    if (intent === 'research') { reasoning = 'Delegate to CrewAI Research.'; steps = [{ action: 'delegate', target: 'crew-research', params: { message, intent } }]; }
    else if (intent === 'image') { reasoning = 'Delegate to CrewAI Image.'; steps = [{ action: 'delegate', target: 'crew-image', params: { message, intent } }]; }
    else if (intent === 'tool') { reasoning = 'Delegate to Hermes.'; steps = [{ action: 'execute', target: 'hermes', params: { message, intent } }]; }
    else { reasoning = `Handle ${intent} with LLM.`; steps = [{ action: 'llm', target: 'direct', params: { message, intent, promptType: intent === 'help' ? 'chat' : intent } }]; }

    const plan = { steps, mode, intent, reasoning, confidence: intentResult?.confidence||0, stepCount: steps.length, timestamp: Date.now() };
    log.debug('Plan built', { intent, mode, reasoning });
    return plan;
  }

  requiresDelegation(plan) { return plan.mode === 'deep'; }
}

export default ReasoningEngine;
