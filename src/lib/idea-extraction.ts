import { ChatMessage as Message } from '@/types/chat';

// Basic English stopwords (small set to keep bundle small)
const STOPWORDS = new Set(['the','a','an','and','or','but','if','then','when','to','for','of','on','in','with','it','its','is','are','be','as','that','this','those','these','at','by','from','we','you','our','their','they','i','my','me','your']);

export interface DerivedPersonasResult {
  personas: Array<{ name: string; pains: string[]; motivators: string[]; spend?: string }>;
  pains: string[];
}

export interface PricingHintsResult {
  models: string[];
  pricePoints: number[];
  inferredPrimaryModel?: string;
  avgPrice?: number;
}

export interface KeywordFrequenciesResult {
  keywords: Array<{ term: string; count: number }>;
}

export function aggregateUserMessages(messages: Message[], limit = 40): string {
  const userMsgs = messages.filter(m => m.type === 'user').map(m => (m.content || '').trim()).filter(Boolean);
  return userMsgs.slice(-limit).map((c,i)=>`U${i+1}: ${c}`).join('\n');
}

export function inferIdeaFromMessages(messages: Message[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.type !== 'user') continue;
    const text = (m.content || '').trim();
    if (!text) continue;
    if (/^(hi|hello|hey|thanks|thank you|cool|ok|okay|yo)$/i.test(text)) continue;
    const words = text.split(/\s+/);
    const longEnough = words.length >= 3 || text.length >= 18;
    const hasVerb = /build|launch|create|make|help|solve|platform|app|tool|service|market|improv/i.test(text);
    if (longEnough || hasVerb) return text;
  }
  const loose = [...messages].filter(m => m.type==='user' && m.content && m.content.length > 12 && m.content.includes(' ')).shift();
  return loose?.content;
}

export function derivePersonasAndPains(messages: Message[]): DerivedPersonasResult {
  const painsSet = new Set<string>();
  const personaMap: Record<string, { pains: Set<string>; motivators: Set<string>; spend?: string }> = {};
  const userTexts = messages.filter(m=>m.type==='user').map(m=>m.content || '');
  userTexts.forEach(txt => {
    const lower = txt.toLowerCase();
    // Pain indicators
    const painRegex = /(pain|struggl\w+|hard|difficult|frustrat\w+|time[- ]consuming|expensive|costly|annoying|slow)/gi;
    const found = txt.match(painRegex) || [];
    found.forEach(f => painsSet.add(f.toLowerCase()));
    // Persona pattern: "for X" or "help(ing)? X" or "target (users|audience|customers) are X"
    const forMatches = [...txt.matchAll(/for ([A-Z][A-Za-z0-9 ,&/-]{2,40})/g)].map(m=>m[1].trim());
    const helpMatches = [...txt.matchAll(/help(?:ing)? ([A-Z][A-Za-z0-9 ,&/-]{2,40})/g)].map(m=>m[1].trim());
    [...forMatches, ...helpMatches].forEach(raw => {
      const key = raw.replace(/\b(users|people|customers|teams)\b/gi,'').trim();
      if (!key) return;
      if (!personaMap[key]) personaMap[key] = { pains: new Set(), motivators: new Set() };
      found.forEach(f => personaMap[key].pains.add(f.toLowerCase()));
      // Motivators heuristics
      if (/save time|faster|growth|scale|automate|insight|clarity|predict/i.test(lower)) {
        (lower.match(/save time|faster|growth|scale|automate|insight|clarity|predict/gi) || []).forEach(mv => personaMap[key].motivators.add(mv.toLowerCase()));
      }
      // Spend pattern: $X or X/mo
      const spend = txt.match(/\$(\d{1,4})(?:\s?\/\s?(?:mo|month))?/i) || txt.match(/(\d{1,4})\s?(?:per|\/)(?:mo|month)/i);
      if (spend) personaMap[key].spend = `$${spend[1]}/mo`;
    });
  });
  const personas = Object.entries(personaMap).slice(0,6).map(([name, data]) => ({
    name,
    pains: [...data.pains].slice(0,5),
    motivators: [...data.motivators].slice(0,5),
    spend: data.spend
  }));
  return { personas, pains: [...painsSet].slice(0,20) };
}

export function extractKeywordFrequencies(messages: Message[], max = 30): KeywordFrequenciesResult {
  const freq: Record<string, number> = {};
  messages.filter(m=>m.type==='user').forEach(m => {
    const words = (m.content||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w && w.length>2 && !STOPWORDS.has(w));
    words.forEach(w => { freq[w] = (freq[w]||0)+1; });
  });
  const keywords = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,max).map(([term,count])=>({ term, count }));
  return { keywords };
}

export function parsePricingHints(messages: Message[]): PricingHintsResult {
  const modelsSet = new Set<string>();
  const pricePoints: number[] = [];
  messages.filter(m=>m.type==='user').forEach(m => {
    const txt = m.content || '';
    const lower = txt.toLowerCase();
    if (/subscription|recurring|monthly|annual|per month|monthly plan/.test(lower)) modelsSet.add('Subscription');
    if (/one[- ]time|lifetime/.test(lower)) modelsSet.add('One-Time');
    if (/freemium|free tier/.test(lower)) modelsSet.add('Freemium');
    if (/usage-based|pay as you go|per request|per api call/.test(lower)) modelsSet.add('Usage-Based');
    if (/marketplace fee|take rate|commission/.test(lower)) modelsSet.add('Marketplace');
    const priceRegex = /\$(\d{1,4})(?:\s?\/\s?(?:mo|month|m))?/gi;
    let mPrice: RegExpExecArray | null;
    while ((mPrice = priceRegex.exec(txt)) !== null) {
      pricePoints.push(Number(mPrice[1]));
    }
  });
  const avgPrice = pricePoints.length ? pricePoints.reduce((a,b)=>a+b,0)/pricePoints.length : undefined;
  // Infer primary model heuristic
  let inferredPrimaryModel: string | undefined;
  if (modelsSet.size === 1) inferredPrimaryModel = [...modelsSet][0];
  else if (modelsSet.has('Subscription')) inferredPrimaryModel = 'Subscription';
  return { models: [...modelsSet], pricePoints, inferredPrimaryModel, avgPrice };
}
