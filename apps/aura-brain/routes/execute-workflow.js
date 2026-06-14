/**
 * @module routes/execute-workflow
 * POST /execute-workflow — Worker entry point for executing workflows asynchronously.
 */

'use strict';

const express = require('express');
const router = express.Router();
const Router = require('../core/router');

router.post('/', async (req, res) => {
  const logger = req.app.locals.logger;
  const config = req.app.locals.config;

  try {
    const job = req.body;

    if (!job || !job.user_message) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required field: user_message'
      });
    }

    // Immediately accept the job
    res.status(202).json({
      status: 'queued',
      trace_id: job.trace_id,
      workflow_run_id: job.workflow_run_id
    });

    // Process in the background
    (async () => {
      try {
        const brainRouter = new Router(req.app);
        
        // Execute workflow state
        logger.info({ trace_id: job.trace_id }, 'Worker: beginning workflow execution');
        const result = await brainRouter.workflowOrchestrator.execute(
          job.trace_id,
          job.chat_id,
          job.user_message,
          job.entities,
          job.memories,
          job.conversationHistory
        );

        // Send reply to Gateway
        logger.info({ trace_id: job.trace_id }, 'Worker: posting workflow reply back to Gateway');
        await fetch(`${config.gatewayUrl}/telegram/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: job.chat_id,
            response: result.response,
            trace_id: job.trace_id
          })
        });
      } catch (err) {
        logger.error({ error: err.message, trace_id: job.trace_id }, 'Worker background execution failed');
      }
    })();

  } catch (error) {
    logger.error({ error: error.message }, 'POST /execute-workflow error');
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  }
});

module.exports = router;
