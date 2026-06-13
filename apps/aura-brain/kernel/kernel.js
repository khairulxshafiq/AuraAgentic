// AURA Brain Kernel v3.0 — Core Orchestrator
import config from './config.js';
import { Logger, sanitizeInput, generateTraceId } from './utils.js';
import { buildSystemPrompt } from './persona.js';
import { getPrompt } from './prompts.js';

const log = new Logger('Kernel');

class BrainKernel {
  constructor({ memory, context, router, reasoning, bridges }) {
    this.memory = memory;
    this.context = context;
    this.router = router;
    this.reasoning = reasoning;
    this.bridges = bridges || {};
    this.startTime = Date.now();
    log.info('BrainKernel v3.0 initialized', {
      engine: 'kernel', model: config.openrouter.model,
      memoryEnabled: memory?.enabled || false,
      bridges: Object.keys(this.bridges),
    });
  }

  async process(userId, message) {
    const traceId = generateTraceId();
    const startTime = Date.now();
    log.info(`[${traceId}] Processing`, { userId, len: message?.length });

    try {
      // STEP 1: Sanitize
      const clean = sanitizeInput(message);
      if (!clean) return this._result('Maaf, mesej kosong. Cuba lagi?', 'chat', null, traceId, startTime);

      // STEP 2: Load Memory
      const recentConvos = await this.memory.getRecentConversations(userId, 10);
      const memories = await this.memory.searchMemories(clean, userId, 3);
      const memSnippets = memories.map(m => m.content).filter(Boolean);

      // STEP 3: Build Context
      this.context.clear();
      this.context.loadFromMemory(recentConvos);
      this.context.addMessage('user', clean);

      // STEP 4: System Prompt
      const sysPrompt = buildSystemPrompt({ memoryContext: memSnippets });

      // STEP 5: Classify Intent
      const intentResult = this.router.classify(clean);
      log.info(`[${traceId}] Intent: ${intentResult.intent} (${intentResult.confidence})`);

      // STEP 6: Build Plan
      const plan = this.reasoning.buildPlan(intentResult.intent, intentResult, clean);
      log.info(`[${traceId}] Plan: ${plan.mode}, ${plan.stepCount} steps`);

      // STEP 7: Execute
      let response = '';
      for (const step of plan.steps) {
        log.debug(`[${traceId}] Step: ${step.action} -> ${step.target}`);

        if (step.action === 'llm') {
          const promptType = step.params?.promptType || 'chat';
          const history = this.context.getWindow(null).filter(m => m.role !== 'system');
          const enhanced = getPrompt(promptType, sysPrompt, clean);
          const finalMessages = [enhanced[0], ...history, enhanced[enhanced.length - 1]];
          response = await this._callLLM(finalMessages);

        } else if (step.action === 'delegate' && step.target === 'crew-research') {
          if (this.bridges.crew) {
            const r = await this.bridges.crew.research({ message: clean, userId, traceId, intent: intentResult.intent });
            if (r.success) { response = r.data?.report || r.data?.result || JSON.stringify(r.data); }
            else { response = await this._callLLM(getPrompt('research', sysPrompt, clean)); }
          } else { response = await this._callLLM(getPrompt('research', sysPrompt, clean)); }

        } else if (step.action === 'delegate' && step.target === 'crew-image') {
          if (this.bridges.crew) {
            const r = await this.bridges.crew.image({ message: clean, userId, traceId, intent: intentResult.intent });
            if (r.success) { response = r.data?.prompt || r.data?.result || JSON.stringify(r.data); }
            else { response = await this._callLLM(getPrompt('image', sysPrompt, clean)); }
          } else { response = await this._callLLM(getPrompt('image', sysPrompt, clean)); }

        } else if (step.action === 'execute' && step.target === 'hermes') {
          if (this.bridges.hermes) {
            const r = await this.bridges.hermes.execute({ message: clean, userId, traceId });
            if (r.success) { response = typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2); }
            else { response = await this._callLLM(getPrompt('tool', sysPrompt, clean)); }
          } else { response = await this._callLLM(getPrompt('chat', sysPrompt, clean)); }

        } else {
          response = await this._callLLM(getPrompt('chat', sysPrompt, clean));
        }
      }

      // STEP 8: Save Memory
      await this.memory.saveConversation(userId, 'user', clean, { intent: intentResult.intent, traceId });
      await this.memory.saveConversation(userId, 'assistant', response, { intent: intentResult.intent, traceId, mode: plan.mode, executionTime: Date.now() - startTime });
      await this.memory.saveActivity(userId, 'process_message', { intent: intentResult.intent, mode: plan.mode, traceId, executionTime: Date.now() - startTime });

      // STEP 9: Return
      return this._result(response, intentResult.intent, plan, traceId, startTime);

    } catch (err) {
      log.error(`[${traceId}] Error`, { message: err.message, stack: err.stack });
      return this._result('Maaf, ada masalah teknikal. Cuba hantar mesej sekali lagi.', 'error', null, traceId, startTime, err.message);
    }
  }

  async _callLLM(messages) {
    const url = `${config.openrouter.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeouts.llm);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openrouter.apiKey}`,
          'HTTP-Referer': 'https://aura.matrol.dev',
          'X-Title': 'AURA Agentic AI',
        },
        body: JSON.stringify({
          model: config.openrouter.model,
          messages, temperature: config.openrouter.temperature,
          max_tokens: config.openrouter.maxTokens,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) { const body = await res.text(); log.error('LLM error', { status: res.status, body }); throw new Error(`LLM ${res.status}`); }
      const data = await res.json();
      log.debug('LLM response', { model: data.model, tokens: data.usage?.total_tokens });
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('LLM timeout');
      throw err;
    }
  }

  _result(response, intent, plan, traceId, startTime, error = null) {
    return {
      response, intent,
      plan: plan ? { mode: plan.mode, steps: plan.stepCount, reasoning: plan.reasoning } : null,
      executionTime: Date.now() - startTime, traceId,
      memoryUpdated: true, engine: 'kernel-v3', error,
    };
  }

  getStatus() {
    return {
      engine: 'kernel-v3', uptime: Date.now() - this.startTime,
      model: config.openrouter.model,
      memory: this.memory?.getStatus() || { enabled: false },
      context: this.context?.getStats() || {},
      intents: this.router?.getSupportedIntents() || [],
      bridges: Object.keys(this.bridges),
    };
  }
}

export default BrainKernel;
