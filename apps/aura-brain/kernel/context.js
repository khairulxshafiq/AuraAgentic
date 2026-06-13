// AURA Brain Kernel v3.0 — Context Manager
import config from './config.js';
import { Logger, estimateTokens } from './utils.js';
const log = new Logger('Context');

class ContextManager {
  constructor(opts = {}) {
    this.windowSize = opts.windowSize || config.context.windowSize;
    this.tokenBudget = opts.tokenBudget || config.context.tokenBudget;
    this.messages = [];
    log.info('ContextManager init', { windowSize: this.windowSize, tokenBudget: this.tokenBudget });
  }

  addMessage(role, content) {
    if (!content) return;
    this.messages.push({ role, content: String(content), tokens: estimateTokens(content), timestamp: Date.now() });
    while (this.messages.length > this.windowSize) {
      const idx = this.messages.findIndex(m => m.role !== 'system');
      if (idx >= 0) this.messages.splice(idx, 1); else break;
    }
  }

  loadFromMemory(conversations) {
    if (!Array.isArray(conversations)) return;
    const sorted = [...conversations].sort((a, b) => new Date(a.created_at||0) - new Date(b.created_at||0));
    for (const c of sorted) { if (c.role && c.content) this.addMessage(c.role, c.content); }
  }

  getWindow(systemPrompt) {
    const result = []; let used = 0;
    if (systemPrompt) { result.push({ role: 'system', content: systemPrompt }); used += estimateTokens(systemPrompt); }
    const rev = [...this.messages.filter(m => m.role !== 'system')].reverse();
    const buf = [];
    for (const msg of rev) { if (used + msg.tokens > this.tokenBudget) break; buf.unshift({ role: msg.role, content: msg.content }); used += msg.tokens; }
    result.push(...buf);
    return result;
  }

  clear() { this.messages = []; }
  getStats() {
    const t = this.messages.reduce((s, m) => s + m.tokens, 0);
    return { messageCount: this.messages.length, estimatedTokens: t, tokenBudget: this.tokenBudget, budgetUsage: Math.round(t/this.tokenBudget*100)+'%' };
  }
}

export default ContextManager;
