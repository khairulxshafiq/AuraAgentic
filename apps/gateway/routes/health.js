/**
 * @module routes/health
 * GET /health — Gateway service health check.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { createHealthResponse } = require('@aura/shared-types');

const startTime = Date.now();

router.get('/', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.json(createHealthResponse({
    service: 'gateway',
    status: 'healthy',
    uptime_seconds: uptimeSeconds,
    version: '1.0.0'
  }));
});

module.exports = router;
