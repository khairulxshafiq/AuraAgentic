/**
 * @module core/workflow
 * Multi-step workflow orchestrator.
 * Brain creates workflow_run_id and orchestrates sequential agent/tool steps.
 */

'use strict';

const fs = require('fs');
const path = require('path');
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
    this.workflows = {};

    try {
      const configPath = path.join(__dirname, 'workflows.json');
      if (fs.existsSync(configPath)) {
        this.workflows = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (err) {
      this.logger.error({ error: err.message }, 'Failed to load workflows.json configuration');
    }
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
    const workflowType = entities.workflow_type || 'multi_step_campaign';
    const workflowDef = this.workflows[workflowType] || {
      steps: [
        {
          id: 'research',
          action: 'research',
          depends_on: [],
          inputs: { userMessage: '$input.userMessage', memories: '$input.memories' }
        },
        {
          id: 'image',
          action: 'image',
          depends_on: ['research'],
          inputs: { userMessage: '$input.userMessage', context: '$steps.research.result' }
        }
      ]
    };

    const steps = workflowDef.steps;
    const totalSteps = steps.length;

    this.logger.info({
      trace_id, workflow_run_id, workflowType, totalSteps
    }, 'Starting dynamic config-driven workflow');

    // Create workflow state in Supabase
    try {
      await createWorkflowState({
        workflow_run_id, trace_id, user_id: chat_id,
        workflow_type: workflowType, total_steps: totalSteps
      });
    } catch (err) {
      this.logger.warn({ error: err.message }, 'Failed to create workflow state');
    }

    const results = {};
    let currentStepNum = 0;

    // Execute each step sequentially (resolving DAG inputs)
    for (const step of steps) {
      currentStepNum++;
      this.logger.info({ trace_id, workflow_run_id, step: currentStepNum, stepId: step.id }, `Workflow step ${currentStepNum}: ${step.id}`);

      try {
        // Resolve inputs dynamically
        const resolvedInputs = {};
        for (const [key, value] of Object.entries(step.inputs || {})) {
          if (typeof value === 'string') {
            if (value === '$input.userMessage') {
              resolvedInputs[key] = userMessage;
            } else if (value === '$input.memories') {
              resolvedInputs[key] = memories;
            } else if (value.startsWith('$steps.')) {
              const parts = value.split('.');
              const sourceStepId = parts[1];
              const field = parts[2];
              const stepResult = results[sourceStepId];
              resolvedInputs[key] = stepResult ? stepResult[field] || stepResult : null;
            } else {
              resolvedInputs[key] = value;
            }
          } else {
            resolvedInputs[key] = value;
          }
        }

        // Execute step action
        let stepResult = null;
        if (step.action === 'research') {
          stepResult = await this._stepResearch(trace_id, workflow_run_id, chat_id, resolvedInputs.userMessage, resolvedInputs.memories);
          results.research = stepResult;

          // Save research report
          if (stepResult?.result) {
            try {
              await saveResearchReport({
                trace_id, workflow_run_id,
                title: stepResult.result.title || 'Research Report',
                summary: stepResult.result.summary || '',
                key_findings: stepResult.result.key_findings || [],
                sources: stepResult.sources || []
              });
            } catch (err) {
              this.logger.warn({ error: err.message }, 'Failed to save research report');
            }
          }
        } else if (step.action === 'image') {
          stepResult = await this._stepImage(trace_id, workflow_run_id, chat_id, resolvedInputs.userMessage, resolvedInputs.context);
          results.image = stepResult;

          // Save image prompt
          if (stepResult?.result) {
            try {
              await saveImagePrompt({
                trace_id, workflow_run_id,
                prompt: stepResult.result.prompt || '',
                negative_prompt: stepResult.result.negative_prompt || '',
                style: stepResult.result.style || 'photorealistic',
                dimensions: stepResult.result.dimensions || {}
              });
            } catch (err) {
              this.logger.warn({ error: err.message }, 'Failed to save image prompt');
            }
          }
        } else {
          throw new Error(`Unsupported workflow step action: ${step.action}`);
        }

        // Update workflow state
        try {
          await updateWorkflowState(workflow_run_id, {
            current_step: currentStepNum,
            steps_completed: steps.slice(0, currentStepNum).map(s => s.id),
            intermediate_results: results,
            status: currentStepNum === totalSteps ? 'completed_draft' : 'in_progress'
          });
        } catch (err) {
          this.logger.warn({ error: err.message }, 'Failed to update workflow state');
        }

      } catch (error) {
        this.logger.error({ trace_id, step: currentStepNum, stepId: step.id, error: error.message }, 'Workflow step failed');
        results[step.id] = { status: 'error', error: error.message };
      }
    }

    // Compile final response
    const compiledResponse = this._compileResponse(results, steps.map(s => s.id));

    await saveActivityLog({
      trace_id, workflow_run_id, service: 'brain', action: 'workflow_complete',
      status: 'success', details: { steps: totalSteps }
    });

    return {
      status: 'success',
      response: compiledResponse,
      result: results,
      metadata: { workflow_run_id, steps_completed: steps.map(s => s.id) }
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
