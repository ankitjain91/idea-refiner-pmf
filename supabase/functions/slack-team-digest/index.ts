import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhook_url, period = 'weekly' } = await req.json();

    if (!webhook_url) {
      return new Response(
        JSON.stringify({ error: 'Slack webhook URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[slack-team-digest] Generating', period, 'digest');

    // Calculate time range
    const now = new Date();
    const startDate = new Date();
    if (period === 'daily') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    // Fetch top ideas from leaderboard
    const { data: topIdeas } = await supabase
      .from('leaderboard')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('pmf_score', { ascending: false })
      .limit(5);

    // Fetch recent actions
    const { data: recentActions } = await supabase
      .from('actions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    // Build Slack message
    const slackMessage = {
      text: `🧠 SmoothBrains ${period.charAt(0).toUpperCase() + period.slice(1)} Digest`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🧠 SmoothBrains ${period.charAt(0).toUpperCase() + period.slice(1)} Digest`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Top Ideas This ${period === 'daily' ? 'Day' : period === 'weekly' ? 'Week' : 'Month'}*`,
          },
        },
        ...buildIdeaBlocks(topIdeas || []),
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Recently Completed Actions: ${(recentActions || []).length}*`,
          },
        },
      ],
    };

    // Send to Slack
    const slackResponse = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.status}`);
    }

    console.log('[slack-team-digest] Digest sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Digest sent to Slack' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[slack-team-digest] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildIdeaBlocks(ideas: any[]) {
  return ideas.map((idea, index) => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${index + 1}. *${idea.idea_text.substring(0, 100)}...* - PMF Score: ${idea.pmf_score}/100 | 👍 ${idea.upvotes}`,
    },
  }));
}
