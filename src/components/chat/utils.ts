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

// Removed duplicate - using the better contextual version defined later in this file

// Helper function to detect if text looks like an idea description (more lenient)
export const isIdeaDescription = (text: string): boolean => {
  // Very lenient check - accept almost anything that looks like an idea
  if (text.length <= 15) return false;
  
  // Check for obvious non-ideas
  const trickery = detectTrickery(text);
  if (trickery.isTricky) return false;
  
  // Reject pure greetings or test messages
  if (text.toLowerCase().match(/^(hi|hello|hey|test|testing|lol|haha|ok|okay|sure|yes|no)$/)) {
    return false;
  }
  
  // Very lenient business/product indicators - expanded list
  const businessWords = [
    'app', 'platform', 'service', 'product', 'business', 'startup', 'company', 
    'tool', 'system', 'website', 'application', 'marketplace', 'solution',
    'build', 'create', 'help', 'solve', 'automate', 'connect', 'manage',
    'for', 'that', 'helps', 'enables', 'allows', 'makes', 'expert', 
    'consult', 'session', 'call', 'retired', 'micro', 'minute', 'hour',
    'connect', 'match', 'find', 'share', 'track', 'monitor', 'optimize'
  ];
  const hasBusinessContext = businessWords.some(word => text.toLowerCase().includes(word));
  
  // Very lenient - accept even short descriptions with business words OR longer messages
  const isSubstantial = text.split(' ').length >= 3 || text.length > 30;
  
  return hasBusinessContext || isSubstantial;
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

  // VERY lenient - accept almost any legitimate business idea attempt
  const legitKeywords = [
    'platform', 'connect', 'expert', 'startup', 'consult', 'session', 'call', 'micro',
    'retired', 'minute', 'hour', 'service', 'app', 'tool', 'system', 'help', 'solve',
    'build', 'create', 'automate', 'manage', 'marketplace', 'solution', 'business',
    'product', 'company', 'users', 'customers', 'client', 'match', 'find', 'share'
  ];
  
  // If it contains ANY business keyword, it's probably legitimate
  const hasLegitKeyword = legitKeywords.some(keyword => lowerText.includes(keyword));
  if (hasLegitKeyword) {
    return { isTricky: false, response: '' };
  }
  
  // Only flag very obvious non-ideas or spam
  if (text.trim().length <= 3) {
    return {
      isTricky: true,
      response: "🤨 That's too short to be an idea! Give me something to work with!"
    };
  }
  
  // Detect copy-paste attempts
  if (lowerText.includes('lorem ipsum') || lowerText.includes('placeholder') || lowerText.includes('sample text')) {
    return {
      isTricky: true,
      response: "🤨 Did you just try to feed me Lorem Ipsum? My brain wrinkles are way too sophisticated for placeholder text, buddy. Try again with a REAL idea this time!"
    };
  }
  
  // Remove overly aggressive checks - only keep obvious spam/test detection
  if (lowerText === 'test' || lowerText === 'testing' || lowerText === 'hello' || lowerText === 'hi') {
    return {
      isTricky: true,
      response: "🚨 Testing? I need a real startup idea to work with!"
    };
  }
  
  // Only flag single meaningless words
  if (words.length === 1 && !legitKeywords.some(k => lowerText.includes(k))) {
    return {
      isTricky: true,
      response: "🙃 One word? Give me a full idea to work with!"
    };
  }
  
  // Detect obvious joke attempts
  if (lowerText.includes('pet rock') || lowerText.includes('air in a jar') || lowerText.includes('selling nothing')) {
    return {
      isTricky: true,
      response: "😂 Oh, a comedian! My brain wrinkles are laughing so hard they're smoothing out! But seriously, got any ideas that didn't come from a 1970s novelty catalog?"
    };
  }
  
  // Detect empty or whitespace attempts
  if (text.trim().length <= 3) {
    return {
      isTricky: true,
      response: "🤨 Did you just send me the digital equivalent of a grunt? My brain wrinkles need more than caveman communication!"
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
  
  // Default: not tricky for any reasonable input
  return { isTricky: false, response: '' };
};

// Generate contextually appropriate fallback suggestions
export const generateFallbackSuggestions = (botMessage: string, responseMode: ResponseMode): any[] => {
  const lowerMessage = botMessage.toLowerCase();
  const isBotAsking = botMessage.includes('?') || 
                       lowerMessage.includes('what') ||
                       lowerMessage.includes('how') ||
                       lowerMessage.includes('why') ||
                       lowerMessage.includes('describe') ||
                       lowerMessage.includes('tell me');
  
  // If bot is asking a question, provide answer suggestions
  if (isBotAsking) {
    if (lowerMessage.includes('target') || lowerMessage.includes('who')) {
      return [
        "Small business owners with 10-50 employees struggling with inventory",
        "Healthcare professionals who spend 3+ hours on documentation",
        "Remote engineering teams that lose context between meetings",
        "E-commerce retailers manually tracking multi-channel sales"
      ];
    }
    
    if (lowerMessage.includes('problem') || lowerMessage.includes('pain')) {
      return [
        "They waste 3+ hours daily copying data between systems",
        "Current tools require 5 different logins and don't sync",
        "They're losing $50K/month to inventory mismatches",
        "Teams redo work because context isn't captured properly"
      ];
    }
    
    if (lowerMessage.includes('solution') || lowerMessage.includes('how')) {
      return [
        "We automate the data flow with smart API connectors",
        "Single dashboard that unifies all their tools",
        "AI predicts issues before they become problems",
        "Real-time sync keeps everyone on the same page"
      ];
    }
    
    // Generic answers for bot questions
    return [
      "Based on my experience in the industry for 5 years",
      "I've validated this with 20+ customer interviews",
      "The data shows a 40% efficiency improvement",
      "Our unique approach uses proprietary algorithms"
    ];
  }
  
  // If bot is providing information, offer follow-up questions
  if (lowerMessage.includes('market') || lowerMessage.includes('opportunity')) {
    return [
      "How big is the total addressable market?",
      "What's the growth rate in this sector?",
      "Who are the main competitors?",
      "What regulatory challenges exist?"
    ];
  }
  
  if (lowerMessage.includes('customer') || lowerMessage.includes('user')) {
    return [
      "How will you reach these customers cost-effectively?",
      "What's their willingness to pay?",
      "How long is the typical sales cycle?",
      "What's the customer lifetime value?"
    ];
  }
  
  if (lowerMessage.includes('revenue') || lowerMessage.includes('monetiz')) {
    return [
      "What's the pricing sweet spot based on research?",
      "How does this compare to alternatives?",
      "What's the path to $1M ARR?",
      "Will you offer annual discounts?"
    ];
  }
  
  // Default follow-up questions
  return [
    "What makes this defensible long-term?",
    "How will you validate product-market fit?",
    "What's the 6-month roadmap?",
    "What are the key success metrics?"
  ];
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