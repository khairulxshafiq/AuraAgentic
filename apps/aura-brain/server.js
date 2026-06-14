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
const executeWorkflowRoute = require('./routes/execute-workflow');
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
    await mcpRegistry.load(config.hermesUrl);

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
    app.use('/health', healthRoute);

    // Dynamic service registration (Issue 6)
    app.post('/register', (req, res) => {
      const { service_name, url, agents_count, capabilities } = req.body;
      if (!service_name || !url) {
        return res.status(400).json({ status: 'error', error: 'Missing service_name or url' });
      }
      serviceRegistry.services.set(service_name, {
        service_name,
        url,
        status: 'healthy',
        capabilities: capabilities || [],
        version: '1.0.0',
        agents_count: agents_count || 0,
        last_checked_at: new Date().toISOString(),
        endpoints: {
          execute: '/execute',
          health: '/health'
        }
      });
      logger.info({ service_name, url }, 'Dynamic service registered');
      res.json({ status: 'success', message: `Registered ${service_name}` });
    });

    app.post('/heartbeat', (req, res) => {
      const { service_name } = req.body;
      if (!service_name) {
        return res.status(400).json({ status: 'error', error: 'Missing service_name' });
      }
      const service = serviceRegistry.services.get(service_name);
      if (service) {
        service.status = 'healthy';
        service.last_checked_at = new Date().toISOString();
        res.json({ status: 'success' });
      } else {
        res.status(404).json({ status: 'error', error: 'Service not registered' });
      }
    });

    // ─── Start server conditionally (Issue 2) ───
    let listenPort;
    if (config.brainMode === 'worker') {
      app.use('/execute-workflow', executeWorkflowRoute);
      try {
        listenPort = new URL(config.workerUrl).port || 3002;
      } catch (err) {
        listenPort = 3002;
      }
      app.listen(listenPort, '0.0.0.0', () => {
        logger.info({
          port: listenPort,
          mode: 'worker',
          plugins: pluginRegistry.count,
          tools: mcpRegistry.getActiveTools().length,
          services: serviceRegistry.getServiceNames().length
        }, `Aura-Brain Worker started on port ${listenPort}`);
      });
    } else {
      app.use('/process', processRoute);
      listenPort = config.port || 3001;
      app.listen(listenPort, '0.0.0.0', () => {
        logger.info({
          port: listenPort,
          mode: 'router',
          plugins: pluginRegistry.count,
          tools: mcpRegistry.getActiveTools().length,
          services: serviceRegistry.getServiceNames().length
        }, `Aura-Brain Router started on port ${listenPort}`);
      });
    }

  } catch (error) {
    logger.fatal({ error: error.message }, 'Brain failed to start');
    process.exit(1);
  }
}

main();
