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

    const brainRouter = new Router(req.app);
    const result = await brainRouter.processRequest(gatewayRequest);

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message }, 'POST /process error');
    res.status(500).json({
      status: 'error',
      response: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
