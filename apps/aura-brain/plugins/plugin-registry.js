/**
 * @module plugins/plugin-registry
 * Plugin Registry — Registers, looks up, and manages plugins.
 * Builds intent-to-plugin and keyword-to-plugin lookup tables.
 */

'use strict';

class PluginRegistry {
  constructor(logger) {
    this.plugins = new Map();        // name -> plugin manifest
    this.intentMap = new Map();      // intent -> plugin name
    this.keywordMap = new Map();     // keyword -> plugin name
    this.logger = logger;
  }

  /**
   * Register a plugin manifest.
   * @param {Object} manifest - Complete plugin.json manifest
   */
  register(manifest) {
    const name = manifest.name;

    // Store plugin
    this.plugins.set(name, manifest);

    // Build intent lookup
    const intents = manifest.routing?.intents || [];
    for (const intent of intents) {
      this.intentMap.set(intent.toLowerCase(), name);
    }

    // Build keyword lookup
    const keywords = manifest.routing?.keywords || [];
    for (const keyword of keywords) {
      this.keywordMap.set(keyword.toLowerCase(), name);
    }

    this.logger.debug({
      plugin: name,
      intents: intents.length,
      keywords: keywords.length
    }, `Plugin registered: ${name}`);
  }

  /**
   * Look up a plugin by intent.
   * @param {string} intent - Detected intent string
   * @returns {Object|null} Plugin manifest or null
   */
  lookupByIntent(intent) {
    const normalizedIntent = (intent || '').toLowerCase().trim();
    const pluginName = this.intentMap.get(normalizedIntent);
    if (!pluginName) return null;
    return this.plugins.get(pluginName) || null;
  }

  /**
   * Look up a plugin by keyword (fuzzy matching).
   * Checks if any registered keyword is found in the input text.
   * @param {string} text - User message or keyword
   * @returns {Object|null} Best matching plugin manifest or null
   */
  lookupByKeyword(text) {
    const normalizedText = (text || '').toLowerCase().trim();
    let bestMatch = null;
    let bestPriority = Infinity;

    for (const [keyword, pluginName] of this.keywordMap) {
      if (normalizedText.includes(keyword)) {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
          const priority = plugin.routing?.priority || 999;
          if (priority < bestPriority) {
            bestPriority = priority;
            bestMatch = plugin;
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get all registered plugins.
   * @returns {Array<Object>}
   */
  getAllPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      description: p.description,
      enabled: p.enabled,
      category: p.metadata?.category,
      phase: p.metadata?.phase,
      intents: p.routing?.intents || [],
      required_crew: p.layer_4_subagents?.required_crew
    }));
  }

  /**
   * Get only enabled plugins.
   * @returns {Array<Object>}
   */
  getEnabledPlugins() {
    return this.getAllPlugins().filter(p => p.enabled !== false);
  }

  /**
   * Get a plugin by name.
   * @param {string} name
   * @returns {Object|null}
   */
  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Get all registered intents and their plugin mappings.
   * @returns {Object}
   */
  getIntentMap() {
    const map = {};
    this.intentMap.forEach((pluginName, intent) => {
      map[intent] = pluginName;
    });
    return map;
  }

  /**
   * Get the count of registered plugins.
   * @returns {number}
   */
  get count() {
    return this.plugins.size;
  }
}

module.exports = PluginRegistry;
