/**
 * @module @aura/shared-logger
 * Pino-based JSON structured logging for AURA services.
 * Provides service-aware, trace_id-aware logging.
 */

'use strict';

const pino = require('pino');

/**
 * Create a service-specific Pino logger instance.
 * @param {string} serviceName - Name of the service (e.g., 'gateway', 'brain', 'hermes')
 * @param {Object} [options] - Additional Pino options
 * @returns {pino.Logger}
 */
function createLogger(serviceName, options = {}) {
  const level = process.env.LOG_LEVEL || 'info';

  const logger = pino({
    name: serviceName,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
      bindings(bindings) {
        return {
          service: bindings.name,
          pid: bindings.pid,
          hostname: bindings.hostname
        };
      }
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res
    },
    ...options
  });

  return logger;
}

/**
 * Create a child logger with trace context.
 * @param {pino.Logger} logger - Parent logger
 * @param {string} trace_id - Request trace ID
 * @param {string} [workflow_run_id] - Workflow run ID (optional)
 * @returns {pino.Logger}
 */
function withTrace(logger, trace_id, workflow_run_id = null) {
  const bindings = { trace_id };
  if (workflow_run_id) {
    bindings.workflow_run_id = workflow_run_id;
  }
  return logger.child(bindings);
}

module.exports = { createLogger, withTrace };
