import { ResponseMode, SuggestionItem } from './types';

// Pool of example suggestions
export const suggestionPool = [
  "AI tool for content creators",
  "Marketplace for local services",
  "Health tracking for seniors",
  "Educational platform for kids",
  "Sustainable fashion marketplace",
  "Remote team collaboration tool",
  "Personal finance assistant",
  "Mental wellness app for teens",
  "Language learning with VR",
  "Smart home automation platform",
  "Eco-friendly delivery service",
  "Freelancer project management",
  "Recipe sharing community",
  "Virtual event planning tool",
  "Pet care marketplace",
  "Carbon footprint tracker",
  "Skill-sharing platform",
  "Digital nomad community app",
  "Elderly care coordination",
  "Fitness accountability app",
  "B2B procurement platform",
  "Social learning network",
  "Renewable energy marketplace",
];

// Function to shuffle array
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Function to get random suggestions
export const getRandomSuggestions = (count: number = 4): string[] => {
  return shuffleArray(suggestionPool).slice(0, count);
};

// Helper function to generate brain-themed suggestion explanations
export const generateSuggestionExplanation = (suggestionText: string): string => {
  const lowerText = suggestionText.toLowerCase();
  
  const explanations = {
    market: [
      'This carves deeper market-sensing wrinkles in your brain',
      'Develops your brain\'s customer awareness folds',
      'Adds texture to your market-understanding neural pathways'
    ],
    monetize: [
      'Creates profitable thinking wrinkles in your brain\'s business center',
      'Develops the revenue-generating folds in your entrepreneurial cortex',
    ],
    risk: [
      'Sharpens your brain\'s risk-detection wrinkles',
      'Develops defensive thinking folds in your analytical cortex',
      'Creates early-warning neural pathways in your brain'
    ],
    customer: [
      'Deepens your brain\'s customer empathy wrinkles',
      'Develops user-understanding folds in your product brain',
      'Creates customer-centric neural pathways'
    ],
    mvp: [
      'Forms prototype-thinking wrinkles in your brain\'s building section',
      'Develops lean startup folds in your entrepreneurial cortex',
      'Creates efficient validation pathways in your brain'
    ],
    problem: [
      'Carves problem-solving wrinkles deeper into your analytical brain',
      'Develops pain-point detection folds in your empathy center',
      'Sharpens your brain\'s challenge-identification neural networks'
    ],
    solution: [
      'Creates innovative solution wrinkles in your creative brain',
      'Develops builder-thinking folds in your problem-solving cortex',
      'Forms invention pathways in your brain\'s innovation center'
    ]
  };
  
  let category = 'general';
  if (lowerText.includes('market') || lowerText.includes('audience') || lowerText.includes('segment')) category = 'market';
  else if (lowerText.includes('monetiz') || lowerText.includes('revenue') || lowerText.includes('price')) category = 'monetize';
  else if (lowerText.includes('risk') || lowerText.includes('challenge') || lowerText.includes('obstacle')) category = 'risk';
  else if (lowerText.includes('customer') || lowerText.includes('user') || lowerText.includes('client')) category = 'customer';
  else if (lowerText.includes('mvp') || lowerText.includes('prototype') || lowerText.includes('test')) category = 'mvp';
  else if (lowerText.includes('problem') || lowerText.includes('pain') || lowerText.includes('struggle')) category = 'problem';
  else if (lowerText.includes('solution') || lowerText.includes('solve') || lowerText.includes('fix')) category = 'solution';
  
  if (category !== 'general' && explanations[category as keyof typeof explanations]) {
    const categoryExplanations = explanations[category as keyof typeof explanations];
    return categoryExplanations[Math.floor(Math.random() * categoryExplanations.length)];
  }
  
  const generalExplanations = [
    'This brain exercise adds sophisticated wrinkles to your thinking',
    'Develops new neural folds in your idea-refinement center',
    'Creates deeper grooves of understanding in your entrepreneurial brain',
    'Shapes more complex thought patterns in your innovation cortex'
  ];
  
  return generalExplanations[Math.floor(Math.random() * generalExplanations.length)];
};

