// AURA Brain Kernel v3.0 — Memory Manager
// Tables: aura_conversations, memories, aura_preferences, activity_logs
import { Logger, formatDate } from './utils.js';
const log = new Logger('Memory');

class MemoryManager {
  constructor(supabaseClient) {
    if (!supabaseClient) { log.warn('No Supabase client — memory disabled'); this.db = null; this.enabled = false; return; }
    this.db = supabaseClient; this.enabled = true;
    log.info('MemoryManager initialized');
  }

  async saveConversation(userId, role, content, metadata = {}) {
    if (!this.enabled) return null;
    try {
      const { data, error } = await this.db.from('aura_conversations')
        .insert({ user_id: userId, role, content, metadata, created_at: formatDate() }).select().single();
      if (error) { log.error('Save conversation failed', { error: error.message }); return null; }
      return data;
    } catch (err) { log.error('Exception', { message: err.message }); return null; }
  }

  async getRecentConversations(userId, limit = 20) {
    if (!this.enabled) return [];
    try {
      const { data, error } = await this.db.from('aura_conversations')
        .select('role, content, metadata, created_at').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(limit);
      if (error) { log.error('Fetch failed', { error: error.message }); return []; }
      return (data || []).reverse();
    } catch (err) { return []; }
  }

  async searchMemories(query, userId, limit = 5) {
    if (!this.enabled) return [];
    try {
      const { data, error } = await this.db.rpc('search_memories', { query_text: query, match_count: limit, user_filter: userId });
      if (error) return this._fallback(query, userId, limit);
      return data || [];
    } catch (err) { return this._fallback(query, userId, limit); }
  }

  async _fallback(query, userId, limit) {
    try {
      const { data } = await this.db.from('memories').select('*').eq('user_id', userId)
        .ilike('content', `%${query}%`).order('created_at', { ascending: false }).limit(limit);
      return data || [];
    } catch (err) { return []; }
  }

  async saveMemory(userId, content, type = 'general') {
    if (!this.enabled) return null;
    try {
      const { data, error } = await this.db.from('memories')
        .insert({ user_id: userId, content, type, created_at: formatDate() }).select().single();
      if (error) { log.error('Save memory failed', { error: error.message }); return null; }
      return data;
    } catch (err) { return null; }
  }

  async saveActivity(userId, action, details = {}) {
    if (!this.enabled) return null;
    try {
      const { data, error } = await this.db.from('activity_logs')
        .insert({ user_id: userId, action, details, created_at: formatDate() }).select().single();
      if (error) { log.error('Save activity failed', { error: error.message }); return null; }
      return data;
    } catch (err) { return null; }
  }

  async loadPreferences(userId) {
    if (!this.enabled) return {};
    try {
      const { data } = await this.db.from('aura_preferences').select('key, value').eq('user_id', userId);
      const prefs = {};
      for (const row of (data || [])) prefs[row.key] = row.value;
      return prefs;
    } catch (err) { return {}; }
  }

  async savePreference(userId, key, value) {
    if (!this.enabled) return null;
    try {
      const { data, error } = await this.db.from('aura_preferences')
        .upsert({ user_id: userId, key, value, updated_at: formatDate() }, { onConflict: 'user_id,key' })
        .select().single();
      if (error) { log.error('Save preference failed', { error: error.message }); return null; }
      return data;
    } catch (err) { return null; }
  }

  getStatus() { return { enabled: this.enabled, hasClient: !!this.db }; }
}

export default MemoryManager;
