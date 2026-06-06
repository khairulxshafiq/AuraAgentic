/**
 * @module @aura/shared-utils
 * Shared utility functions: trace_id generation, retry logic, timeout handling.
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a UUID v4 trace_id for request tracing.
 * @returns {string} UUID v4 string
 */
function generateTraceId() {
  return uuidv4();
}

/**
 * Generate a UUID v4 workflow_run_id for multi-step workflow tracking.
 * @returns {string} UUID v4 string prefixed with 'run-'
 */
function generateWorkflowRunId() {
  return `run-${uuidv4()}`;
}

/**
 * Retry a function with exponential backoff.
 * @param {Function} fn - Async function to retry
 * @param {Object} [options]
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelayMs=1000] - Base delay in milliseconds
 * @param {number} [options.maxDelayMs=10000] - Maximum delay cap
 * @param {Function} [options.shouldRetry] - Function to determine if error is retryable
 * @returns {Promise<*>} Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = () => true
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
        maxDelayMs
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wrap an async function with a timeout.
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} [operationName='Operation'] - Name for error message
 * @returns {Promise<*>}
 */
async function withTimeout(promise, timeoutMs, operationName = 'Operation') {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Get current timestamp in ISO 8601 format.
 * @returns {string}
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Sleep for a specified duration.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateTraceId,
  generateWorkflowRunId,
  retryWithBackoff,
  withTimeout,
  nowISO,
  sleep
};
