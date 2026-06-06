/**
 * @module state/supabase
 * Supabase initialization for Brain service.
 * Thin wrapper around @aura/shared-memory.
 */

'use strict';

const { initSupabase } = require('@aura/shared-memory');
const { loadSupabaseConfig } = require('@aura/shared-config');

/**
 * Initialize Supabase for Brain.
 * Called once on startup from server.js.
 */
function initBrainSupabase() {
  const config = loadSupabaseConfig();
  return initSupabase(config.url, config.serviceRoleKey);
}

module.exports = { initBrainSupabase };
