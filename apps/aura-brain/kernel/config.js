// AURA Brain Kernel v3.0 — Configuration
const config = {
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  services: {
    researchCrewUrl: process.env.RESEARCH_CREW_URL || '',
    imageCrewUrl: process.env.IMAGE_CREW_URL || '',
    hermesUrl: process.env.HERMES_URL || '',
  },
  engine: process.env.BRAIN_ENGINE || 'legacy',
  context: {
    windowSize: parseInt(process.env.CONTEXT_WINDOW_SIZE || '20', 10),
    tokenBudget: parseInt(process.env.TOKEN_BUDGET || '8000', 10),
  },
  env: process.env.AURA_ENV || 'production',
  port: parseInt(process.env.PORT || '3001', 10),
  timeouts: { research: 30000, image: 15000, hermes: 20000, llm: 25000 },
  activeTools: ['web-scraper', 'search-engine', 'image-generator'],
};
export default config;
