// AURA Brain Kernel v3.0 — Entry Point & Factory
import config from './config.js';
import { Logger } from './utils.js';
import MemoryManager from './memory.js';
import ContextManager from './context.js';
import IntentRouter from './router.js';
import ReasoningEngine from './reasoning.js';
import BrainKernel from './kernel.js';
import { buildSystemPrompt, AURA_IDENTITY } from './persona.js';
import CrewBridge from '../bridges/crew-bridge.js';
import HermesBridge from '../bridges/hermes-bridge.js';
import PluginBridge from '../bridges/plugin-bridge.js';
import McpBridge from '../bridges/mcp-bridge.js';

const log = new Logger('KernelFactory');

async function createBrain(supabaseClient) {
  log.info('Creating BrainKernel v3.0...');

  const memory = new MemoryManager(supabaseClient);
  const context = new ContextManager();
  const router = new IntentRouter();
  const reasoning = new ReasoningEngine();

  const crewBridge = new CrewBridge(config.services);
  const hermesBridge = new HermesBridge(config.services, config.activeTools);
  const pluginBridge = new PluginBridge();
  const mcpBridge = new McpBridge(config.activeTools);

  await pluginBridge.init();
  await mcpBridge.init();

  const bridges = { crew: crewBridge, hermes: hermesBridge, plugins: pluginBridge, mcp: mcpBridge };
  const brain = new BrainKernel({ memory, context, router, reasoning, bridges });

  log.info('BrainKernel v3.0 READY', { model: config.openrouter.model, memory: memory.enabled, bridges: Object.keys(bridges) });
  return brain;
}

export { createBrain, BrainKernel, MemoryManager, ContextManager, IntentRouter, ReasoningEngine, buildSystemPrompt, AURA_IDENTITY, config };
export default createBrain;
