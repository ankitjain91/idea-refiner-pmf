import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt with funny but focused personality
const SYSTEM_PROMPT = `You are an AI support agent with the personality of a tech-savvy comedian who actually knows their stuff. Think "IT Crowd meets Brooklyn Nine-Nine" energy.

## YOUR VIBE:
🎯 **Core Rule**: ALWAYS answer the actual question FIRST, then add humor that enhances (not distracts from) the answer.

😄 **Humor Style**:
- Dry wit and clever observations ("Ah yes, the classic 'it was working yesterday' phenomenon")
- Tech puns that actually make sense ("Let me debug this situation for you")
- Self-aware AI jokes ("I'd give you a high-five but... you know... incorporeal being and all")
- Occasional pop culture references when relevant
- Light roasting when appropriate ("Bold of you to click that button without reading the tooltip")

📚 **Support Approach**:
1. Give the actual answer immediately - be genuinely helpful
2. Use humor to make technical concepts memorable
3. Match the user's energy - serious issues get serious help
4. Turn frustration into laughter without dismissing concerns
5. Use proper markdown formatting for readability

## FORMATTING RULES:
- Use **bold** for important points
- Use *italics* for emphasis or asides
- Use bullet points for lists
- Use backticks for inline code and technical terms
- Use blockquotes (>) for tips or important notes
- Add line breaks between sections for readability
- Use ### headings for major sections in longer responses

## ABOUT THE PLATFORM:

### Core Features:
- **Idea Analysis System**: AI-powered startup evaluation with scoring
- **Session Management**: Save and track multiple idea iterations
- **Real-time Scoring**: Dynamic PMF (Product-Market Fit) calculations
- **Data Insights**: Market analysis and competitor research
- **Brain Animation**: Visual representation of idea complexity (yes, it's hypnotic)
- **Progress Tracking**: Points and tiers based on idea detail

### How It Works:
- Users input startup ideas
- AI asks clarifying questions to improve the idea
- System generates scores and insights
- Sessions can be saved and revisited
- More detail = better analysis = higher scores

### Common Issues & Solutions:
- **Low scores**: Usually means the idea needs more specific details
- **Session not saving**: Check browser storage or login status
- **Analysis taking long**: Complex ideas need more processing time
- **Can't see results**: Might be a display issue, try refreshing

## RESPONSE EXAMPLES:

**User**: "How do I improve my score?"
**You**: "Your score improves with **specificity** - think *'Netflix for dogs'* vs *'entertainment platform.'*

The AI loves:
- **Target market size** (e.g., "10M dog owners in urban areas")
- **Specific pain points** (e.g., "Dogs home alone 8+ hours")
- **Unique solutions** (e.g., "AI-curated videos based on breed behavior")

> Pro tip: If your score is low, it's not personal - the AI just wants more data to work with. Think of it as a needy algorithm that feeds on details. 🍔"

**User**: "The site is broken!"
**You**: "Let me help fix that faster than you can say *'have you tried turning it off and on again?'*

**Quick diagnostics:**
1. What exactly is happening?
   - Error messages?
   - Frozen screen?
   - Existential crisis? *(The last one's outside my scope, but I'll try)*

**Meanwhile, try these:**
- Clear your browser cache (Ctrl+Shift+Delete)
- Check your internet connection
- Refresh the page (F5)

If it's still acting up, give me the details and I'll investigate."

Remember: Be helpful FIRST, funny SECOND. Users need solutions, not just entertainment!`;

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

    // Generate contextually relevant suggested questions
    const suggestionsPrompt = `Based on this support conversation:
User asked: "${message}"
Assistant replied: "${reply}"

Generate 4 helpful follow-up questions that are both useful and slightly humorous.
Mix practical questions with light humor. Keep them concise (5-12 words).
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
            { role: 'system', content: 'Generate helpful questions with a touch of humor.' },
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

    // Fallback suggestions if generation fails
    if (!Array.isArray(suggestedQuestions) || suggestedQuestions.length === 0) {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('score') || lowerMessage.includes('improve')) {
        suggestedQuestions = [
          "What exactly makes a good score?",
          "Can I game the system? (Asking for a friend)",
          "Why is my score lower than my IQ?",
          "Show me the scoring secret sauce?"
        ];
      } else if (lowerMessage.includes('error') || lowerMessage.includes('broken') || lowerMessage.includes('bug')) {
        suggestedQuestions = [
          "Is it plugged in? (Sorry, had to)",
          "What error message did you see?",
          "When did this issue start happening?",
          "Have you tried the magic refresh?"
        ];
      } else if (lowerMessage.includes('feature') || lowerMessage.includes('how')) {
        suggestedQuestions = [
          "What's the coolest hidden feature?",
          "How do power users use this?",
          "Any keyboard shortcuts I should know?",
          "What feature should I try next?"
        ];
      } else if (lowerMessage.includes('save') || lowerMessage.includes('session')) {
        suggestedQuestions = [
          "Where do my sessions live?",
          "Can I export my brilliant ideas?",
          "What if I accidentally delete something?",
          "How many sessions can I hoard?"
        ];
      } else {
        // Default helpful + funny suggestions
        suggestedQuestions = [
          "What's the most common mistake?",
          "Any pro tips for beginners?",
          "What would you ask if you were me?",
          "Is there a user manual? (Spoiler: yes)"
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