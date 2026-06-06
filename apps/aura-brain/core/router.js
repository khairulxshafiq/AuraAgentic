/**
 * @module core/router
 * Brain Router — 7-step routing decision flow.
 * Processes requests from Gateway and routes to the correct execution path.
 */

'use strict';

const { generateTraceId, withTimeout, nowISO } = require('@aura/shared-utils');
const { createCrewRequest } = require('@aura/shared-types');
const {
  saveConversation,
  readMemories,
  getConversationHistory,
  saveActivityLog,
  savePluginEvent
} = require('@aura/shared-memory');

const Brain = require('./brain');
const { getSystemPrompt, getPluginPersona } = require('./persona');
const { checkResponse } = require('./guard');
const { WorkflowOrchestrator } = require('./workflow');

class Router {
  constructor(app) {
    this.config = app.locals.config;
    this.logger = app.locals.logger;
    this.mcpRegistry = app.locals.mcpRegistry;
    this.mcpClient = app.locals.mcpClient;
    this.mcpHealth = app.locals.mcpHealth;
    this.pluginRegistry = app.locals.pluginRegistry;
    this.serviceRegistry = app.locals.serviceRegistry;
    this.brain = new Brain(this.config, this.logger);
    this.workflowOrchestrator = new WorkflowOrchestrator(this);
  }

