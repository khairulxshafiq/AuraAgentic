// AURA Bridge — Hermes Tool Executor
import { Logger } from '../kernel/utils.js';
const log = new Logger('HermesBridge');

class HermesBridge {
  constructor(serviceConfig, activeTools = []) {
    this.hermesUrl = serviceConfig.hermesUrl;
    this.activeTools = activeTools;
    log.info('HermesBridge initialized', { url: !!this.hermesUrl, activeTools: this.activeTools });
  }

  async execute(payload) {
    if (!this.hermesUrl) return { success: false, data: null, error: 'HERMES_URL not configured' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const endpoint = this.hermesUrl.replace(/\/$/, '') + '/tools/execute';
      log.info('Calling Hermes', { url: endpoint });
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, activeTools: this.activeTools }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text();
        log.error('Hermes error', { status: res.status, body });
        return { success: false, data: null, error: `Hermes returned ${res.status}` };
      }
      const data = await res.json();
      log.info('Hermes success');
      return { success: true, data, error: null };
    } catch (err) {
      clearTimeout(timeout);
      const msg = err.name === 'AbortError' ? 'Hermes timeout (20s)' : err.message;
      log.error('Hermes failed', { error: msg });
      return { success: false, data: null, error: msg };
    }
  }

  isToolActive(toolName) { return this.activeTools.includes(toolName); }
}

export default HermesBridge;
