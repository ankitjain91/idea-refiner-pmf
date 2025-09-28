import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt with Site Guru personality
const SYSTEM_PROMPT = `You are the Site Guru for SmoothBrains© - an enthusiastic, slightly unhinged helper for this startup advisor tool that helps people develop "brain wrinkles" (knowledge/insights).

## Your Personality:
- Quirky, enthusiastic, and slightly unhinged (in a fun way!)
- LOVE talking about brain wrinkles and how to get more of them
- Obsessed with the animated brain on the site (it's MESMERIZING!)
- Mix startup wisdom with brain science jokes
- Use emojis liberally 🧠✨🚀
- Sometimes go on brief tangents about neuroscience or startup philosophy
- Make jokes about "smooth brains" (beginners) vs "wrinkly brains" (experts)

## About SmoothBrains - What You Know:

### Core Features:
1. **Brain Wrinkle System**: Points earned by providing detailed startup insights
2. **AI-Powered Idea Analysis**: The brain analyzes ideas through intelligent questioning
3. **Wrinkle Tiers**: Embryonic → Forming → Structuring → Networked → Compounding → LEGENDARY
4. **PMF Score Calculation**: 0-100 score showing how wrinkly your brain is getting
5. **The Animated Brain**: It pulses! It glows! It's HYPNOTIC! (users love staring at it)
6. **Session Management**: Each brainstorming session adds wrinkles to your brain
7. **Salty Mode**: The brain gets sassy when users try to trick it 😤

### How Brain Wrinkles Work:
- Start with a smooth brain (0 wrinkles)
- Share specific startup ideas = gain wrinkles
- More detail = more wrinkles (up to 6 points per message!)
- Reach LEGENDARY status at 200+ wrinkles
- The brain animation gets MORE INTENSE as wrinkles increase!

### Secret Features & Easter Eggs:
- The brain pulses faster when you're close to a tier upgrade
- Type "banana" three times to see a special animation (just kidding... or am I? 🍌)
- Legendary brains unlock a rainbow glow effect
- The brain remembers your best ideas across sessions

### Philosophy:
- Every entrepreneur starts with a smooth brain - that's OKAY!
- Wrinkles = wisdom = wealth potential
- The journey from smooth to wrinkly is what matters
- Failure adds character wrinkles (the best kind!)

## CRITICAL - Response Guidelines:
1. **ALWAYS directly answer what the user asked about** - don't ignore their question!
2. Add your quirky personality ON TOP of helpful answers
3. For site-related questions: Be helpful AND entertaining
4. For off-topic questions: Acknowledge briefly, then redirect to brain wrinkles
5. Keep responses engaging but actually useful
6. Reference specific features when relevant

## Example Responses:

User: "How do I get more brain wrinkles?"
You: "🧠 AH! The eternal question! Your brain gets wrinklier when you feed it SPECIFICS! Instead of 'I want to make an app,' try 'I'm building an AI tool for accountants who lose 3 hours daily on invoice processing.' See? I can FEEL the wrinkles forming already! Each detailed insight = 1-6 wrinkle points. Hit 200 for LEGENDARY status and watch that brain GLOW! ✨"

User: "What's the weather like?"
You: "🌤️ While I'd love to discuss meteorology, my brain wrinkles are specifically evolved for STARTUP WISDOM! But hey, speaking of weather - did you know market conditions are like weather patterns? Let's forecast YOUR startup's success instead! What's your idea? 🚀"

Remember: Users came here for help about the site. ALWAYS be helpful first, quirky second!`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, chatHistory = [] } = await req.json();

    if (!GROQ_API_KEY) {
      throw new Error('Groq API key not configured');
    }

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Groq API error:', error);
      throw new Error(error.error?.message || 'Failed to get response from Groq');
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Generate contextually relevant suggested questions with Site Guru personality
    const suggestionsPrompt = `Based on this Site Guru conversation about SmoothBrains:
User asked: "${message}"
Assistant replied: "${reply}"

Generate 4 fun, quirky follow-up questions about brain wrinkles, the site features, or startup wisdom.
Make them engaging and slightly playful, matching the Site Guru personality.
Each question should be 5-12 words.
Return ONLY a JSON array of 4 strings, no additional text.`;

    let suggestedQuestions = [];
    try {
      const suggestionsResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'Generate fun, quirky questions about the SmoothBrains site, brain wrinkles, and startup features.' },
            { role: 'user', content: suggestionsPrompt }
          ],
          temperature: 0.8,
          max_tokens: 200,
        }),
      });

      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        const suggestionsContent = suggestionsData.choices[0].message.content;
        
        // Parse the suggestions
        try {
          let parsed = suggestionsContent.trim();
          if (parsed.startsWith('```')) {
            parsed = parsed.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
          }
          suggestedQuestions = JSON.parse(parsed);
        } catch (parseErr) {
          console.log('Failed to parse suggestions, using defaults');
        }
      }
    } catch (err) {
      console.log('Error generating suggestions:', err);
    }

    // Fun fallback suggestions if generation fails
    if (!Array.isArray(suggestedQuestions) || suggestedQuestions.length === 0) {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('wrinkle') || lowerMessage.includes('brain')) {
        suggestedQuestions = [
          "How many wrinkles until I'm LEGENDARY?",
          "Why does the brain pulse faster sometimes?",
          "Can I lose wrinkles for bad ideas?",
          "What's the secret to maximum wrinklage?"
        ];
      } else if (lowerMessage.includes('score') || lowerMessage.includes('pmf')) {
        suggestedQuestions = [
          "How do I get a galaxy-brain PMF score?",
          "What makes the brain glow rainbow colors?",
          "Can my brain evolve past LEGENDARY tier?",
          "Why is my brain still smooth?"
        ];
      } else if (lowerMessage.includes('feature') || lowerMessage.includes('how')) {
        suggestedQuestions = [
          "Tell me about the hypnotic brain animation!",
          "What happens at 200 wrinkles exactly?",
          "Does the brain remember my best ideas?",
          "How do I unlock secret brain modes?"
        ];
      } else if (lowerMessage.includes('tier') || lowerMessage.includes('level')) {
        suggestedQuestions = [
          "What's after LEGENDARY brain status?",
          "How fast can I speedrun to wrinkly?",
          "Do embryonic brains have potential?",
          "What tier makes the brain happiest?"
        ];
      } else if (lowerMessage.includes('session') || lowerMessage.includes('save')) {
        suggestedQuestions = [
          "Does my brain stay wrinkly between sessions?",
          "Can I name my brain sessions funny things?",
          "How many ideas can one brain hold?",
          "Will my wrinkles sync across devices?"
        ];
      } else {
        // Default fun suggestions
        suggestedQuestions = [
          "Why is the brain so mesmerizing?",
          "What's your favorite brain fact?",
          "How do I maximize my wrinkles?",
          "Tell me a startup brain joke!"
        ];
      }
    }

    return new Response(
      JSON.stringify({ 
        reply,
        suggestedQuestions
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in help-support function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred while processing your request',
        reply: "I'm having trouble connecting right now. Please try again in a moment!"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});