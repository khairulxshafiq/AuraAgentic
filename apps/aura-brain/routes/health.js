/**
 * @module routes/health
 * GET /health — Brain service health check.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { createHealthResponse } = require('@aura/shared-types');

const startTime = Date.now();

router.get('/', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const health = createHealthResponse({
    service: 'brain',
    status: 'healthy',
    uptime_seconds: uptimeSeconds,
    version: '1.0.0'
  });

  // Add Brain-specific info
  health.plugins_loaded = req.app.locals.pluginRegistry?.count || 0;
  health.active_tools = req.app.locals.mcpRegistry?.getActiveTools().length || 0;
  health.services_tracked = req.app.locals.serviceRegistry?.getServiceNames().length || 0;
  health.service_registry = req.app.locals.serviceRegistry?.getRegistryState() || {};

  res.json(health);
});

module.exports = router;
