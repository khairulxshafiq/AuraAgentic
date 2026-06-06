/**
 * @module @aura/shared-memory
 * Supabase client wrapper for AURA memory system.
 * Handles all 12 Supabase tables defined in the Master Architecture Section 13.
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

let _client = null;

/**
 * Initialize the Supabase client (singleton).
 * @param {string} url - Supabase project URL
 * @param {string} serviceRoleKey - Supabase service role key
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function initSupabase(url, serviceRoleKey) {
  if (!_client) {
    _client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false }
    });
  }
  return _client;
}

/**
 * Get the initialized Supabase client.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getClient() {
  if (!_client) {
    throw new Error('Supabase client not initialized. Call initSupabase() first.');
  }
  return _client;
}

// ─────────────────────────────────────
// CONVERSATIONS (aura_conversations)
// ─────────────────────────────────────

/**
 * Save a conversation exchange.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function saveConversation({ chat_id, user_message, bot_response, intent, mode, trace_id }) {
  const client = getClient();
  const { data, error } = await client
    .from('aura_conversations')
    .insert({
      chat_id,
      user_message,
      bot_response,
      intent: intent || 'unknown',
      mode: mode || 'direct',
      trace_id: trace_id || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save conversation: ${error.message}`);
  return data;
}

/**
 * Get conversation history for a chat.
 * @param {string} chatId
 * @param {number} [limit=10] - Number of recent messages
 * @returns {Promise<Array>}
 */
async function getConversationHistory(chatId, limit = 10) {
  const client = getClient();
  const { data, error } = await client
    .from('aura_conversations')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get conversation history: ${error.message}`);
  return (data || []).reverse();
}

// ─────────────────────────────────────
// MEMORIES (memories)
// ─────────────────────────────────────

/**
 * Write a long-term memory.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function writeMemory({ user_id, memory_type, content, importance = 0.5 }) {
  const client = getClient();
  const { data, error } = await client
    .from('memories')
    .insert({
      user_id,
      memory_type: memory_type || 'fact',
      content,
      importance,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to write memory: ${error.message}`);
  return data;
}

/**
 * Read memories for a user.
 * @param {string} userId
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
async function readMemories(userId, limit = 20) {
  const client = getClient();
  const { data, error } = await client
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to read memories: ${error.message}`);
  return data || [];
}

/**
 * Search memories using full-text search (FTS).
 * @param {string} userId
 * @param {string} query
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
async function searchMemories(userId, query, limit = 10) {
  const client = getClient();
  const { data, error } = await client
    .rpc('search_memories', {
      p_user_id: userId,
      p_query: query,
      p_limit: limit
    });

  if (error) {
    // Fallback to simple ILIKE search if RPC not available
    const { data: fallbackData, error: fallbackError } = await client
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .ilike('content', `%${query}%`)
      .limit(limit);

    if (fallbackError) throw new Error(`Failed to search memories: ${fallbackError.message}`);
    return fallbackData || [];
  }

  return data || [];
}

// ─────────────────────────────────────
// PREFERENCES (aura_preferences)
// ─────────────────────────────────────

/**
 * Get user preferences.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function getPreferences(userId) {
  const client = getClient();
  const { data, error } = await client
    .from('aura_preferences')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to get preferences: ${error.message}`);

  const prefs = {};
  (data || []).forEach(row => {
    prefs[row.preference_key] = row.preference_value;
  });
  return prefs;
}

/**
 * Set a user preference.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function setPreference({ user_id, preference_key, preference_value, category = 'general' }) {
  const client = getClient();
  const { data, error } = await client
    .from('aura_preferences')
    .upsert({
      user_id,
      preference_key,
      preference_value,
      category,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,preference_key' })
    .select()
    .single();

  if (error) throw new Error(`Failed to set preference: ${error.message}`);
  return data;
}

// ─────────────────────────────────────
// ACTIVITY LOGS (activity_logs)
// ─────────────────────────────────────

/**
 * Save an activity log entry.
 * @param {Object} params
 * @returns {Promise<void>}
 */
async function saveActivityLog({ trace_id, workflow_run_id, service, action, status, duration_ms, error: errorMsg, details }) {
  const client = getClient();
  try {
    await client
      .from('activity_logs')
      .insert({
        trace_id,
        workflow_run_id: workflow_run_id || null,
        service,
        action,
        status: status || 'success',
        duration_ms: duration_ms || 0,
        error: errorMsg || null,
        details: details || null,
        created_at: new Date().toISOString()
      });
  } catch (err) {
    // Fire-and-forget — do not throw on logging failure
    console.error('Failed to save activity log:', err.message);
  }
}

// ─────────────────────────────────────
// RESEARCH (research_reports, research_cache)
// ─────────────────────────────────────

/**
 * Save a research report.
 * @param {Object} report
 * @returns {Promise<Object>}
 */
