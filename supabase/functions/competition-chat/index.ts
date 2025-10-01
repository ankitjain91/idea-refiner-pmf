import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, competitionData, idea, chatHistory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Competition chat request:', { message, idea, hasCompetitionData: !!competitionData });

    // Build context from competition data
    let contextSummary = `Current business idea: "${idea}"\n\n`;
    
    if (competitionData) {
      contextSummary += `Competition Analysis Context:\n`;
      contextSummary += `- Total Competitors Analyzed: ${competitionData.competitors?.length || 0}\n`;
      contextSummary += `- Market Concentration: ${competitionData.marketConcentration || 'Unknown'}\n`;
      contextSummary += `- Entry Barriers: ${competitionData.entryBarriers || 'Unknown'}\n`;
      contextSummary += `- Direct Competitors: ${competitionData.competitiveLandscape?.directCompetitors || 0}\n`;
      contextSummary += `- Indirect Competitors: ${competitionData.competitiveLandscape?.indirectCompetitors || 0}\n`;
      contextSummary += `- Threat Level: ${competitionData.analysis?.threat || 'Unknown'}\n\n`;
      
      if (competitionData.competitors && competitionData.competitors.length > 0) {
        contextSummary += `Key Competitors:\n`;
        competitionData.competitors.forEach((comp: any, idx: number) => {
          contextSummary += `${idx + 1}. ${comp.name} (${comp.marketShare} market share, ${comp.strength} strength)\n`;
          contextSummary += `   Strengths: ${comp.strengths.join(', ')}\n`;
          contextSummary += `   Weaknesses: ${comp.weaknesses.join(', ')}\n`;
          contextSummary += `   Funding: ${comp.funding}, Founded: ${comp.founded}\n\n`;
        });
      }
      
      if (competitionData.differentiationOpportunities) {
        contextSummary += `Differentiation Opportunities:\n`;
        competitionData.differentiationOpportunities.forEach((opp: string) => {
          contextSummary += `- ${opp}\n`;
        });
        contextSummary += '\n';
      }
      
      if (competitionData.analysis?.opportunities) {
        contextSummary += `Market Opportunities:\n`;
        competitionData.analysis.opportunities.forEach((opp: string) => {
          contextSummary += `- ${opp}\n`;
        });
        contextSummary += '\n';
      }
      
      if (competitionData.analysis?.recommendations) {
        contextSummary += `Strategic Recommendations:\n`;
        competitionData.analysis.recommendations.forEach((rec: string) => {
          contextSummary += `- ${rec}\n`;
        });
      }
    }

    // Build conversation history
    const messages = [
      {
        role: 'system',
        content: `You are a strategic competition analyst helping entrepreneurs understand their competitive landscape and develop winning strategies. You have access to detailed competition data for the user's business idea.

${contextSummary}

Provide actionable, strategic insights based on the competition data. Be specific and reference actual competitors and data points when relevant. Focus on practical advice that can help the user succeed in this competitive environment.

Keep responses concise but insightful. Use markdown formatting for better readability.`
      }
    ];

    // Add chat history
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach((msg: any) => {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('Calling Lovable AI with messages:', messages.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add more credits to continue.');
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

    console.log('Competition chat response generated successfully');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Competition chat error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});