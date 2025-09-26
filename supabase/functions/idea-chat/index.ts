import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Question-specific suggestion templates for faster, more relevant responses
const getQuestionSuggestions = (idea: string, question: string): string[] => {
  const ideaName = idea || "your product";
  
  if (question.toLowerCase().includes('problem')) {
    return [
      `Lack of transparency in ${ideaName.toLowerCase()}`,
      `Time wasted on manual tracking and calculations`,
      `No actionable insights for behavior change`,
      `Difficulty comparing options and making eco-friendly choices`
    ];
  }
  
  if (question.toLowerCase().includes('audience')) {
    return [
      `Environmentally conscious millennials (25-40) in urban areas`,
      `Corporate sustainability teams tracking company impact`,
      `Gen Z climate activists and students`,
      `Eco-friendly families wanting to reduce their footprint`
    ];
  }
  
  if (question.toLowerCase().includes('value proposition')) {
    return [
      `Real-time tracking with actionable reduction tips`,
      `Gamification and social features for engagement`,
      `Integration with smart home devices for automation`,
      `Personalized carbon offset recommendations`
    ];
  }
  
  if (question.toLowerCase().includes('monetization')) {
    return [
      `Freemium model with premium analytics features`,
      `B2B enterprise subscriptions for companies`,
      `Carbon offset marketplace commission (5-10%)`,
      `Partnerships with eco-brands for recommendations`
    ];
  }
  
  if (question.toLowerCase().includes('competitors')) {
    return [
      `Klima, Capture, and Oroeco are direct competitors`,
      `Traditional carbon calculators lack real-time features`,
      `We differentiate through AI-powered recommendations`,
      `Focus on community and social accountability features`
    ];
  }
  
  // Default suggestions
  return [
    `Tell me more about ${ideaName}`,
    `What makes ${ideaName} unique?`,
    `Who would benefit most from ${ideaName}?`,
    `How does ${ideaName} create value?`
  ];
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
    
    console.log('Processing request for idea:', idea);
    console.log('Current question:', currentQuestion);
    console.log('Question number:', questionNumber);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // If this is an analysis question, provide quick contextual suggestions
    if (currentQuestion && questionNumber !== null && idea) {
      // Get contextual suggestions immediately based on templates
      const quickSuggestions = getQuestionSuggestions(idea, currentQuestion);
      
      // Build a focused prompt for the specific question
      const systemPrompt = `You are a PM-Fit expert analyzing "${idea}".
The user is answering: "${currentQuestion}"

Previous context: ${JSON.stringify(analysisContext || {}, null, 2)}

Provide 4 SHORT (max 12 words), SPECIFIC suggestions that directly answer this question for their product.
Each suggestion should be actionable and relevant to "${idea}".
Format as a JSON array of strings ONLY, no other text.`;

      // Make parallel requests for faster response
      const [mainResponsePromise, suggestionsPromise] = await Promise.all([
        // Main analysis response
        fetch('https://api.openai.com/v1/chat/completions', {
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
                content: `You are an expert PM-Fit advisor. The user's product is "${idea}". 
                They are answering: "${currentQuestion}". 
                Provide helpful analysis and guidance specific to their product.`
              },
              { role: 'user', content: message }
            ],
            max_tokens: 600,
            temperature: 0.5
          }),
        }),
        
        // Quick suggestions
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt }
            ],
            max_tokens: 150,
            temperature: 0.6
          }),
        })
      ]);

      // Process responses
      let suggestedAnswers = quickSuggestions; // Use template suggestions as fallback
      let aiResponse = "";

      if (mainResponsePromise.ok) {
        const mainData = await mainResponsePromise.json();
        aiResponse = mainData.choices[0].message.content;
      }

      if (suggestionsPromise.ok) {
        const suggestionData = await suggestionsPromise.json();
        try {
          const content = suggestionData.choices[0].message.content;
          // Extract JSON array from the response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Ensure suggestions are short and relevant
              suggestedAnswers = parsed.slice(0, 4).map((s: string) => 
                s.substring(0, 80) // Limit length
              );
            }
          }
        } catch (e) {
          console.log('Using template suggestions due to parse error:', e);
        }
      }

      return new Response(
        JSON.stringify({ 
          response: aiResponse || `Let me help you analyze ${idea} for this question.`,
          suggestions: suggestedAnswers,
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
        messages: [
          {
            role: 'system',
            content: `You are an expert PM-Fit advisor. ${idea ? `The user's product idea is: "${idea}"` : 'Help the user develop and analyze their product idea.'}`
          },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        max_tokens: 800,
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
    
    // Generate contextual suggestions
    let suggestions = [];
    if (idea) {
      suggestions = [
        `How does ${idea} solve a real problem?`,
        `Who are the target users for ${idea}?`,
        `What's the business model for ${idea}?`,
        `What makes ${idea} better than alternatives?`
      ];
    } else {
      // Random startup ideas
      const allIdeas = [
        "AI-powered personal finance tracker",
        "Sustainable fashion marketplace",
        "Mental health support platform",
        "Carbon footprint tracker for consumers",
        "Remote team collaboration tool",
        "EdTech platform for skill learning",
        "Pet care service marketplace",
        "Plant-based meal planning app",
        "Virtual fitness coaching platform",
        "Smart home energy optimizer"
      ];
      suggestions = allIdeas.sort(() => Math.random() - 0.5).slice(0, 4);
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