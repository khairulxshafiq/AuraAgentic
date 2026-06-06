/**
 * @module mcp-health
 * MCP Health Checker for Aura-Brain.
 * Checks tool availability via Hermes GET /tools/health.
 */

'use strict';

class MCPHealth {
  /**
   * @param {string} hermesUrl - Hermes base URL
   * @param {Object} logger - Pino logger
   */
  constructor(hermesUrl, logger) {
    this.hermesUrl = hermesUrl;
    this.logger = logger;
    this.toolStatus = new Map();
    this.lastCheckedAt = null;
  }

  /**
   * Check all tool health via Hermes.
   * @returns {Promise<Map<string, Object>>} Map of tool_name -> status
   */
  async checkAllTools() {
    const url = `${this.hermesUrl}/tools/health`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        this.logger.warn({ status: response.status }, 'Hermes tools health check returned non-OK');
        return this.toolStatus;
      }

      const data = await response.json();
      const tools = data.tools || [];

      this.toolStatus.clear();
      for (const tool of tools) {
        this.toolStatus.set(tool.name, {
          status: tool.status || 'unknown',
          phase: tool.phase,
          checked_at: new Date().toISOString()
        });
      }

      this.lastCheckedAt = new Date().toISOString();
      this.logger.info({
        tools_count: tools.length,
        healthy: tools.filter(t => t.status === 'active').length
      }, 'MCP health check completed');

      return this.toolStatus;
    } catch (error) {
      this.logger.error({ error: error.message }, 'MCP health check failed');
      return this.toolStatus;
    }
  }

  /**
   * Check if a specific tool is available.
   * @param {string} toolName
   * @returns {boolean}
   */
  isToolAvailable(toolName) {
    const status = this.toolStatus.get(toolName);
    return status !== undefined && status.status === 'active';
  }

  /**
   * Get the last check timestamp.
   * @returns {string|null}
   */
  getLastCheckedAt() {
    return this.lastCheckedAt;
  }

  /**
   * Get all tool statuses as a plain object.
   * @returns {Object}
   */
  getStatusReport() {
    const report = {};
    this.toolStatus.forEach((value, key) => {
      report[key] = value;
    });
    return report;
  }
}

module.exports = MCPHealth;