  /**
   * Process a request from Gateway — the 7-step routing flow.
   * @param {Object} gatewayRequest - Gateway-to-Brain request
   * @returns {Promise<Object>} Formatted response for Gateway
   */
  async processRequest(gatewayRequest) {
    const startTime = Date.now();
    const trace_id = gatewayRequest.trace_id || generateTraceId();
    const chat_id = gatewayRequest.chat_id;
    const userMessage = gatewayRequest.user_message;

    this.logger.info({ trace_id, chat_id }, 'Router: processing request');

    try {
      // ─── Step 1: trace_id (already generated above) ───

      // ─── Step 2: Load user memory from Supabase ───
      let memories = [];
      let conversationHistory = [];
      try {
        memories = await readMemories(chat_id, 10);
        conversationHistory = await getConversationHistory(chat_id, 10);
      } catch (err) {
        this.logger.warn({ trace_id, error: err.message }, 'Failed to load memory, proceeding without');
      }

      // ─── Step 3: LLM intent detection ───
      const registeredIntents = Object.keys(this.pluginRegistry.getIntentMap());
      // Add standard intents
      registeredIntents.push('chat', 'greeting', 'qa', 'multi_step_campaign');

      const { intent, confidence, entities } = await this.brain.detectIntent(
        userMessage,
        registeredIntents,
        conversationHistory
      );

      this.logger.info({ trace_id, intent, confidence }, 'Intent detected');

      // ─── Step 4: Check Plugin Registry ───
      let plugin = this.pluginRegistry.lookupByIntent(intent);

      // Fallback to keyword matching if no intent match
      if (!plugin && intent === 'chat') {
        plugin = this.pluginRegistry.lookupByKeyword(userMessage);
      }

      // No plugin match → direct LLM reply
      if (!plugin) {
        this.logger.info({ trace_id, intent }, 'No plugin match → direct LLM reply');
        return await this._handleDirectLLM(trace_id, chat_id, userMessage, conversationHistory, memories, startTime);
      }

      // Log plugin match
      await savePluginEvent({
        trace_id,
        plugin_name: plugin.name,
        event_type: 'matched',
        intent,
        details: { confidence }
      });

      // ─── Step 5: Check MCP Tool Registry ───
      const requiredTools = (plugin.layer_3_mcp_tools || []).filter(t => t.required);
      for (const tool of requiredTools) {
        if (!this.mcpHealth.isToolAvailable(tool.tool_ref)) {
          const fallback = plugin.fallback_behavior?.on_tool_unavailable?.[tool.tool_ref];
          if (fallback === 'return_error') {
            this.logger.warn({ trace_id, tool: tool.tool_ref }, 'Required tool unavailable');
            return this._buildResponse(trace_id, chat_id, userMessage,
              plugin.fallback_behavior?.fallback_message || 'Required tool is unavailable.',
              'error', intent, startTime);
          }
        }
      }

      // ─── Step 6: Check Service Registry ───
      const requiredCrew = plugin.layer_4_subagents?.required_crew;
      if (requiredCrew && !this.serviceRegistry.isServiceHealthy(requiredCrew)) {
        this.logger.warn({ trace_id, crew: requiredCrew }, 'Required crew unhealthy');
        const fallback = plugin.fallback_behavior?.on_crew_down;
        if (fallback === 'return_error_gracefully') {
          return this._buildResponse(trace_id, chat_id, userMessage,
            plugin.fallback_behavior?.fallback_message || 'Service temporarily unavailable.',
            'error', intent, startTime);
        }
      }

      // ─── Step 7: Determine execution path ───

      // Multi-step workflow
      if (intent === 'multi_step_campaign' || (entities.actions && entities.actions.length > 1)) {
        this.logger.info({ trace_id, intent }, 'Multi-step workflow');
        return await this._handleWorkflow(trace_id, chat_id, userMessage, entities, memories, conversationHistory, startTime);
      }

      // CrewAI Agent Execution
      if (requiredCrew) {
        this.logger.info({ trace_id, intent, crew: requiredCrew }, 'CrewAI agent execution');
        return await this._handleCrewAI(trace_id, chat_id, userMessage, intent, plugin, memories, conversationHistory, startTime);
      }

      // Hermes Direct Tool Execution (no crew needed)
      this.logger.info({ trace_id, intent }, 'Hermes direct tool execution');
      return await this._handleDirectLLM(trace_id, chat_id, userMessage, conversationHistory, memories, startTime);

    } catch (error) {
      this.logger.error({ trace_id, error: error.message }, 'Router error');
      await saveActivityLog({
        trace_id, service: 'brain', action: 'process_request',
        status: 'error', duration_ms: Date.now() - startTime, error: error.message
      });
      return {
        trace_id,
        status: 'error',
        response: 'I encountered an error processing your request. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Handle direct LLM reply (simple chat, Q&A).
   */
  async _handleDirectLLM(trace_id, chat_id, userMessage, conversationHistory, memories, startTime) {
    const systemPrompt = getSystemPrompt();
    const { content, tokensUsed, model } = await this.brain.generateDirectResponse(
      userMessage, systemPrompt, conversationHistory, memories
    );

    const guardResult = checkResponse(content);
    const finalResponse = guardResult.passed ? content : guardResult.filtered_response;

    // Save conversation
    try {
      await saveConversation({
        chat_id, user_message: userMessage, bot_response: finalResponse,
        intent: 'chat', mode: 'direct', trace_id
      });
    } catch (err) {
      this.logger.warn({ trace_id, error: err.message }, 'Failed to save conversation');
    }

    await saveActivityLog({
      trace_id, service: 'brain', action: 'direct_llm',
      status: 'success', duration_ms: Date.now() - startTime
    });

    return {
      trace_id,
      status: 'success',
      response: finalResponse,
      metadata: { mode: 'direct', model, tokens_used: tokensUsed, duration_ms: Date.now() - startTime }
    };
  }

  /**
   * Handle CrewAI agent execution.
   */
  async _handleCrewAI(trace_id, chat_id, userMessage, intent, plugin, memories, conversationHistory, startTime) {
    const crewName = plugin.layer_4_subagents.required_crew;
    const crewUrl = this.serviceRegistry.getServiceUrl(crewName);

    if (!crewUrl) {
      return this._buildResponse(trace_id, chat_id, userMessage,
        plugin.fallback_behavior?.fallback_message || 'Agent service unavailable.',
        'error', intent, startTime);
    }

    // Build CrewRequest
    const crewRequest = createCrewRequest({
      trace_id,
      user_id: chat_id,
      intent,
      task: intent,
      input: userMessage,
      context: {
        conversation_history: conversationHistory.slice(-5).map(c => ({
          role: 'user', content: c.user_message || ''
        })),
        language: 'en'
      },
      memory: {
        relevant_memories: memories.map(m => m.content),
        user_preferences: {}
      },
      options: {
        timeout_ms: plugin.timeout_ms || 60000,
        include_sources: true
      }
    });

    // Apply plugin persona
    const pluginRules = plugin._rules_content;
    if (pluginRules) {
      crewRequest.context.plugin_rules = pluginRules;
    }

    // Call CrewAI service
    try {
      const response = await withTimeout(
        fetch(`${crewUrl}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(crewRequest)
        }).then(r => {
          if (!r.ok) throw new Error(`CrewAI returned ${r.status}`);
          return r.json();
        }),
        plugin.timeout_ms || 60000,
        `CrewAI ${crewName}`
      );

      // Guard check
      const summary = response.summary || JSON.stringify(response.result || {});
      const guardResult = checkResponse(summary);
      const finalResponse = guardResult.passed ? summary : guardResult.filtered_response;

      // Save conversation
      try {
        await saveConversation({
          chat_id, user_message: userMessage, bot_response: finalResponse,
          intent, mode: 'crew', trace_id
        });
      } catch (err) {
        this.logger.warn({ trace_id, error: err.message }, 'Failed to save conversation');
      }

      await saveActivityLog({
        trace_id, service: 'brain', action: `crew_${crewName}`,
        status: response.status || 'success', duration_ms: Date.now() - startTime
      });

      return {
        trace_id,
        status: response.status || 'success',
        response: finalResponse,
        result: response.result,
        sources: response.sources,
        metadata: {
          mode: 'crew',
          agent: crewName,
          ...response.metadata,
          duration_ms: Date.now() - startTime
        }
      };
    } catch (error) {
      this.logger.error({ trace_id, crew: crewName, error: error.message }, 'CrewAI call failed');
      return this._buildResponse(trace_id, chat_id, userMessage,
        plugin.fallback_behavior?.fallback_message || `Agent ${crewName} failed: ${error.message}`,
        'error', intent, startTime);
    }
  }

  /**
   * Handle multi-step workflow.
   */
  async _handleWorkflow(trace_id, chat_id, userMessage, entities, memories, conversationHistory, startTime) {
    try {
      const result = await this.workflowOrchestrator.execute(
        trace_id, chat_id, userMessage, entities, memories, conversationHistory
      );

      // Save conversation
      try {
        await saveConversation({
          chat_id, user_message: userMessage, bot_response: result.response,
          intent: 'multi_step_campaign', mode: 'workflow', trace_id
        });
      } catch (err) {
        this.logger.warn({ trace_id, error: err.message }, 'Failed to save conversation');
      }

      return {
        trace_id,
        status: result.status,
        response: result.response,
        result: result.result,
        metadata: { mode: 'workflow', duration_ms: Date.now() - startTime, ...result.metadata }
      };
    } catch (error) {
      this.logger.error({ trace_id, error: error.message }, 'Workflow failed');
      return this._buildResponse(trace_id, chat_id, userMessage,
        'Workflow execution failed. Please try a simpler request.',
        'error', 'multi_step_campaign', startTime);
    }
  }

  /**
   * Build a standard response object.
   */
  _buildResponse(trace_id, chat_id, userMessage, response, status, intent, startTime) {
    // Fire-and-forget save
    saveConversation({
      chat_id, user_message: userMessage, bot_response: response,
      intent, mode: status === 'error' ? 'fallback' : 'direct', trace_id
    }).catch(() => {});

    saveActivityLog({
      trace_id, service: 'brain', action: 'response',
      status, duration_ms: Date.now() - startTime
    }).catch(() => {});

    return { trace_id, status, response, metadata: { duration_ms: Date.now() - startTime } };
  }
}

module.exports = Router;
