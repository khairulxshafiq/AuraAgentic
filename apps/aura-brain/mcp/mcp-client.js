/**
 * @module mcp-client
 * MCP Client for Aura-Brain.
 * Dispatches tool execution requests to Hermes via HTTP POST /tools/execute.
 * Uses retry with backoff and timeout handling.
 */

'use strict';

const { retryWithBackoff, withTimeout } = require('@aura/shared-utils');

class MCPClient {
  /**
   * @param {string} hermesUrl - Hermes base URL
   * @param {Object} logger - Pino logger instance
   */
  constructor(hermesUrl, logger) {
    this.hermesUrl = hermesUrl;
    this.logger = logger;
  }

  /**
   * Execute a tool via Hermes.
   * @param {Object} toolRequest - ToolRequest schema
   * @param {string} toolRequest.trace_id
   * @param {string|null} toolRequest.workflow_run_id
   * @param {string} toolRequest.tool_name
   * @param {Object} toolRequest.params
   * @param {string} toolRequest.caller
   * @param {number} [toolRequest.timeout_ms=30000]
   * @returns {Promise<Object>} ToolResponse
   */
  async executeTool(toolRequest) {
    const {
      trace_id,
      workflow_run_id = null,
      tool_name,
      params = {},
      caller = 'brain',
      timeout_ms = 30000
    } = toolRequest;

    const url = `${this.hermesUrl}/tools/execute`;
    const startTime = Date.now();

    this.logger.info({
      trace_id,
      workflow_run_id,
      tool_name,
      caller
    }, `MCP Client: dispatching tool '${tool_name}' to Hermes`);

    try {
      const executeRequest = async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trace_id,
            workflow_run_id,
            tool_name,
            params,
            caller,
            timeout_ms
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Hermes returned ${response.status}: ${errorBody}`);
        }

        return await response.json();
      };

      const result = await withTimeout(
        retryWithBackoff(executeRequest, {
          maxRetries: 2,
          baseDelayMs: 500,
          shouldRetry: (err) => {
            return err.message.includes('503') ||
                   err.message.includes('ECONNREFUSED') ||
                   err.message.includes('timeout');
          }
        }),
        timeout_ms,
        `Tool execution: ${tool_name}`
      );

      const duration_ms = Date.now() - startTime;
      this.logger.info({
        trace_id,
        tool_name,
        status: result.status,
        duration_ms
      }, `MCP Client: tool '${tool_name}' completed`);

      return result;
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      this.logger.error({
        trace_id,
        tool_name,
        error: error.message,
        duration_ms
      }, `MCP Client: tool '${tool_name}' failed`);

      return {
        trace_id,
        workflow_run_id,
        tool_name,
        status: 'error',
        result: null,
        duration_ms,
        error: {
          code: 'TOOL_EXECUTION_FAILED',
          message: error.message
        }
      };
    }
  }
}

module.exports = MCPClient;
