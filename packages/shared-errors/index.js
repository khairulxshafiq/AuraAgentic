/**
 * @module @aura/shared-errors
 * Standard error classes for AURA Agentic AI services.
 */

'use strict';

/**
 * Base error class for all AURA errors.
 */
class AuraError extends Error {
  /**
   * @param {string} message
   * @param {string} code - Machine-readable error code
   * @param {number} statusCode - HTTP status code
   * @param {Object} [details] - Additional error details
   */
  constructor(message, code = 'AURA_ERROR', statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Thrown when a required service is unavailable.
 */
class ServiceUnavailableError extends AuraError {
  /**
   * @param {string} serviceName - Name of the unavailable service
   * @param {Object} [details]
   */
  constructor(serviceName, details = {}) {
    super(
      `Service '${serviceName}' is currently unavailable`,
      'SERVICE_UNAVAILABLE',
      503,
      { service: serviceName, ...details }
    );
  }
}

/**
 * Thrown when a tool execution fails.
 */
class ToolExecutionError extends AuraError {
  /**
   * @param {string} toolName - Name of the failed tool
   * @param {string} reason - Reason for failure
   * @param {Object} [details]
   */
  constructor(toolName, reason, details = {}) {
    super(
      `Tool '${toolName}' execution failed: ${reason}`,
      'TOOL_EXECUTION_FAILED',
      502,
      { tool: toolName, reason, ...details }
    );
  }
}

/**
 * Thrown when a guardrail check fails.
 */
class GuardrailError extends AuraError {
  /**
   * @param {string} reason
   * @param {Object} [details]
   */
  constructor(reason, details = {}) {
    super(
      `Guardrail check failed: ${reason}`,
      'GUARDRAIL_FAILED',
      422,
      { reason, ...details }
    );
  }
}

/**
 * Thrown when a plugin is not found.
 */
class PluginNotFoundError extends AuraError {
  /**
   * @param {string} intent
   * @param {Object} [details]
   */
  constructor(intent, details = {}) {
    super(
      `No plugin found for intent: ${intent}`,
      'PLUGIN_NOT_FOUND',
      404,
      { intent, ...details }
    );
  }
}

/**
 * Thrown when intent detection fails or returns low confidence.
 */
class IntentDetectionError extends AuraError {
  /**
   * @param {string} reason
   * @param {Object} [details]
   */
  constructor(reason, details = {}) {
    super(
      `Intent detection failed: ${reason}`,
      'INTENT_DETECTION_FAILED',
      400,
      { reason, ...details }
    );
  }
}

/**
 * Thrown when a workflow step fails.
 */
class WorkflowError extends AuraError {
  /**
   * @param {string} workflowRunId
   * @param {number} step
   * @param {string} reason
   * @param {Object} [details]
   */
  constructor(workflowRunId, step, reason, details = {}) {
    super(
      `Workflow ${workflowRunId} failed at step ${step}: ${reason}`,
      'WORKFLOW_FAILED',
      500,
      { workflow_run_id: workflowRunId, step, reason, ...details }
    );
  }
}

/**
 * Thrown on authentication/authorization failures.
 */
class AuthenticationError extends AuraError {
  /**
   * @param {string} [reason]
   */
  constructor(reason = 'Authentication failed') {
    super(reason, 'AUTH_FAILED', 401, {});
  }
}

/**
 * Thrown when rate limit is exceeded.
 */
class RateLimitError extends AuraError {
  /**
   * @param {string} userId
   * @param {number} [retryAfterMs]
   */
  constructor(userId, retryAfterMs = 60000) {
    super(
      `Rate limit exceeded for user ${userId}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { user_id: userId, retry_after_ms: retryAfterMs }
    );
  }
}

module.exports = {
  AuraError,
  ServiceUnavailableError,
  ToolExecutionError,
  GuardrailError,
  PluginNotFoundError,
  IntentDetectionError,
  WorkflowError,
  AuthenticationError,
  RateLimitError
};
