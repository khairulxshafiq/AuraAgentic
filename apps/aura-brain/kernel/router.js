// AURA Brain Kernel v3.0 — Intent Router
import { Logger } from './utils.js';
const log = new Logger('Router');

const INTENT_KEYWORDS = {
  research: ['research','cari','find','search','investigate','analyze','analysis','report','study','explore','url','http','https','website','artikel','article','summarize','summary','ringkasan','summarise','siasat','kaji','.com','.my','.org','www'],
  image: ['image','gambar','picture','photo','generate image','create image','draw','lukis','visual','design','illustration','prompt image','build image','buat gambar','cipta gambar','image prompt','artwork','poster','banner'],
  coding: ['code','coding','program','debug','fix code','function','script','javascript','python','node','npm','api','endpoint','deploy','bug','syntax','server','database','sql','json','html','css','react','express','github','git'],
  content: ['content','caption','copywriting','post','social media','hashtag','marketing','blog','sakluma','brand','facebook','instagram','twitter','threads','tiktok','engagement','viral','buat post','draft post','newsletter','campaign'],
  finance: ['finance','kewangan','budget','revenue','profit','cost','harga','price','invoice','tax','cukai','ringgit','myr','untung','rugi','sales','jualan','belanja','gaji','salary','payment','bayaran','accounting','ledger','cash flow'],
  tool: ['tool','execute','run tool','mcp','hermes','jalankan','guna tool','use tool','scrape this','search this'],
  help: ['help','tolong','bantuan','how to','macam mana','cara','tutorial','guide','panduan','apa boleh buat','what can you do','capabilities','keupayaan','ajar','teach me'],
};

class IntentRouter {
  constructor() {
    this.intents = INTENT_KEYWORDS;
    log.info('IntentRouter initialized', { intentCount: Object.keys(this.intents).length });
  }

  classify(message) {
    if (!message || typeof message !== 'string') return { intent: 'chat', confidence: 0, keywords: [], allScores: {} };
    const lower = message.toLowerCase();
    const scores = {}; const matchedKw = {};

    for (const [intent, keywords] of Object.entries(this.intents)) {
      const matched = keywords.filter(kw => lower.includes(kw));
      scores[intent] = matched.length > 0 ? Math.min(matched.length / Math.max(keywords.length * 0.15, 1), 1.0) : 0;
      matchedKw[intent] = matched;
    }

    let best = 'chat', bestScore = 0, bestKw = [];
    for (const [intent, score] of Object.entries(scores)) {
      if (score > bestScore) { bestScore = score; best = intent; bestKw = matchedKw[intent]; }
    }
    if (bestScore < 0.3) { best = 'chat'; bestScore = 1.0 - bestScore * 0.5; bestKw = []; }

    const result = { intent: best, confidence: Math.round(bestScore * 100) / 100, keywords: bestKw, allScores: scores };
    log.debug('Classified', result);
    return result;
  }

  requiresDelegation(intent) { return ['research','image','tool'].includes(intent); }
  getSupportedIntents() { return [...Object.keys(this.intents), 'chat']; }
}

export default IntentRouter;