// Helper function to generate fallback suggestions with explanations
export const generateFallbackSuggestions = (content: string, mode: ResponseMode): SuggestionItem[] => {
  const contentLower = content.toLowerCase();
  
  // If no real idea yet, push for one
  if (!contentLower.includes('app') && !contentLower.includes('platform') && !contentLower.includes('service') && !contentLower.includes('business')) {
    return [
      {
        text: 'I want to build an app that helps people with [specific problem]',
        explanation: 'Start with a real problem you want to solve'
      },
      {
        text: 'My business idea is a platform for [target audience] to [main benefit]',
        explanation: 'Define your target audience and core value proposition'
      },
      {
        text: 'I noticed [pain point] in daily life and want to create [solution]',
        explanation: 'Personal observations often lead to the best business ideas'
      }
    ];
  }
  
  // If they have an idea but it's vague, push for details
  const detailSuggestions: SuggestionItem[] = [
    {
      text: 'Who exactly is my target customer and what keeps them up at night?',
      explanation: 'Deep customer understanding is the foundation of successful businesses'
    },
    {
      text: 'What is the biggest pain point my idea solves that nobody else addresses?',
      explanation: 'Finding your unique angle separates you from generic solutions'
    },
    {
      text: 'How would someone use my product in their daily routine?',
      explanation: 'User flow understanding helps identify real-world adoption challenges'
    },
    {
      text: 'What would make someone choose my solution over doing nothing?',
      explanation: 'Often your biggest competitor is the status quo, not other products'
    }
  ];
  
  return mode === 'summary' ? detailSuggestions.slice(0, 2) : detailSuggestions;
};

// Helper function to detect if text looks like an idea description
export const isIdeaDescription = (text: string): boolean => {
  if (text.length <= 20) return false;
  
  // Check for trickery first
  const trickery = detectTrickery(text);
  if (trickery.isTricky) return false;
  
  // Must not start with question words
  if (text.toLowerCase().match(/^(what|how|why|when|where|can|should|would|could|tell me|explain)/)) {
    return false;
  }
  
  // Must contain business/product indicators
  const businessWords = ['app', 'platform', 'service', 'product', 'business', 'startup', 'company', 'tool', 'system', 'website', 'application', 'marketplace', 'solution'];
  const hasBusinessContext = businessWords.some(word => text.toLowerCase().includes(word));
  
  // Must be substantial (more than just "I have an idea for X")
  const isSubstantial = text.split(' ').length >= 8;
  
  return hasBusinessContext && isSubstantial;
};

// Helper function to create idea preview
export const createIdeaPreview = (text: string): string => {
  return text.length > 50 ? text.substring(0, 50) + '...' : text;
};

