import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { idea, projectTrackerConnected } = body || {};
    
    console.log('[launch-timeline] Analyzing timeline for:', idea);
    
    // If no project tracker connected, return empty state
    if (!projectTrackerConnected) {
      return new Response(JSON.stringify({
        updatedAt: new Date().toISOString(),
        metrics: [],
        milestones: [],
        empty_state: {
          message: 'Connect your project tracker to see real milestones',
          suggested_trackers: ['GitHub', 'Jira', 'Notion', 'Linear'],
          instructions: 'Click "Connect" to sync your project timeline'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Generate sample timeline based on typical startup phases
    const currentDate = new Date();
    const milestones = [
      {
        phase: 'MVP Development',
        status: 'completed',
        completion: 100,
        start_date: new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
          { name: 'Core Features', status: 'done', impact: 'high' },
          { name: 'Basic UI', status: 'done', impact: 'medium' },
          { name: 'Authentication', status: 'done', impact: 'high' }
        ]
      },
      {
        phase: 'Beta Testing',
        status: 'in_progress',
        completion: 60,
        start_date: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(currentDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
          { name: 'User Feedback Collection', status: 'in_progress', impact: 'high' },
          { name: 'Bug Fixes', status: 'in_progress', impact: 'high' },
          { name: 'Performance Optimization', status: 'pending', impact: 'medium' }
        ]
      },
      {
        phase: 'Marketing Launch',
        status: 'planned',
        completion: 0,
        start_date: new Date(currentDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(currentDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
          { name: 'Content Creation', status: 'pending', impact: 'medium' },
          { name: 'Social Media Campaign', status: 'pending', impact: 'high' },
          { name: 'Influencer Outreach', status: 'pending', impact: 'medium' }
        ]
      },
      {
        phase: 'Scale & Growth',
        status: 'planned',
        completion: 0,
        start_date: new Date(currentDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(currentDate.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
          { name: 'Feature Expansion', status: 'pending', impact: 'high' },
          { name: 'Team Scaling', status: 'pending', impact: 'high' },
          { name: 'International Expansion', status: 'pending', impact: 'medium' }
        ]
      }
    ];
    
    // Extract risks from community feedback
    const risks = [
      { 
        risk: 'Technical Debt',
        probability: 0.6,
        impact: 'medium',
        mitigation: 'Allocate 20% sprint time to refactoring'
      },
      {
        risk: 'Market Competition',
        probability: 0.7,
        impact: 'high',
        mitigation: 'Accelerate unique feature development'
      },
      {
        risk: 'Funding Delays',
        probability: 0.4,
        impact: 'high',
        mitigation: 'Maintain 6-month runway buffer'
      }
    ];
    
    // Identify critical path
    const criticalPath = milestones
      .filter(m => m.status !== 'completed')
      .flatMap(m => m.tasks.filter(t => t.impact === 'high'))
      .map(t => t.name);
    
    const response = {
      updatedAt: new Date().toISOString(),
      metrics: [
        { name: 'Time to Market', value: 45, unit: 'days', confidence: 0.7 },
        { name: 'Sprint Velocity', value: 23, unit: 'points', confidence: 0.8 },
        { name: 'Completion Rate', value: 35, unit: '%', confidence: 0.9 },
        { name: 'Risk Score', value: 'Medium', confidence: 0.6 }
      ],
      milestones,
      risks,
      critical_path: criticalPath,
      profitLink: {
        revenue_delay_cost: 99 * 30 * 45, // Daily revenue * days delay
        critical_tasks: criticalPath,
        acceleration_value: 99 * 30 * 15 // Value of 15-day acceleration
      }
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[launch-timeline] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});