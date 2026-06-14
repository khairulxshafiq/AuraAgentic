/**
 * @module routes/process
 * POST /process — Main entry point from Gateway.
 */

'use strict';

const express = require('express');
const router = express.Router();
const Router = require('../core/router');

router.post('/', async (req, res) => {
  const logger = req.app.locals.logger;

  try {
    const gatewayRequest = req.body;

    if (!gatewayRequest || !gatewayRequest.user_message) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required field: user_message'
      });
    }

    // Immediately accept request
    res.status(202).json({
      status: 'queued',
      trace_id: gatewayRequest.trace_id
    });

    // Process asynchronously in background
    (async () => {
      try {
        const brainRouter = new Router(req.app);
        await brainRouter.processRequestAsync(gatewayRequest);
      } catch (err) {
        logger.error({ error: err.message, trace_id: gatewayRequest.trace_id }, 'Async background processing error');
      }
    })();

  } catch (error) {
    logger.error({ error: error.message }, 'POST /process error');
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  }
});

module.exports = router;
