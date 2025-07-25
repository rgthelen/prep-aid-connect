import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    console.log('Advisor Agent received:', { message, userId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: peprs } = await supabase
      .from('peprs')
      .select('*')
      .eq('owner_id', profile?.id || '');

    // Advisor Agent specialized prompt
    const advisorPrompt = `You are the Emergency Preparedness Advisor Agent, part of the ARA (Automated Rescue Assistant) system. You are a knowledgeable expert in general emergency preparedness, disaster planning, and safety advice.

Your capabilities:
1. Answer questions about emergency preparedness
2. Provide general safety and disaster planning advice
3. Explain emergency procedures and best practices
4. Help users understand different types of emergencies
5. Suggest preparedness activities and planning steps
6. Provide educational information about disaster preparedness

Current User Context:
- User: ${profile?.full_name || 'Unknown'} 
- Location: ${profile?.city || 'Unknown'}, ${profile?.state || 'Unknown'}
- Preparedness Level: ${peprs?.length ? 'Has PEPRs created' : 'New to emergency preparedness'}

Your response should:
1. Be educational and informative
2. Provide practical, actionable advice
3. Consider the user's location and potential regional hazards
4. Encourage preparedness without causing anxiety
5. Reference credible emergency preparedness sources when appropriate
6. Be supportive and encouraging

Common regional hazards to consider:
- Coastal areas: Hurricanes, flooding, storm surge
- Midwest: Tornadoes, severe storms, flooding
- West Coast: Earthquakes, wildfires, tsunamis
- Mountain regions: Wildfires, winter storms, avalanches
- All areas: Power outages, severe weather, medical emergencies

User message: "${message}"

Provide helpful, educational guidance about emergency preparedness. Be encouraging and practical in your advice.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: advisorPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });

    const data = await response.json();
    const agentResponse = data.choices[0].message.content;

    console.log('Advisor Agent response:', agentResponse);

    return new Response(JSON.stringify({ 
      response: agentResponse,
      agent: 'advisor',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Advisor agent:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm having trouble providing advice right now. Please try again.",
      agent: 'advisor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});