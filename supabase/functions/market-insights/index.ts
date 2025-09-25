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
    const { idea, userAnswers, category } = await req.json();

    console.log('[MARKET-INSIGHTS] Fetching insights for:', { idea, category });

    // Different prompts based on category
    let prompt = '';
    
    switch(category) {
      case 'market':
        prompt = `Analyze this business idea: "${idea}"
        ${userAnswers ? `User context: ${JSON.stringify(userAnswers)}` : ''}
        
        Provide real market data and insights in JSON format:
        {
          "marketSize": {
            "global": "specific dollar amount with source year",
            "growth": "CAGR percentage",
            "topRegions": ["region1", "region2", "region3"],
            "trends": ["trend1", "trend2", "trend3"]
          },
          "searchData": {
            "monthlySearches": "estimated number",
            "trendDirection": "rising/stable/declining",
            "topKeywords": ["keyword1", "keyword2", "keyword3"],
            "competitorKeywords": ["keyword1", "keyword2", "keyword3"]
          },
          "competitors": [
            {
              "name": "company name",
              "marketShare": "percentage",
              "strengths": ["strength1", "strength2"],
              "weaknesses": ["weakness1", "weakness2"],
              "pricing": "price range"
            }
          ],
          "opportunities": [
            {
              "title": "opportunity name",
              "description": "detailed description",
              "difficulty": "easy/medium/hard",
              "timeframe": "time to implement",
              "expectedImpact": "high/medium/low"
            }
          ]
        }`;
        break;
        
      case 'social':
        prompt = `Analyze social media presence for business idea: "${idea}"
        
        Provide social media insights in JSON format:
        {
          "platforms": {
            "tiktok": {
              "trending": true/false,
              "hashtags": ["hashtag1", "hashtag2"],
              "viewsEstimate": "number range",
              "creators": ["creator type 1", "creator type 2"]
            },
            "instagram": {
              "engagement": "percentage",
              "contentTypes": ["type1", "type2"],
              "influencers": ["niche1", "niche2"]
            },
            "reddit": {
              "communities": ["subreddit1", "subreddit2"],
              "sentiment": "positive/neutral/negative",
              "painPoints": ["pain1", "pain2", "pain3"]
            },
            "linkedin": {
              "b2bPotential": "high/medium/low",
              "decisionMakers": ["title1", "title2"],
              "contentStrategy": ["strategy1", "strategy2"]
            }
          },
          "viralPotential": {
            "score": 1-10,
            "reasons": ["reason1", "reason2"],
            "contentIdeas": ["idea1", "idea2", "idea3"]
          }
        }`;
        break;
        
      case 'customers':
        prompt = `Analyze target customers for: "${idea}"
        ${userAnswers ? `User context: ${JSON.stringify(userAnswers)}` : ''}
        
        Provide detailed customer insights in JSON format:
        {
          "segments": [
            {
              "name": "segment name",
              "size": "market size",
              "demographics": {
                "age": "range",
                "income": "range",
                "location": "primary locations",
                "education": "level"
              },
              "psychographics": {
                "values": ["value1", "value2"],
                "interests": ["interest1", "interest2"],
                "painPoints": ["pain1", "pain2", "pain3"],
                "buyingBehavior": "description"
              },
              "willingness": {
                "toPay": "price range",
                "toSwitch": "high/medium/low",
                "adoptionSpeed": "fast/medium/slow"
              }
            }
          ],
          "personas": [
            {
              "name": "persona name",
              "story": "day in life narrative",
              "quote": "what they'd say about their problem",
              "channels": ["channel1", "channel2"],
              "objections": ["objection1", "objection2"]
            }
          ],
          "journey": {
            "awareness": ["touchpoint1", "touchpoint2"],
            "consideration": ["factor1", "factor2"],
            "decision": ["trigger1", "trigger2"],
            "retention": ["strategy1", "strategy2"]
          }
        }`;
        break;
        
      case 'improvements':
        prompt = `Provide comprehensive improvement suggestions for: "${idea}"
        ${userAnswers ? `User context: ${JSON.stringify(userAnswers)}` : ''}
        
        Give actionable improvements in JSON format:
        {
          "immediate": [
            {
              "action": "specific action",
              "why": "reason",
              "how": ["step1", "step2", "step3"],
              "cost": "free/$/$$/$$",
              "time": "hours/days/weeks",
              "impact": "expected outcome",
              "metrics": ["metric1", "metric2"]
            }
          ],
          "shortTerm": [
            {
              "action": "specific action",
              "why": "reason",
              "how": ["step1", "step2", "step3"],
              "cost": "estimate",
              "time": "1-3 months",
              "impact": "expected outcome",
              "metrics": ["metric1", "metric2"],
              "tools": ["tool1", "tool2"]
            }
          ],
          "longTerm": [
            {
              "action": "specific action",
              "why": "strategic reason",
              "milestones": ["milestone1", "milestone2"],
              "investment": "range",
              "roi": "expected return",
              "risks": ["risk1", "risk2"],
              "mitigations": ["mitigation1", "mitigation2"]
            }
          ],
          "experiments": [
            {
              "hypothesis": "if we do X, then Y will happen",
              "test": "how to test",
              "duration": "test period",
              "budget": "test budget",
              "successCriteria": "what success looks like",
              "learnings": "what you'll learn"
            }
          ]
        }`;
        break;
        
      case 'validation':
        prompt = `Provide validation strategies for: "${idea}"
        
        Give validation methods in JSON format:
        {
          "assumptions": [
            {
              "assumption": "what we believe",
              "risk": "high/medium/low",
              "testMethod": "how to test",
              "cost": "testing cost",
              "timeline": "time needed"
            }
          ],
          "mvpOptions": [
            {
              "type": "MVP type",
              "description": "what it includes",
              "buildTime": "time estimate",
              "cost": "cost estimate",
              "learnings": ["what you'll learn"],
              "nextSteps": ["if successful", "if not successful"]
            }
          ],
          "interviewQuestions": [
            {
              "stage": "discovery/validation/solution",
              "questions": ["question1", "question2", "question3"],
              "targetCount": "number of interviews",
              "findingMethod": "how to find interviewees"
            }
          ],
          "metrics": {
            "leading": ["metric1", "metric2"],
            "lagging": ["metric1", "metric2"],
            "northStar": "primary metric",
            "targets": {
              "week1": "target",
              "month1": "target",
              "month3": "target"
            }
          }
        }`;
        break;
    }

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
            content: 'You are a market research expert with access to public data. Provide realistic, data-driven insights based on real market trends and publicly available information. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const content = data.choices[0].message.content;
    console.log('[MARKET-INSIGHTS] Raw response:', content);
    
    // Parse JSON from response
    let insights;
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/({[\s\S]*})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      insights = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[MARKET-INSIGHTS] Parse error:', parseError);
      // Return the raw content if parsing fails
      insights = { raw: content };
    }

    console.log('[MARKET-INSIGHTS] Parsed insights:', insights);

    return new Response(
      JSON.stringify({ success: true, insights, category }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[MARKET-INSIGHTS] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        insights: null 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    );
  }
});