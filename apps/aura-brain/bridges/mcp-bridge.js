// AURA Bridge — MCP Tool System Wrapper
// SAFETY: Filters out Phase 2 placeholder tools to prevent crashes
import { Logger } from '../kernel/utils.js';
const log = new Logger('McpBridge');

class McpBridge {
  constructor(activeTools = []) {
    this.activeTools = activeTools;
    this.registry = null;
    this.client = null;
    this.initialized = false;
  }

  async init() {
    try {
      const regModule = await import('../mcp/mcp-registry.js');
      this.registry = regModule.default || regModule;
      log.info('MCP registry loaded');
    } catch (err) {
      log.warn('MCP registry not available', { error: err.message });
    }
    try {
      const clientModule = await import('../mcp/mcp-client.js');
      this.client = clientModule.default || clientModule;
      log.info('MCP client loaded');
    } catch (err) {
      log.warn('MCP client not available', { error: err.message });
    }
    this.initialized = true;
  }

  getActiveTools() {
    return [...this.activeTools];
  }

  isToolSafe(toolName) {
    return this.activeTools.includes(toolName);
  }

  async dispatch(toolName, params) {
    if (!this.isToolSafe(toolName)) {
      log.warn('BLOCKED: Attempted to dispatch Phase 2 placeholder tool', { toolName });
      return { success: false, error: `Tool "${toolName}" is not active (Phase 2 placeholder). Blocked for safety.` };
    }
    if (!this.client) {
      return { success: false, error: 'MCP client not available' };
    }
    try {
      if (typeof this.client.dispatch === 'function') {
        const result = await this.client.dispatch(toolName, params);
        return { success: true, data: result };
      }
      if (typeof this.client.execute === 'function') {
        const result = await this.client.execute(toolName, params);
        return { success: true, data: result };
      }
      return { success: false, error: 'MCP client has no dispatch/execute method' };
    } catch (err) {
      log.error('MCP dispatch error', { toolName, error: err.message });
      return { success: false, error: err.message };
    }
  }

  getStatus() {
    return { initialized: this.initialized, activeTools: this.activeTools, hasRegistry: !!this.registry, hasClient: !!this.client };
  }
}

export default McpBridge;
