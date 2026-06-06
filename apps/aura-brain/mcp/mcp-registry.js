/**
 * @module mcp-registry
 * MCP Tool Registry for Aura-Brain.
 * Loads .tool.json manifest files on startup, builds a tool catalog.
 * Provides lookup by tool name and listing of available tools.
 */

'use strict';

const fs = require('fs');
const path = require('path');

class MCPRegistry {
  constructor(logger) {
    this.tools = new Map();
    this.logger = logger;
  }

  /**
   * Load all .tool.json files from the tools directory.
   * Called on Brain startup.
   */
  load() {
    const toolsDir = path.join(__dirname, 'tools');

    if (!fs.existsSync(toolsDir)) {
      this.logger.warn({ dir: toolsDir }, 'MCP tools directory not found');
      return;
    }

    const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.tool.json'));

    for (const file of files) {
      try {
        const filePath = path.join(toolsDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const manifest = JSON.parse(raw);

        if (!manifest.name) {
          this.logger.warn({ file }, 'Skipping tool manifest without name');
          continue;
        }

        this.tools.set(manifest.name, {
          manifest,
          file: file,
          loaded_at: new Date().toISOString()
        });

        this.logger.info({
          tool: manifest.name,
          phase: manifest.phase,
          status: manifest.status
        }, `MCP tool loaded: ${manifest.name}`);
      } catch (err) {
        this.logger.error({ file, error: err.message }, `Failed to load tool manifest: ${file}`);
      }
    }

    this.logger.info({
      total: this.tools.size,
      active: this.getActiveTools().length,
      placeholder: this.getPlaceholderTools().length
    }, 'MCP Registry loaded');
  }

  /**
   * Look up a tool by name.
   * @param {string} name - Tool name (e.g., 'web-scraper')
   * @returns {Object|null} Tool manifest or null
   */
  lookupTool(name) {
    const entry = this.tools.get(name);
    return entry ? entry.manifest : null;
  }

  /**
   * Check if a tool exists and is active.
   * @param {string} name
   * @returns {boolean}
   */
  isToolActive(name) {
    const manifest = this.lookupTool(name);
    return manifest !== null && manifest.status === 'active';
  }

  /**
   * Get all loaded tools.
   * @returns {Array<Object>}
   */
  getAllTools() {
    return Array.from(this.tools.values()).map(entry => ({
      name: entry.manifest.name,
      version: entry.manifest.version,
      description: entry.manifest.description,
      phase: entry.manifest.phase,
      status: entry.manifest.status,
      executor_service: entry.manifest.executor_service,
      loaded_at: entry.loaded_at
    }));
  }

  /**
   * Get Phase 1 active tools only.
   * @returns {Array<Object>}
   */
  getActiveTools() {
    return this.getAllTools().filter(t => t.status === 'active');
  }

  /**
   * Get Phase 2+ placeholder tools.
   * @returns {Array<Object>}
   */
  getPlaceholderTools() {
    return this.getAllTools().filter(t => t.status === 'placeholder');
  }

  /**
   * Get the input schema for a tool.
   * @param {string} name
   * @returns {Object|null}
   */
  getInputSchema(name) {
    const manifest = this.lookupTool(name);
    return manifest ? manifest.input_schema : null;
  }

  /**
   * Get the executor endpoint for a tool.
   * @param {string} name
   * @returns {string|null}
   */
  getExecutorEndpoint(name) {
    const manifest = this.lookupTool(name);
    return manifest ? manifest.executor_endpoint : null;
  }
}

module.exports = MCPRegistry;
