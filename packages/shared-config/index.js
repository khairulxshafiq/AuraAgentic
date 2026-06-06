/**
 * @module @aura/shared-config
 * Environment-based configuration loader for AURA services.
 * Never hardcodes URLs or secrets — everything from env vars.
 */

'use strict';

/**
 * Get an environment variable with a default fallback.
 * @param {string} key - Environment variable name
 * @param {string} [defaultValue] - Default value if not set
 * @returns {string}
 */
function getEnv(key, defaultValue = undefined) {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue;
}

/**
 * Get an integer environment variable.
 * @param {string} key
 * @param {number} [defaultValue]
 * @returns {number}
 */
function getEnvInt(key, defaultValue = undefined) {
  const raw = getEnv(key, defaultValue !== undefined ? String(defaultValue) : undefined);
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, got: ${raw}`);
  }
  return parsed;
}

/**
 * Get a boolean environment variable.
 * @param {string} key
 * @param {boolean} [defaultValue]
 * @returns {boolean}
 */
function getEnvBool(key, defaultValue = false) {
  const raw = getEnv(key, String(defaultValue));
  return raw === 'true' || raw === '1';
}

/**
 * Load Gateway configuration.
 * @returns {Object}
 */
function loadGatewayConfig() {
  return {
    port: getEnvInt('PORT', 3000),
    telegramBotToken: getEnv('TELEGRAM_BOT_TOKEN'),
    brainUrl: getEnv('BRAIN_URL', 'http://localhost:3001'),
    logLevel: getEnv('LOG_LEVEL', 'info')
  };
}

/**
 * Load Brain configuration.
 * @returns {Object}
 */
function loadBrainConfig() {
  return {
    port: getEnvInt('PORT', 3001),
    openrouterApiKey: getEnv('OPENROUTER_API_KEY'),
    geminiApiKey: getEnv('GEMINI_API_KEY', ''),
    researchCrewUrl: getEnv('RESEARCH_CREW_URL', 'http://localhost:8003'),
    imageCrewUrl: getEnv('IMAGE_CREW_URL', 'http://localhost:8004'),
    hermesUrl: getEnv('HERMES_URL', 'http://localhost:5000'),
    supabaseUrl: getEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    logLevel: getEnv('LOG_LEVEL', 'info'),
    healthCheckIntervalMs: getEnvInt('HEALTH_CHECK_INTERVAL_MS', 60000),
    defaultTimeoutMs: getEnvInt('DEFAULT_TIMEOUT_MS', 60000)
  };
}

/**
 * Load Supabase configuration (reusable across services).
 * @returns {Object}
 */
function loadSupabaseConfig() {
  return {
    url: getEnv('SUPABASE_URL'),
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY')
  };
}

module.exports = {
  getEnv,
  getEnvInt,
  getEnvBool,
  loadGatewayConfig,
  loadBrainConfig,
  loadSupabaseConfig
};