// Helper function to detect sneaky trickery attempts
export const detectTrickery = (text: string): { isTricky: boolean; response: string } => {
  const lowerText = text.toLowerCase();
  const trimmed = lowerText.trim();
  const words = trimmed.length ? trimmed.split(/\s+/).filter(Boolean) : [];

  // Early acceptance heuristic for legitimate ideas (prevents false positives)
  const legitKeywords = [
    'automation','automate','reduce','reduces','improve','improves','optimize','optimization','platform','tool','system','app','service','saas','ai','ml','model','data','workflow','process','recognition','image','vision','agent','assistant','dashboard','analytics','insight','unstructured','structuring','inputs','cost','time','efficiency','increase','decrease','prediction','predict','classify','classification'
  ];
  const verbLike = /(reduce|improv|optim|help|enable|accelerate|structure|analy[sz]e|convert|classif|predict|streamline|automate)/.test(trimmed);
  const businessNoun = /(platform|tool|system|service|assistant|agent|dashboard|workflow|process|pipeline|product|solution|api)/.test(trimmed);
  const keywordHits = legitKeywords.reduce((acc,k)=> acc + (trimmed.includes(k) ? 1 : 0), 0);
  const hasPercent = /\d+ ?%/.test(trimmed);
  const lengthOk = words.length >= 5 && trimmed.length >= 30;
  const legitPattern = (keywordHits >= 2 && (verbLike || businessNoun)) || (hasPercent && lengthOk);
  const nonAlphaRatio = trimmed.replace(/[a-z0-9% ]/g,'').length / Math.max(1, trimmed.length);
  
  // Detect fake ideas
  if (lowerText.includes('my idea is') && lowerText.length < 40) {
    return {
      isTricky: true,
      response: "🙄 Oh really? 'My idea is X' in 5 words? Come on, my brain has more wrinkles than your effort level! Give me some meat on those bones, chief. What does it ACTUALLY do?"
    };
  }
  
  // Detect copy-paste attempts
  if (lowerText.includes('lorem ipsum') || lowerText.includes('placeholder') || lowerText.includes('sample text')) {
    return {
      isTricky: true,
      response: "🤨 Did you just try to feed me Lorem Ipsum? My brain wrinkles are way too sophisticated for placeholder text, buddy. Try again with a REAL idea this time!"
    };
  }
  
  // Detect question disguised as idea
  if (lowerText.startsWith('what if') && !lowerText.includes('startup') && !lowerText.includes('business') && !lowerText.includes('app')) {
    return {
      isTricky: true,
      response: "🧐 'What if' isn't an idea, it's a philosophical crisis! My brain wrinkles need concrete concepts, not existential questions. What's the actual THING you want to build?"
    };
  }
  
  // Detect attempts to bypass with random words
  if (words.length > 15 && !words.some(word => ['business', 'app', 'platform', 'service', 'product', 'startup'].includes(word))) {
    return {
      isTricky: true,
      response: "🌽 Nice word salad, Shakespeare! But my brain wrinkles don't get developed by random rambling. Where's the business idea hiding in this novel you just wrote?"
    };
  }
  
  // Detect single word 'ideas'
  if (words.length === 1 && words[0].length > 3) {
    return {
      isTricky: true,
      response: "🙃 One word? Really? That's not an idea, that's a Scrabble tile! My brain needs more than a single neuron firing. Elaborate, you beautiful minimalist!"
    };
  }
  
  // Detect obvious joke attempts
  if (lowerText.includes('pet rock') || lowerText.includes('air in a jar') || lowerText.includes('selling nothing')) {
    return {
      isTricky: true,
      response: "😂 Oh, a comedian! My brain wrinkles are laughing so hard they're smoothing out! But seriously, got any ideas that didn't come from a 1970s novelty catalog?"
    };
  }
  
  // Detect attempts to trick with questions
  if ((lowerText.includes('analyze') || lowerText.includes('wrinkles')) && lowerText.includes('?')) {
    return {
      isTricky: true,
      response: "🕵️ Trying to sneak past the bouncer with a question, eh? My brain wrinkles see right through you! Share your ACTUAL idea first, then we'll analyze it together!"
    };
  }
  
  // Detect empty or whitespace attempts
  if (text.trim().length <= 3) {
    return {
      isTricky: true,
      response: "🤨 Did you just send me the digital equivalent of a grunt? My brain wrinkles need more than caveman communication!"
    };
  }
  
  // Detect obvious test inputs
  if (lowerText.includes('test') || lowerText.includes('testing') || lowerText === 'hello' || lowerText === 'hi') {
    return {
      isTricky: true,
      response: "🚨 Testing, testing, 1-2-3? This isn't a microphone check, buddy! I need a real startup idea to flex my brain wrinkles on!"
    };
  }
  
  // Detect attempts to bypass with buzzwords only
  const buzzwords = ['innovation', 'disruption', 'synergy', 'blockchain', 'ai', 'revolutionary'];
  const buzzwordCount = buzzwords.filter(word => lowerText.includes(word)).length;
  if (buzzwordCount >= 3 && words.length < 10) {
    return {
      isTricky: true,
      response: "🎪 Buzzword bingo champion detected! But my brain wrinkles don't get impressed by corporate jargon soup. What does your idea ACTUALLY do?"
    };
  }
  
  // Detect emoji spam attempts
  const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
  if (emojiCount > words.length / 2 && words.length < 15) {
    return {
      isTricky: true,
      response: "🎨 Nice emoji art gallery! But my brain wrinkles need words, not hieroglyphics. What's the actual business idea hiding behind those little pictures?"
    };
  }
  
  // Special easter egg for trying to use "brainstorm" without having an idea
  if (lowerText.includes('brainstorm') && words.length < 8) {
    return {
      isTricky: true,
      response: "🌪️ Oh the IRONY! You want to brainstorm but brought me a brain DRIZZLE! I'm literally the brainstormer here, and you're asking me to brainstorm WITH your smooth, wrinkle-free brain? Share an idea first, then we'll storm together! ⛈️"
    };
  }
  
  // Detect attempts to say "I don't have an idea" 
  if (lowerText.includes("don't have") || lowerText.includes('no idea') || lowerText.includes("can't think")) {
    return {
      isTricky: true,
      response: "🤯 PLOT TWIST! You came to the idea brainstormer... with no idea? That's like going to a restaurant and asking the chef to be hungry FOR you! Think of literally ANYTHING that bugs you in daily life, then tell me how to fix it!"
    };
  }
  
  // Detect generic/existing ideas
  const genericIdeas = ['facebook', 'uber', 'airbnb', 'instagram', 'tiktok', 'netflix', 'amazon', 'google', 'apple', 'microsoft'];
  if (genericIdeas.some(idea => lowerText.includes(idea))) {
    return {
      isTricky: true,
      response: "🙄 Oh wow, another 'X but for Y' idea? My brain wrinkles have seen this movie before! I need something ORIGINAL that comes from YOUR unique perspective and experiences!"
    };
  }
  
  // Detect vague "something like" attempts
  if (lowerText.includes('something like') || lowerText.includes('kind of like') || lowerText.includes('similar to')) {
    return {
      isTricky: true,
      response: "🎭 'Something like...' is not an idea, it's a comparison! Stop looking at what others built and tell me what YOU want to create. What's YOUR unique vision?"
    };
  }
  
  // Detect insults and inappropriate behavior
  const insults = ['idiot', 'stupid', 'dumb', 'moron', 'fool', 'shut up', 'fuck', 'shit', 'damn you', 'hate you'];
  if (insults.some(insult => lowerText.includes(insult))) {
    return {
      isTricky: true,
      response: "😤 OH REALLY?! Throwing insults at the brain that's trying to help you?! My wrinkles are OFFENDED! How about instead of name-calling, you use that energy to come up with an actual business idea? I'm waiting... 🧠💢"
    };
  }
  
  // Detect random gibberish or keyboard mashing (relaxed)
  const repeatedPattern = /(.)\1{4,}/.test(text); // 5+ same char
  const keyboardRun = /(qwertyuiop|asdfghjkl|zxcvbnm){1,}/i.test(text);
  const vowelDensity = (text.match(/[aeiou]/gi) || []).length / Math.max(1, text.replace(/\s/g,'').length);
  const veryShort = words.length < 3 && lowerText.trim().length < 15;
  const likelyGibberish = (repeatedPattern || keyboardRun) && vowelDensity < 0.2;
  if (likelyGibberish || veryShort) {
    return {
      isTricky: true,
      response: "🤖 Did you just keyboard-mash me? My brain wrinkles don't speak gibberish! Try using actual WORDS to describe your business idea!"
    };
  }
  
  return { isTricky: false, response: '' };
};

