/**
 * @module @aura/shared-types
 * Shared type definitions and factory functions for AURA Agentic AI.
 * Based on AURA Phase 1 Master Architecture Section 12 — API Contracts.
 */

'use strict';

/**
 * @typedef {Object} GatewayToBrainRequest
 * @property {string} trace_id - UUID v4 generated per interaction
 * @property {string} chat_id - Telegram chat ID
 * @property {string} user_message - Raw user message text
 * @property {string} source - Message source (telegram, web, api)
 * @property {string} message_id - Original message ID
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {Object} user_metadata - User info (first_name, language_code)
 */

/**
 * @typedef {Object} BrainToCrewRequest
 * @property {string} trace_id
 * @property {string|null} workflow_run_id
 * @property {string} user_id
 * @property {string} intent
 * @property {string} task
 * @property {string} input
 * @property {Object} context
 * @property {Object} memory
 * @property {Object} options
 */

/**
 * @typedef {Object} CrewResponse
 * @property {string} trace_id
 * @property {string|null} workflow_run_id
 * @property {string} status - success | error | partial
 * @property {string} agent - Agent/crew name
 * @property {Object} result - Structured result object
 * @property {string} summary - Human-readable summary
 * @property {Array} sources - Source citations
 * @property {Object} metadata - Duration, model, tokens, etc.
 * @property {Object|null} error - Error details if status != success
 */

/**
 * @typedef {Object} ToolRequest
 * @property {string} trace_id
 * @property {string|null} workflow_run_id
 * @property {string} tool_name
 * @property {Object} params
 * @property {string} caller - Service that initiated the call
 * @property {number} timeout_ms
 */

/**
 * @typedef {Object} ToolResponse
 * @property {string} trace_id
 * @property {string|null} workflow_run_id
 * @property {string} tool_name
 * @property {string} status - success | error
 * @property {Object} result
 * @property {number} duration_ms
 * @property {Object|null} error
 */

/**
 * @typedef {Object} HealthCheckResponse
 * @property {string} service
 * @property {string} status - healthy | unhealthy | degraded
 * @property {number} uptime_seconds
 * @property {string} version
 * @property {number} agents_count
 * @property {string|null} last_request_at
 * @property {number} memory_usage_mb
 * @property {number} active_requests
 */

/**
 * Create a Gateway-to-Brain request payload.
 * @param {Object} params
 * @returns {GatewayToBrainRequest}
 */
function createGatewayRequest({ trace_id, chat_id, user_message, source = 'telegram', message_id, timestamp, user_metadata = {} }) {
  return {
    trace_id,
    chat_id,
    user_message,
    source,
    message_id: message_id || null,
    timestamp: timestamp || new Date().toISOString(),
    user_metadata
  };
}

/**
 * Create a Brain-to-CrewAI request payload.
 * @param {Object} params
 * @returns {BrainToCrewRequest}
 */
function createCrewRequest({
  trace_id,
  workflow_run_id = null,
  user_id,
  intent,
  task,
  input,
  context = {},
  memory = {},
  options = {}
}) {
  return {
    trace_id,
    workflow_run_id,
    user_id,
    intent,
    task,
    input,
    context: {
      conversation_history: [],
      brand: null,
      platform: null,
      language: 'en',
      research_context: null,
      custom: {},
      ...context
    },
    memory: {
      relevant_memories: [],
      user_preferences: {},
      ...memory
    },
    options: {
      timeout_ms: 60000,
      output_format: 'structured_json',
      verbose: false,
      include_sources: true,
      ...options
    }
  };
}

/**
 * Create a standard CrewAI response payload.
 * @param {Object} params
 * @returns {CrewResponse}
 */
function createCrewResponse({
  trace_id,
  workflow_run_id = null,
  status = 'success',
  agent,
  result = {},
  summary = '',
  sources = [],
  metadata = {},
  error = null
}) {
  return {
    trace_id,
    workflow_run_id,
    status,
    agent,
    result,
    summary,
    sources,
    metadata: {
      duration_ms: 0,
      agent_version: '1.0.0',
      model_used: null,
      tokens_used: 0,
      ...metadata
    },
    error
  };
}

/**
 * Create a tool execution request payload.
 * @param {Object} params
 * @returns {ToolRequest}
 */
function createToolRequest({
  trace_id,
  workflow_run_id = null,
  tool_name,
  params = {},
  caller = 'brain',
  timeout_ms = 30000
}) {
  return {
    trace_id,
    workflow_run_id,
    tool_name,
    params,
    caller,
    timeout_ms
  };
}

/**
 * Create a tool execution response payload.
 * @param {Object} params
 * @returns {ToolResponse}
 */
function createToolResponse({
  trace_id,
  workflow_run_id = null,
  tool_name,
  status = 'success',
  result = {},
  duration_ms = 0,
  error = null
}) {
  return {
    trace_id,
    workflow_run_id,
    tool_name,
    status,
    result,
    duration_ms,
    error
  };
}

/**
 * Create a standard health check response.
 * @param {Object} params
 * @returns {HealthCheckResponse}
 */
function createHealthResponse({
  service,
  status = 'healthy',
  uptime_seconds = 0,
  version = '1.0.0',
  agents_count = 0,
  last_request_at = null,
  memory_usage_mb = 0,
  active_requests = 0
}) {
  return {
    service,
    status,
    uptime_seconds,
    version,
    agents_count,
    last_request_at,
    memory_usage_mb: memory_usage_mb || Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    active_requests
  };
}

module.exports = {
  createGatewayRequest,
  createCrewRequest,
  createCrewResponse,
  createToolRequest,
  createToolResponse,
  createHealthResponse
};
