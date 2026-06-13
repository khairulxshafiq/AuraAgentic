// AURA Bridge — Plugin System Wrapper
import { Logger } from '../kernel/utils.js';
const log = new Logger('PluginBridge');

class PluginBridge {
  constructor() {
    this.registry = null;
    this.loader = null;
    this.initialized = false;
  }

  async init() {
    try {
      const registryModule = await import('../plugins/plugin-registry.js');
      this.registry = registryModule.default || registryModule;
      log.info('Plugin registry loaded');
    } catch (err) {
      log.warn('Plugin registry not available', { error: err.message });
    }
    try {
      const loaderModule = await import('../plugins/loader.js');
      this.loader = loaderModule.default || loaderModule;
      log.info('Plugin loader loaded');
    } catch (err) {
      log.warn('Plugin loader not available', { error: err.message });
    }
    this.initialized = true;
  }

  resolve(intent) {
    if (!this.registry) return null;
    try {
      if (typeof this.registry.resolve === 'function') return this.registry.resolve(intent);
      if (typeof this.registry.getPlugin === 'function') return this.registry.getPlugin(intent);
      if (this.registry[intent]) return this.registry[intent];
      return null;
    } catch (err) {
      log.error('Plugin resolve error', { error: err.message });
      return null;
    }
  }

  listActive() {
    if (!this.registry) return [];
    try {
      if (typeof this.registry.listActive === 'function') return this.registry.listActive();
      if (typeof this.registry.getAll === 'function') return this.registry.getAll();
      return [];
    } catch (err) { return []; }
  }

  getStatus() {
    return { initialized: this.initialized, hasRegistry: !!this.registry, hasLoader: !!this.loader };
  }
}

export default PluginBridge;
