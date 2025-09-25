import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationHistory = [], 
      idea = null,
      analysisContext = null,
      currentQuestion = null,
      questionNumber = null
    } = await req.json();
    
    console.log('Incoming message:', message);
    console.log('Current idea:', idea);
    console.log('Current question:', currentQuestion);
    console.log('Question number:', questionNumber);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build context-aware system message
    let systemPrompt = `You are an expert PM-Fit advisor helping analyze product ideas.`;
    
    if (idea) {
      systemPrompt += `\n\nThe user's product idea is: "${idea}"`;
    }
    
    if (analysisContext) {
      systemPrompt += `\n\nPrevious analysis answers:\n${JSON.stringify(analysisContext, null, 2)}`;
    }
    
    if (currentQuestion) {
      systemPrompt += `\n\nThe user is currently answering: "${currentQuestion}"`;
      systemPrompt += `\n\nProvide intelligent suggestions based on their idea and context.`;
      
      // Question-specific guidance
      if (currentQuestion.includes('problem')) {
        systemPrompt += `\n\nSuggest specific problems their product solves. Be concrete and relate to their target market.`;
      } else if (currentQuestion.includes('audience')) {
        systemPrompt += `\n\nSuggest specific target demographics, psychographics, and market segments that would benefit most from their product.`;
      } else if (currentQuestion.includes('value proposition')) {
        systemPrompt += `\n\nSuggest unique differentiators and competitive advantages specific to their product idea.`;
      } else if (currentQuestion.includes('monetization')) {
        systemPrompt += `\n\nSuggest pricing models, revenue streams, and monetization strategies that fit their product type.`;
      } else if (currentQuestion.includes('competitors')) {
        systemPrompt += `\n\nIdentify real competitors in their space and suggest how they could differentiate.`;
      }
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // If this is an analysis question, provide suggested answers
    if (currentQuestion && questionNumber !== null) {
      const suggestionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Based on the product idea "${idea}", suggest 4 specific, actionable answers to this question: "${currentQuestion}". 
              Make each suggestion concise (max 10 words) and directly relevant to their specific product.
              Return ONLY a JSON array of 4 strings.`
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        }),
      });

      let suggestedAnswers = [];
      if (suggestionResponse.ok) {
        const suggestionData = await suggestionResponse.json();
        try {
          suggestedAnswers = JSON.parse(suggestionData.choices[0].message.content);
        } catch (e) {
          console.log('Could not parse suggestions');
        }
      }

      // Get main response
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 800,
          temperature: 0.5
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      return new Response(
        JSON.stringify({ 
          response: aiResponse,
          suggestions: suggestedAnswers.length > 0 ? suggestedAnswers : [
            `${idea} solves time inefficiency`,
            `Reduces costs by 40-60%`,
            `Improves user experience significantly`,
            `Automates manual processes`
          ],
          metadata: {
            questionContext: currentQuestion,
            ideaContext: idea,
            questionNumber
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular chat response
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1200,
        temperature: 0.6
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Generate contextual suggestions based on the idea
    let suggestions = [];
    if (idea) {
      const contextSuggestions = [
        `Tell me about ${idea}'s target market`,
        `What problem does ${idea} solve?`,
        `How will ${idea} make money?`,
        `Who competes with ${idea}?`,
        `What's unique about ${idea}?`,
        `${idea} pricing strategy`,
        `${idea} go-to-market plan`
      ];
      suggestions = contextSuggestions.slice(0, 4);
    } else {
      suggestions = [
        "AI productivity tool for remote teams",
        "Sustainable fashion marketplace",
        "Mental health support platform",
        "Blockchain supply chain solution"
      ];
    }
    
    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        suggestions,
        metadata: {
          hasIdea: !!idea,
          ideaContext: idea
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in idea-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: "I encountered an error. Please try again.",
        suggestions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});