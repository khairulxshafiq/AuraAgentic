// AURA Bridge — CrewAI Services (Research + Image)
import { Logger } from '../kernel/utils.js';
const log = new Logger('CrewBridge');

class CrewBridge {
  constructor(serviceConfig) {
    this.researchUrl = serviceConfig.researchCrewUrl;
    this.imageUrl = serviceConfig.imageCrewUrl;
    log.info('CrewBridge initialized', { research: !!this.researchUrl, image: !!this.imageUrl });
  }

  async research(payload) {
    if (!this.researchUrl) return { success: false, data: null, error: 'RESEARCH_CREW_URL not configured' };
    return this._call(this.researchUrl, payload, 30000, 'research');
  }

  async image(payload) {
    if (!this.imageUrl) return { success: false, data: null, error: 'IMAGE_CREW_URL not configured' };
    return this._call(this.imageUrl, payload, 15000, 'image');
  }

  async _call(url, payload, timeoutMs, type) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const endpoint = url.replace(/\/$/, '') + '/process';
      log.info(`Calling CrewAI ${type}`, { url: endpoint });
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text();
        log.error(`CrewAI ${type} error`, { status: res.status, body });
        return { success: false, data: null, error: `CrewAI ${type} returned ${res.status}` };
      }
      const data = await res.json();
      log.info(`CrewAI ${type} success`);
      return { success: true, data, error: null };
    } catch (err) {
      clearTimeout(timeout);
      const msg = err.name === 'AbortError' ? `CrewAI ${type} timeout (${timeoutMs}ms)` : err.message;
      log.error(`CrewAI ${type} failed`, { error: msg });
      return { success: false, data: null, error: msg };
    }
  }
}

export default CrewBridge;
