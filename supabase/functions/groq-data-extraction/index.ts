import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds between retries

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tileType, requirements, dataPoints, responses } = await req.json();
    
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    if (!GROQ_API_KEY) {
      // Fallback to pattern matching if no Groq API key
      console.log('No GROQ_API_KEY, using pattern matching');
      const extraction = extractWithPatterns(responses, dataPoints);
      
      return new Response(
        JSON.stringify({
          extraction,
          confidence: 0.5,
          method: 'pattern_matching'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Prepare data for Groq
    const combinedData = responses.map((r: any) => ({
      source: r.source,
      summary: JSON.stringify(r.data).substring(0, 2000) // Limit size
    }));
    
    const prompt = `
      You are a data extraction specialist. Extract relevant information for "${tileType}" from the following data sources.
      
      Requirements:
      ${requirements}
      
      Data Points Needed:
      ${dataPoints.join(', ')}
      
      Available Data:
      ${JSON.stringify(combinedData, null, 2)}
      
      CRITICAL FORMATTING RULES:
      1. All monetary values must be human-readable (e.g., "$10.5B", "$500M", "$25K")
      2. All percentages must be realistic and formatted (e.g., "15%", "8.5%")
      3. Growth rates should be annual and reasonable (1-100% range typically)
      4. Never use scientific notation or excessive decimal places
      5. Round all numbers to at most 2 decimal places
      6. For projections, use reasonable yearly growth (not exponential)
      7. When extracting market size, ensure values are realistic (not trillions for niche markets)
      8. Always validate extracted numbers are within reasonable business ranges
      
      Return a JSON object with the extracted information. Include a confidence score (0-1) for each extracted point.
      Focus on finding ANY relevant data, even if it's mentioned indirectly.
      
      Format:
      {
        "extraction": {
          // extracted data matching requirements with human-readable formatting
        },
        "confidence": 0.7,
        "sources_used": ["source1", "source2"]
      }
    `;
    
    console.log('Making Groq API request for tile:', tileType);
    
    // Call Groq API with retry logic for rate limiting
    async function callGroqWithRetry(body: any, retries = 0): Promise<Response> {
      try {
        // Add delay between retries
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
        }
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        // Handle rate limiting
        if (response.status === 429) {
          console.log(`Rate limited, retry ${retries + 1}/${MAX_RETRIES}`);
          if (retries < MAX_RETRIES) {
            const retryAfter = response.headers.get('retry-after');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * (retries + 1);
            console.log(`Waiting ${delay}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGroqWithRetry(body, retries + 1);
          }
          throw new Error('Rate limit exceeded after maximum retries');
        }
        
        // Handle server errors with retry
        if (response.status >= 500 && retries < MAX_RETRIES) {
          console.log(`Server error ${response.status}, retry ${retries + 1}/${MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
          return callGroqWithRetry(body, retries + 1);
        }
        
        return response;
      } catch (error) {
        if (retries < MAX_RETRIES) {
          console.log(`Network error, retry ${retries + 1}/${MAX_RETRIES}: ${error}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
          return callGroqWithRetry(body, retries + 1);
        }
        throw error;
      }
    }
    
    const response = await callGroqWithRetry({
        model: 'llama-3.1-8b-instant', // Updated to a currently supported Groq model
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction expert. Extract and synthesize information from multiple sources. Return valid JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
        // Removed response_format as it may not be supported
        response_format: { type: "json_object" }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error response:', errorText);

      // Graceful fallback on rate limiting
      if (response.status === 429) {
        console.warn('[groq-data-extraction] Rate limited by Groq. Falling back to pattern-based extraction.');
        const extraction = extractWithPatterns(responses, dataPoints);
        return new Response(
          JSON.stringify({
            extraction,
            confidence: 0.4,
            method: 'rate_limit_fallback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    // Try to parse the response content as JSON
    let extracted;
    try {
      let content = result.choices[0].message.content;
      
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (content.includes('```')) {
        content = content.replace(/```\s*/g, '');
      }
      
      // Fix escaped quotes in nested JSON strings
      content = content.replace(/\\\\\\"/g, '"');
      
      // Trim whitespace
      content = content.trim();
      
      extracted = JSON.parse(content);
      
      // If extraction contains nested extraction field, unwrap it
      if (extracted.extraction) {
        console.log('[groq-data-extraction] Unwrapping nested extraction field');
        extracted = extracted.extraction;
      }
    } catch (e) {
      console.log('Failed to parse as JSON, using raw content');
      extracted = { raw: result.choices[0].message.content };
    }
    
    // Always return a consistent shape with extraction key
    return new Response(
      JSON.stringify({
        extraction: extracted,
        confidence: extracted.confidence ?? 0.7,
        sources_used: extracted.sources_used ?? [],
        method: 'groq_extraction'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in groq-data-extraction:', error);
    
    return new Response(
      JSON.stringify({
        extraction: null,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Pattern-based extraction fallback
function extractWithPatterns(responses: any[], dataPoints: string[]): any {
  const extracted: any = {};
  const combinedText = responses.map(r => JSON.stringify(r.data)).join(' ').toLowerCase();
  
  // Market size patterns
  if (dataPoints.includes('market_size')) {
    const billionMatch = combinedText.match(/(\d+\.?\d*)\s*billion/);
    const trillionMatch = combinedText.match(/(\d+\.?\d*)\s*trillion/);
    
    if (trillionMatch) {
      extracted.market_size = `$${trillionMatch[1]}T`;
    } else if (billionMatch) {
      extracted.market_size = `$${billionMatch[1]}B`;
    }
  }
  
  // Growth rate patterns
  if (dataPoints.includes('growth_rate')) {
    const cagrMatch = combinedText.match(/(\d+\.?\d*)%?\s*cagr/i);
    const growthMatch = combinedText.match(/grow(?:th|ing)?\s*(?:rate|by)?\s*(\d+\.?\d*)%/i);
    
    if (cagrMatch) {
      extracted.growth_rate = `${cagrMatch[1]}%`;
    } else if (growthMatch) {
      extracted.growth_rate = `${growthMatch[1]}%`;
    }
  }
  
  // Sentiment patterns
  if (dataPoints.includes('sentiment_score')) {
    const positiveCount = (combinedText.match(/positive|good|great|excellent|love/g) || []).length;
    const negativeCount = (combinedText.match(/negative|bad|poor|hate|terrible/g) || []).length;
    const total = positiveCount + negativeCount;
    
    if (total > 0) {
      extracted.sentiment_score = Math.round((positiveCount / total) * 100);
    }
  }
  
  // Competition patterns
  if (dataPoints.includes('competitors_list')) {
    const competitorPatterns = [
      /competitors?\s*(?:include|are|:)\s*([^.]+)/i,
      /(?:vs|versus|against)\s+([^.]+)/i,
      /alternatives?\s*(?:include|are|:)\s*([^.]+)/i
    ];
    
    for (const pattern of competitorPatterns) {
      const match = combinedText.match(pattern);
      if (match) {
        extracted.competitors_list = match[1]
          .split(/,|and/)
          .map(c => c.trim())
          .filter(c => c.length > 2 && c.length < 50);
        break;
      }
    }
  }
  
  // CAC/LTV patterns
  if (dataPoints.includes('cac')) {
    const cacMatch = combinedText.match(/cac\s*(?:is|of|:)?\s*\$?(\d+)/i);
    if (cacMatch) {
      extracted.cac = `$${cacMatch[1]}`;
    }
  }
  
  if (dataPoints.includes('ltv')) {
    const ltvMatch = combinedText.match(/ltv\s*(?:is|of|:)?\s*\$?(\d+)/i);
    if (ltvMatch) {
      extracted.ltv = `$${ltvMatch[1]}`;
    }
  }
  
  return extracted;
}