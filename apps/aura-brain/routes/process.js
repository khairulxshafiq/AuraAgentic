// ============================================================
// AURA Brain — routes/process.js (MODIFIED for Hybrid Brain v3)
// Added BRAIN_ENGINE toggle. Default: 'legacy' (safe).
// ============================================================
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// ── Engine Toggle ──────────────────────────────────────────
const BRAIN_ENGINE = process.env.BRAIN_ENGINE || 'legacy';
console.log(`[AURA] Brain Engine: ${BRAIN_ENGINE}`);

// ── Supabase Client (shared) ──────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── Kernel Brain (lazy loaded) ────────────────────────────
let kernelBrain = null;

async function getKernelBrain() {
  if (kernelBrain) return kernelBrain;
  const { createBrain } = await import('../kernel/index.js');
  kernelBrain = await createBrain(supabase);
  return kernelBrain;
}

// ── POST /process ─────────────────────────────────────────
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { message, userId, chatId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const uid = userId || chatId || 'anonymous';

    // ════════════════════════════════════════════════════════
    // KERNEL ENGINE (New Hybrid Brain v3)
    // ════════════════════════════════════════════════════════
    if (BRAIN_ENGINE === 'kernel') {
      const brain = await getKernelBrain();
      const result = await brain.process(uid, message);

      return res.json({
        response: result.response,
        intent: result.intent,
        plan: result.plan,
        executionTime: result.executionTime,
        traceId: result.traceId,
        engine: result.engine,
      });
    }

    // ════════════════════════════════════════════════════════
    // LEGACY ENGINE (Current production code)
    // ════════════════════════════════════════════════════════
    // >>> KEEP YOUR EXISTING CODE BELOW THIS LINE <<<
    // >>> This is your current brain.js / router.js logic <<<
    // >>> It remains completely UNTOUCHED when BRAIN_ENGINE=legacy <<<

    // --- START OF YOUR EXISTING LEGACY CODE ---
    // Import your existing brain module
    const { processBrainRequest } = await import('../core/brain.js');

    // Or if your current code uses router.js:
    // const { handleRequest } = await import('../core/router.js');

    const legacyResult = await processBrainRequest({
      message,
      userId: uid,
      chatId,
      supabase,
    });

    return res.json({
      response: legacyResult.response || legacyResult,
      engine: 'legacy',
      executionTime: Date.now() - startTime,
    });
    // --- END OF YOUR EXISTING LEGACY CODE ---

  } catch (error) {
    console.error('[AURA] Process error:', error.message);
    return res.status(500).json({
      error: 'Internal processing error',
      message: error.message,
      engine: BRAIN_ENGINE,
    });
  }
});

export default router;
