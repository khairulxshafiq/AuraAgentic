/**
 * @module routes/services
 * GET /services — Connected services status.
 */

'use strict';

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const config = req.app.locals.config;
  const logger = req.app.locals.logger;

  const services = {
    brain: { url: config.brainUrl, status: 'unknown' }
  };

  // Check Brain health
  try {
    const response = await fetch(`${config.brainUrl}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      const data = await response.json();
      services.brain.status = 'healthy';
      services.brain.details = data;
    } else {
      services.brain.status = 'unhealthy';
    }
  } catch (error) {
    services.brain.status = 'down';
    services.brain.error = error.message;
  }

  res.json({
    gateway: 'healthy',
    connected_services: services,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