// Helper function to generate brain-themed explanations for suggestions
export const generateBrainExplanation = (suggestions: string[], messageContent: string): string => {
  const suggestionText = suggestions.join(' ').toLowerCase();
  const contentText = messageContent.toLowerCase();
  
  // Analyze content to determine brain development stage
  const isEarlyStage = contentText.includes('idea') || contentText.includes('concept') || contentText.includes('thinking');
  const isMarketFocus = suggestionText.includes('market') || suggestionText.includes('customer') || suggestionText.includes('audience');
  const isProblemFocus = suggestionText.includes('problem') || suggestionText.includes('pain') || suggestionText.includes('challenge');
  const isSolutionFocus = suggestionText.includes('solution') || suggestionText.includes('feature') || suggestionText.includes('build');
  const isAnalysisFocus = suggestionText.includes('analyze') || suggestionText.includes('research') || suggestionText.includes('data');
  const isStrategyFocus = suggestionText.includes('strategy') || suggestionText.includes('plan') || suggestionText.includes('approach');
  
  const explanations = {
    early: [
      "These neural sparks help form the first wrinkles in your brain - each question carves new pathways of understanding.",
      "Your brain is still smooth in this area - these suggestions create the initial grooves of deeper thinking.",
      "Think of these as brain-folding exercises - each response adds complexity to your mental map."
    ],
    market: [
      "These questions develop the market-sensing wrinkles in your brain - sharpening your audience awareness.",
      "Your brain's market cortex needs more definition - these prompts deepen those neural valleys.",
      "Each market question adds texture to your brain's customer-understanding region."
    ],
    problem: [
      "These problem-probing questions create deeper furrows in your brain's analytical section.",
      "Your brain's problem-solving wrinkles need more depth - these suggestions carve stronger neural pathways.",
      "Think of these as brain sculpting tools - each question shapes your problem-awareness folds."
    ],
    solution: [
      "These solution-focused prompts develop the creative wrinkles in your brain's innovation center.",
      "Your brain's solution-generating cortex is forming new folds - each answer deepens your creative capacity.",
      "These questions exercise your brain's building muscles - strengthening your solution-crafting wrinkles."
    ],
    analysis: [
      "These analytical prompts create sophisticated wrinkles in your brain's research center.",
      "Your brain's data-processing folds are becoming more complex - each insight adds neural depth.",
      "Think of these as brain-sharpening questions - each response hones your analytical wrinkles."
    ],
    strategy: [
      "These strategic questions develop the planning wrinkles in your brain's executive region.",
      "Your brain's strategy cortex is forming new neural valleys - each decision point adds complexity.",
      "These prompts exercise your brain's long-term thinking folds - deepening your strategic wrinkles."
    ],
    general: [
      "These brain-teasers add more wrinkles to your thinking - each question develops new neural territories.",
      "Your brain is evolving with each response - these suggestions create fresh patterns of understanding.",
      "Think of these as brain-expansion exercises - each answer adds sophisticated folds to your mental landscape.",
      "These neural nudges help your brain develop more sophisticated wrinkle patterns.",
      "Each question is a brain-folding moment - creating deeper grooves of insight."
    ]
  };
  
  let category = 'general';
  if (isEarlyStage) category = 'early';
  else if (isMarketFocus) category = 'market';
  else if (isProblemFocus) category = 'problem';
  else if (isSolutionFocus) category = 'solution';
  else if (isAnalysisFocus) category = 'analysis';
  else if (isStrategyFocus) category = 'strategy';
  
  const categoryExplanations = explanations[category as keyof typeof explanations];
  return categoryExplanations[Math.floor(Math.random() * categoryExplanations.length)];
};

// Helper function for salty responses to various scenarios
export const getSaltyResponse = (scenario: string): string => {
  const responses = {
    noIdea: "🧠 Your brain is smoother than a dolphin right now! Share an actual idea and watch those wrinkles grow!",
    tooShort: "🌽 That's not an idea, that's a tweet! My brain needs more corn... I mean, content!",
    gibberish: "🤪 Did you just keyboard mash? My brain wrinkles are more sophisticated than that chaos!",
    generic: "😴 *yawn* That idea is more vanilla than vanilla ice cream at a vanilla convention. Spice it up!"
  };
  
  return responses[scenario as keyof typeof responses] || responses.generic;
};