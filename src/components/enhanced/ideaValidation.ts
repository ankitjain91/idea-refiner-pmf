import { supabase } from '@/integrations/supabase/client';
import { isIdeaDescription, createIdeaPreview } from '../chat/utils';
import { Message } from '../chat/types';

export interface ValidationResult {
  valid: boolean;
  preview?: string;
  gateMessage?: Message;
}

export async function validateFirstIdea(messageText: string, wrinklePoints: number, hasValidIdea: boolean): Promise<ValidationResult> {
  if (hasValidIdea) return { valid: true };
  
  // VERY lenient heuristic - accept almost anything that looks like an attempt
  const looksLikeIdea = messageText.length > 10 && (
    // Business/startup related
    messageText.toLowerCase().includes('connect') ||
    messageText.toLowerCase().includes('platform') ||
    messageText.toLowerCase().includes('app') ||
    messageText.toLowerCase().includes('tool') ||
    messageText.toLowerCase().includes('service') ||
    messageText.toLowerCase().includes('help') ||
    messageText.toLowerCase().includes('solve') ||
    messageText.toLowerCase().includes('build') ||
    messageText.toLowerCase().includes('create') ||
    messageText.toLowerCase().includes('startup') ||
    messageText.toLowerCase().includes('business') ||
    messageText.toLowerCase().includes('idea') ||
    messageText.toLowerCase().includes('automate') ||
    messageText.toLowerCase().includes('manage') ||
    messageText.toLowerCase().includes('track') ||
    messageText.toLowerCase().includes('find') ||
    messageText.toLowerCase().includes('match') ||
    messageText.toLowerCase().includes('marketplace') ||
    messageText.toLowerCase().includes('sell') ||
    messageText.toLowerCase().includes('buy') ||
    messageText.toLowerCase().includes('share') ||
    messageText.toLowerCase().includes('system') ||
    messageText.toLowerCase().includes('software') ||
    messageText.toLowerCase().includes('website') ||
    messageText.toLowerCase().includes('online') ||
    messageText.toLowerCase().includes('digital') ||
    messageText.toLowerCase().includes('product') ||
    messageText.toLowerCase().includes('service') ||
    messageText.toLowerCase().includes('customer') ||
    messageText.toLowerCase().includes('user') ||
    messageText.toLowerCase().includes('people') ||
    messageText.toLowerCase().includes('company') ||
    messageText.toLowerCase().includes('social') ||
    messageText.toLowerCase().includes('network') ||
    // Any "for" statement suggesting a solution
    messageText.toLowerCase().includes(' for ') ||
    // Contains any action verb that could imply building something
    messageText.toLowerCase().match(/\b(make|design|develop|launch|start|open|run|operate|offer|provide)\b/)
  );
  
  // Check for obvious non-ideas (greetings, gibberish, etc)
  const isObviouslyNotAnIdea = 
    messageText.length < 8 ||
    messageText.toLowerCase().match(/^(hi+|hello+|hey+|yo+|sup+|test+|testing+|asdf+|qwerty+|lol+|haha+|hehe+|ok+|yes+|no+|maybe+|idk+|bruh+|dude+|what+|why+|how+|when+|where+|\?+|!+|\.\.+)$/i) ||
    messageText.toLowerCase().match(/^(what'?s? up|how are you|good morning|good evening|good night|bye+|goodbye|see ya|later)$/i) ||
    // Just emojis or punctuation
    messageText.match(/^[\s\p{Emoji}\p{P}]+$/u);
  
  // Be SUPER lenient - accept if it looks like any attempt at an idea
  if (looksLikeIdea || (messageText.length > 20 && !isObviouslyNotAnIdea)) {
    return { valid: true, preview: createIdeaPreview(messageText) };
  }
  
  // Only validate with AI if it doesn't pass our lenient checks
  const validationPrompt = `You are an EXTREMELY LENIENT startup idea validator. Accept ANY attempt at describing a business idea, product, or service. Only reject if it's CLEARLY just a greeting, random text, gibberish, or completely unrelated to any business concept. If there's ANY possibility it could be interpreted as a business idea, mark it VALID. Respond ONLY with JSON: {"valid": true|false}. User submission: """${messageText}"""`;
  
  try {
    const { data, error } = await supabase.functions.invoke('idea-chat', { 
      body: { 
        message: validationPrompt, 
        conversationHistory: [] 
      }
    });
    
    if (error) throw error;
    
    let parsed: any = {};
    try {
      const jsonMatch = data?.response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {}
    
    // If AI says valid OR it's reasonably long, accept it
    if (parsed.valid === true || messageText.length > 25) {
      return { valid: true, preview: createIdeaPreview(messageText) };
    }
  } catch {
    // If validation fails and it's reasonably long, just accept it
    if (messageText.length > 15 && !isObviouslyNotAnIdea) {
      return { valid: true, preview: createIdeaPreview(messageText) };
    }
  }
  
  // Only reject if we're really sure it's not an idea - provide funny responses
  const funnyResponses = [
    "🤔 That's like walking into Shark Tank and saying 'I have feelings.' Give me something I can invest brain cells in!",
    "🧠 My smooth brain just got smoother. Feed me an actual business idea before I become a marble!",
    "😅 That's not an idea, that's what my brain sounds like before coffee. What problem are you solving?",
    "🎪 Welcome to the circus! But I need to know what act you're performing. What's your startup idea?",
    "🍔 You just ordered 'food' at a restaurant. I need specifics - what's cooking in that brain of yours?",
    "🎯 You missed the dartboard entirely! Throw me an actual idea - who needs what solution?",
    "🦄 That's about as real as a unicorn's LinkedIn profile. What's your actual business concept?",
    "🏗️ That's like showing up to a construction site with interpretive dance. Blueprint please - what are we building?",
    "🎰 You're pulling the slot machine without putting coins in! Insert idea to continue...",
    "🚀 Houston, we have a problem - no idea detected! What's your mission to Mars?",
    "🧪 Error 404: Business idea not found. Try again with actual neurons firing!",
    "🎮 You pressed random buttons on the controller. What game are we actually playing here?",
    "🍕 You just asked for 'stuff on bread.' I need toppings! What's your business recipe?",
    "🏃 You're running but forgot to put on shoes. What's the actual race you're entering?",
    "🎨 That's finger painting without paint. Show me your masterpiece idea!"
  ];
  
  const randomFunny = funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
  
  const suggestions = [
    "An app that helps [specific people] do [specific thing]",
    "A platform connecting [group A] with [group B]",
    "Software that automates [tedious task] for [target users]",
    "A marketplace for [specific product/service]",
    "A tool that solves [specific problem] for [specific industry]"
  ];
  
  const gateMessage: Message = {
    id: Date.now().toString(),
    type: 'bot',
    content: randomFunny + "\n\n💡 **Pro tip:** I'm super chill - just mention ANY business idea, product, or service. Even 'Uber for dogs' works!",
    timestamp: new Date(),
    suggestions: suggestions,
    pointsEarned: 0,
    pointsExplanation: 'No brain wrinkles yet - need an actual idea first!'
  };
  
  return { valid: false, gateMessage };
}