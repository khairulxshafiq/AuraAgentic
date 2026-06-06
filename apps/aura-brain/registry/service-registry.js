/**
 * @module registry/service-registry
 * Service Registry — Tracks health of agent services and Hermes.
 * Phase 1: Static URLs + periodic health polling.
 */

'use strict';

class ServiceRegistry {
  constructor(logger) {
    this.services = new Map();
    this.logger = logger;
  }

  /**
   * Initialize registry with static service configurations.
   * @param {Object} serviceConfigs - Map of name -> {url, agents_count}
   */
  init(serviceConfigs) {
    for (const [name, config] of Object.entries(serviceConfigs)) {
      this.services.set(name, {
        service_name: name,
        url: config.url,
        status: 'unknown',
        capabilities: config.capabilities || [],
        version: '1.0.0',
        agents_count: config.agents_count || 0,
        last_checked_at: null,
        endpoints: {
          execute: '/execute',
          health: '/health'
        }
      });
    }
    this.logger.info({ services: this.getServiceNames() }, 'Service Registry initialized');
  }

  /**
   * Check health of all registered services.
   */
  async checkAllHealth() {
    const checks = [];

    for (const [name, service] of this.services) {
      checks.push(this._checkServiceHealth(name, service));
    }

    await Promise.allSettled(checks);
  }

  /**
   * Check health of a single service.
   */
  async _checkServiceHealth(name, service) {
    const url = `${service.url}/health`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        service.status = 'healthy';
        service.version = data.version || '1.0.0';
        service.agents_count = data.agents_count || service.agents_count;
        service.last_checked_at = new Date().toISOString();
        this.logger.debug({ service: name, status: 'healthy' }, `${name} is healthy`);
      } else {
        service.status = 'unhealthy';
        service.last_checked_at = new Date().toISOString();
        this.logger.warn({ service: name, status: response.status }, `${name} health check failed`);
      }
    } catch (error) {
      service.status = 'down';
      service.last_checked_at = new Date().toISOString();
      this.logger.warn({ service: name, error: error.message }, `${name} is down`);
    }
  }

  /**
   * Check if a service is healthy.
   * @param {string} name
   * @returns {boolean}
   */
  isServiceHealthy(name) {
    const service = this.services.get(name);
    return service !== undefined && service.status === 'healthy';
  }

  /**
   * Get service URL.
   * @param {string} name
   * @returns {string|null}
   */
  getServiceUrl(name) {
    const service = this.services.get(name);
    return service ? service.url : null;
  }

  /**
   * Get service status.
   * @param {string} name
   * @returns {Object|null}
   */
  getServiceStatus(name) {
    return this.services.get(name) || null;
  }

  /**
   * Get all service names.
   * @returns {Array<string>}
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Get full registry state.
   * @returns {Object}
   */
  getRegistryState() {
    const services = [];
    this.services.forEach((service) => {
      services.push({ ...service });
    });
    return {
      services,
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = ServiceRegistry;