async function saveResearchReport(report) {
  const client = getClient();
  const { data, error } = await client
    .from('research_reports')
    .insert({
      report_id: report.report_id || `rpt-${Date.now()}`,
      trace_id: report.trace_id,
      workflow_run_id: report.workflow_run_id || null,
      title: report.title,
      summary: report.summary,
      key_findings: report.key_findings || [],
      sources: report.sources || [],
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save research report: ${error.message}`);
  return data;
}

/**
 * Check research cache for a URL.
 * @param {string} url
 * @returns {Promise<Object|null>}
 */
async function checkResearchCache(url) {
  const client = getClient();
  const cacheKey = `url:${url}`;
  const { data, error } = await client
    .from('research_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Save to research cache.
 * @param {Object} params
 * @returns {Promise<void>}
 */
async function saveResearchCache({ url, content, content_hash, ttl_hours = 24 }) {
  const client = getClient();
  const expiresAt = new Date(Date.now() + ttl_hours * 60 * 60 * 1000).toISOString();
  await client
    .from('research_cache')
    .upsert({
      cache_key: `url:${url}`,
      content,
      content_hash: content_hash || null,
      scraped_at: new Date().toISOString(),
      expires_at: expiresAt
    }, { onConflict: 'cache_key' });
}

// ─────────────────────────────────────
// IMAGE (image_prompts, image_history)
// ─────────────────────────────────────

/**
 * Save an image prompt.
 * @param {Object} promptData
 * @returns {Promise<Object>}
 */
async function saveImagePrompt(promptData) {
  const client = getClient();
  const { data, error } = await client
    .from('image_prompts')
    .insert({
      prompt_id: promptData.prompt_id || `img-${Date.now()}`,
      trace_id: promptData.trace_id,
      workflow_run_id: promptData.workflow_run_id || null,
      prompt: promptData.prompt,
      negative_prompt: promptData.negative_prompt || null,
      style: promptData.style || 'photorealistic',
      dimensions: promptData.dimensions || { width: 1024, height: 1024 },
      brand: promptData.brand || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save image prompt: ${error.message}`);
  return data;
}

// ─────────────────────────────────────
// TOOL LOGS (tool_logs)
// ─────────────────────────────────────

/**
 * Save a tool execution log.
 * @param {Object} logData
 * @returns {Promise<void>}
 */
async function saveToolLog(logData) {
  const client = getClient();
  try {
    await client
      .from('tool_logs')
      .insert({
        trace_id: logData.trace_id,
        workflow_run_id: logData.workflow_run_id || null,
        tool_name: logData.tool_name,
        status: logData.status || 'success',
        params: logData.params || {},
        result_size_bytes: logData.result_size_bytes || 0,
        duration_ms: logData.duration_ms || 0,
        error: logData.error || null,
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('Failed to save tool log:', err.message);
  }
}

// ─────────────────────────────────────
// PLUGIN EVENTS (plugin_events)
// ─────────────────────────────────────

/**
 * Save a plugin event.
 * @param {Object} eventData
 * @returns {Promise<void>}
 */
async function savePluginEvent(eventData) {
  const client = getClient();
  try {
    await client
      .from('plugin_events')
      .insert({
        trace_id: eventData.trace_id,
        plugin_name: eventData.plugin_name,
        event_type: eventData.event_type,
        intent: eventData.intent || null,
        details: eventData.details || {},
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('Failed to save plugin event:', err.message);
  }
}

// ─────────────────────────────────────
// WORKFLOW STATE (workflow_state)
// ─────────────────────────────────────

/**
 * Create a new workflow state.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function createWorkflowState({
  workflow_run_id,
  trace_id,
  user_id,
  workflow_type,
  total_steps
}) {
  const client = getClient();
  const { data, error } = await client
    .from('workflow_state')
    .insert({
      workflow_run_id,
      trace_id,
      user_id,
      workflow_type,
      status: 'in_progress',
      current_step: 1,
      total_steps,
      steps_completed: [],
      intermediate_results: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create workflow state: ${error.message}`);
  return data;
}

/**
 * Update workflow state.
 * @param {string} workflowRunId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateWorkflowState(workflowRunId, updates) {
  const client = getClient();
  const { data, error } = await client
    .from('workflow_state')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('workflow_run_id', workflowRunId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update workflow state: ${error.message}`);
  return data;
}

/**
 * Get workflow state.
 * @param {string} workflowRunId
 * @returns {Promise<Object|null>}
 */
async function getWorkflowState(workflowRunId) {
  const client = getClient();
  const { data, error } = await client
    .from('workflow_state')
    .select('*')
    .eq('workflow_run_id', workflowRunId)
    .single();

  if (error) return null;
  return data;
}

module.exports = {
  initSupabase,
  getClient,
  // Conversations
  saveConversation,
  getConversationHistory,
  // Memories
  writeMemory,
  readMemories,
  searchMemories,
  // Preferences
  getPreferences,
  setPreference,
  // Activity Logs
  saveActivityLog,
  // Research
  saveResearchReport,
  checkResearchCache,
  saveResearchCache,
  // Image
  saveImagePrompt,
  // Tool Logs
  saveToolLog,
  // Plugin Events
  savePluginEvent,
  // Workflow
  createWorkflowState,
  updateWorkflowState,
  getWorkflowState
};
