/**
 * Aura-Brain — Central Orchestrator.
 * Express entry point. Loads all registries on startup.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const { createLogger } = require('@aura/shared-logger');
const { loadBrainConfig } = require('@aura/shared-config');
const { initSupabase } = require('@aura/shared-memory');

const MCPRegistry = require('./mcp/mcp-registry');
const MCPClient = require('./mcp/mcp-client');
const MCPHealth = require('./mcp/mcp-health');
const PluginRegistry = require('./plugins/plugin-registry');
const { loadPlugins } = require('./plugins/loader');
const ServiceRegistry = require('./registry/service-registry');
const processRoute = require('./routes/process');
const healthRoute = require('./routes/health');

const logger = createLogger('brain');

async function main() {
  try {
    const config = loadBrainConfig();
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // ─── Initialize Supabase ───
    initSupabase(config.supabaseUrl, config.supabaseServiceRoleKey);
    logger.info('Supabase initialized');

    // ─── Initialize MCP Registry ───
    const mcpRegistry = new MCPRegistry(logger);
    mcpRegistry.load();

    // ─── Initialize MCP Client ───
    const mcpClient = new MCPClient(config.hermesUrl, logger);

    // ─── Initialize MCP Health ───
    const mcpHealth = new MCPHealth(config.hermesUrl, logger);

    // ─── Initialize Plugin Registry ───
    const pluginRegistry = new PluginRegistry(logger);
    loadPlugins(pluginRegistry, logger);

    // ─── Initialize Service Registry ───
    const serviceRegistry = new ServiceRegistry(logger);
    serviceRegistry.init({
      research_crew: { url: config.researchCrewUrl, agents_count: 2 },
      image_crew: { url: config.imageCrewUrl, agents_count: 1 },
      hermes: { url: config.hermesUrl, agents_count: 0 }
    });

    // ─── Start health polling ───
    await serviceRegistry.checkAllHealth();
    setInterval(() => serviceRegistry.checkAllHealth(), config.healthCheckIntervalMs);
    await mcpHealth.checkAllTools();
    setInterval(() => mcpHealth.checkAllTools(), config.healthCheckIntervalMs);

    // ─── Attach context to app for route handlers ───
    app.locals.config = config;
    app.locals.logger = logger;
    app.locals.mcpRegistry = mcpRegistry;
    app.locals.mcpClient = mcpClient;
    app.locals.mcpHealth = mcpHealth;
    app.locals.pluginRegistry = pluginRegistry;
    app.locals.serviceRegistry = serviceRegistry;

    // ─── Routes ───
    app.use('/process', processRoute);
    app.use('/health', healthRoute);

    // Phase 2 stubs
    app.post('/register', (req, res) => {
      logger.info({ body: req.body }, 'Service registration received (Phase 2)');
      res.json({ status: 'acknowledged', phase: 2, message: 'Dynamic registration available in Phase 2' });
    });

    app.post('/heartbeat', (req, res) => {
      logger.info({ body: req.body }, 'Heartbeat received (Phase 2)');
      res.json({ status: 'acknowledged', phase: 2 });
    });

    // ─── Start server ───
    app.listen(config.port, '0.0.0.0', () => {
      logger.info({
        port: config.port,
        plugins: pluginRegistry.count,
        tools: mcpRegistry.getActiveTools().length,
        services: serviceRegistry.getServiceNames().length
      }, `Aura-Brain started on port ${config.port}`);
    });

  } catch (error) {
    logger.fatal({ error: error.message }, 'Brain failed to start');
    process.exit(1);
  }
}

main();
