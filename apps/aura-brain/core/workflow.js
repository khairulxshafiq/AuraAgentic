/**
 * @module core/workflow
 * Multi-step workflow orchestrator.
 * Brain creates workflow_run_id and orchestrates sequential agent/tool steps.
 */

'use strict';

const { generateWorkflowRunId, nowISO, withTimeout } = require('@aura/shared-utils');
const { createCrewRequest } = require('@aura/shared-types');
const {
  createWorkflowState,
  updateWorkflowState,
  saveActivityLog,
  saveResearchReport,
  saveImagePrompt
} = require('@aura/shared-memory');

class WorkflowOrchestrator {
  /**
   * @param {Object} router - Router instance (provides access to registries, clients, config)
   */
  constructor(router) {
    this.router = router;
    this.logger = router.logger;
    this.config = router.config;
    this.serviceRegistry = router.serviceRegistry;
    this.mcpClient = router.mcpClient;
  }

  /**
   * Execute a multi-step workflow.
   * @param {string} trace_id
   * @param {string} chat_id
   * @param {string} userMessage
   * @param {Object} entities - Detected entities including actions array
   * @param {Array} memories
   * @param {Array} conversationHistory
   * @returns {Promise<Object>}
   */
  async execute(trace_id, chat_id, userMessage, entities, memories, conversationHistory) {
    const workflow_run_id = generateWorkflowRunId();
    const actions = entities.actions || ['research', 'image'];
    const totalSteps = actions.length;

    this.logger.info({
      trace_id, workflow_run_id, actions, totalSteps
    }, 'Starting multi-step workflow');

    // Create workflow state in Supabase
    try {
      await createWorkflowState({
        workflow_run_id, trace_id, user_id: chat_id,
        workflow_type: 'multi_step_campaign', total_steps: totalSteps
      });
    } catch (err) {
      this.logger.warn({ error: err.message }, 'Failed to create workflow state');
    }

    const results = {};
    let currentStep = 0;
    let lastContext = null;

    // Execute each step sequentially
    for (const action of actions) {
      currentStep++;
      this.logger.info({ trace_id, workflow_run_id, step: currentStep, action }, `Workflow step ${currentStep}`);

      try {
        if (action === 'research') {
          const researchResult = await this._stepResearch(trace_id, workflow_run_id, chat_id, userMessage, memories);
          results.research = researchResult;
          lastContext = researchResult;

          // Save research report
          if (researchResult?.result) {
            try {
              await saveResearchReport({
                trace_id, workflow_run_id,
                title: researchResult.result.title || 'Research Report',
                summary: researchResult.result.summary || '',
                key_findings: researchResult.result.key_findings || [],
                sources: researchResult.sources || []
              });
            } catch (err) {
              this.logger.warn({ error: err.message }, 'Failed to save research report');
            }
          }
        } else if (action === 'image') {
          const imageResult = await this._stepImage(trace_id, workflow_run_id, chat_id, userMessage, lastContext);
          results.image = imageResult;

          // Save image prompt
          if (imageResult?.result) {
            try {
              await saveImagePrompt({
                trace_id, workflow_run_id,
                prompt: imageResult.result.prompt || '',
                negative_prompt: imageResult.result.negative_prompt || '',
                style: imageResult.result.style || 'photorealistic',
                dimensions: imageResult.result.dimensions || {}
              });
            } catch (err) {
              this.logger.warn({ error: err.message }, 'Failed to save image prompt');
            }
          }
        }

        // Update workflow state
        try {
          await updateWorkflowState(workflow_run_id, {
            current_step: currentStep,
            steps_completed: actions.slice(0, currentStep),
            intermediate_results: results,
            status: currentStep === totalSteps ? 'completed_draft' : 'in_progress'
          });
        } catch (err) {
          this.logger.warn({ error: err.message }, 'Failed to update workflow state');
        }

      } catch (error) {
        this.logger.error({ trace_id, step: currentStep, action, error: error.message }, 'Workflow step failed');
        results[action] = { status: 'error', error: error.message };
      }
    }

    // Compile final response
    const compiledResponse = this._compileResponse(results, actions);

    await saveActivityLog({
      trace_id, workflow_run_id, service: 'brain', action: 'workflow_complete',
      status: 'success', details: { steps: totalSteps }
    });

    return {
      status: 'success',
      response: compiledResponse,
      result: results,
      metadata: { workflow_run_id, steps_completed: actions }
    };
  }

  async _stepResearch(trace_id, workflow_run_id, chat_id, userMessage, memories) {
    const crewUrl = this.serviceRegistry.getServiceUrl('research_crew');
    if (!crewUrl) throw new Error('research_crew service unavailable');

    const request = createCrewRequest({
      trace_id, workflow_run_id, user_id: chat_id,
      intent: 'research_website', task: 'research_and_summarize',
      input: userMessage,
      memory: { relevant_memories: memories.map(m => m.content) },
      options: { timeout_ms: 60000, include_sources: true }
    });

    const response = await withTimeout(
      fetch(`${crewUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      }).then(r => r.json()),
      60000,
      'Research crew execution'
    );

    return response;
  }

  async _stepImage(trace_id, workflow_run_id, chat_id, userMessage, researchContext) {
    const crewUrl = this.serviceRegistry.getServiceUrl('image_crew');
    if (!crewUrl) throw new Error('image_crew service unavailable');

    const request = createCrewRequest({
      trace_id, workflow_run_id, user_id: chat_id,
      intent: 'build_image', task: 'generate_image_prompt',
      input: userMessage,
      context: {
        research_context: researchContext?.result || null
      },
      options: { timeout_ms: 30000 }
    });

    const response = await withTimeout(
      fetch(`${crewUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      }).then(r => r.json()),
      30000,
      'Image crew execution'
    );

    return response;
  }

  _compileResponse(results, actions) {
    const parts = [];

    parts.push('📋 **Workflow Complete!**\n');

    if (results.research) {
      parts.push('📊 **Research Summary:**');
      if (results.research.result) {
        parts.push(results.research.summary || results.research.result.summary || 'Research completed.');
        if (results.research.result.key_findings) {
          parts.push('\nKey findings:');
          results.research.result.key_findings.forEach((f, i) => {
            parts.push(`  ${i + 1}. ${f}`);
          });
        }
      } else if (results.research.error) {
        parts.push(`Research failed: ${results.research.error}`);
      }
      parts.push('');
    }

    if (results.image) {
      parts.push('🎨 **Image Concept:**');
      if (results.image.result) {
        parts.push(results.image.result.prompt || results.image.summary || 'Image prompt generated.');
      } else if (results.image.error) {
        parts.push(`Image generation failed: ${results.image.error}`);
      }
      parts.push('');
    }

    parts.push('✅ Draft ready. Would you like me to proceed with anything else?');

    return parts.join('\n');
  }
}

module.exports = { WorkflowOrchestrator };
