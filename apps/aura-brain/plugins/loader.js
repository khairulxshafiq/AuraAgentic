/**
 * @module plugins/loader
 * Plugin Loader — Auto-discovers and loads plugins on Brain startup.
 * Scans plugins/ subdirectories for plugin.json manifests.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load all plugins from the plugins directory.
 * @param {Object} pluginRegistry - PluginRegistry instance
 * @param {Object} logger - Pino logger
 * @returns {number} Number of plugins loaded
 */
function loadPlugins(pluginRegistry, logger) {
  const pluginsDir = __dirname;
  let loadedCount = 0;
  let skippedCount = 0;

  logger.info({ dir: pluginsDir }, 'Plugin Loader: scanning for plugins...');

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

  for (const entry of entries) {
    // Only process directories (each plugin is a folder)
    if (!entry.isDirectory()) continue;

    const pluginDir = path.join(pluginsDir, entry.name);
    const manifestPath = path.join(pluginDir, 'plugin.json');

    // Check if plugin.json exists
    if (!fs.existsSync(manifestPath)) {
      logger.debug({ dir: entry.name }, 'Skipping: no plugin.json found');
      continue;
    }

    try {
      // Read and parse manifest
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw);

      // Validate required fields
      if (!manifest.name) {
        logger.warn({ dir: entry.name }, 'Skipping: plugin.json missing "name"');
        skippedCount++;
        continue;
      }

      if (!manifest.routing || !manifest.routing.intents) {
        logger.warn({ plugin: manifest.name }, 'Skipping: plugin.json missing routing.intents');
        skippedCount++;
        continue;
      }

      // Check enabled flag
      if (manifest.enabled === false) {
        logger.info({
          plugin: manifest.name,
          phase: manifest.metadata?.phase
        }, `Plugin '${manifest.name}' is disabled (enabled: false)`);
        skippedCount++;
        continue;
      }

      // Load rules.md if it exists
      const rulesPath = path.join(pluginDir, manifest.layer_1_rules?.rules_file || 'rules.md');
      let rules = null;
      if (fs.existsSync(rulesPath)) {
        rules = fs.readFileSync(rulesPath, 'utf-8');
      }

      // Register the plugin
      pluginRegistry.register({
        ...manifest,
        _rules_content: rules,
        _dir: pluginDir,
        _loaded_at: new Date().toISOString()
      });

      loadedCount++;
      logger.info({
        plugin: manifest.name,
        intents: manifest.routing.intents.length,
        crew: manifest.layer_4_subagents?.required_crew,
        phase: manifest.metadata?.phase
      }, `Plugin loaded: ${manifest.name}`);

    } catch (err) {
      logger.error({
        dir: entry.name,
        error: err.message
      }, `Failed to load plugin from ${entry.name}`);
      skippedCount++;
    }
  }

  logger.info({
    loaded: loadedCount,
    skipped: skippedCount,
    total_scanned: loadedCount + skippedCount
  }, `Plugin Loader complete: ${loadedCount} loaded, ${skippedCount} skipped`);

  return loadedCount;
}

module.exports = { loadPlugins };
