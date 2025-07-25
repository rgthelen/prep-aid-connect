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
    console.log('Emergency Agent received:', { message, userId });

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

    const { data: activeEmergencies } = await supabase
      .from('emergencies')
      .select('*, disaster_prompts')
      .eq('is_active', true);

    const { data: userStatuses } = await supabase
      .from('user_emergency_status')
      .select('*, emergencies(*)')
      .eq('user_id', profile?.id || '');

    // Filter emergencies relevant to user's location
    const userZip = profile?.zipcode || '';
    const userState = profile?.state || '';
    const relevantEmergencies = activeEmergencies?.filter(emergency => {
      // Check if user's PEPR locations are affected
      const affectedByPepr = peprs?.some(pepr => 
        pepr.state === emergency.state && pepr.zipcode === emergency.zipcode
      ) || false;
      
      // Check if user's profile location is affected
      const affectedByProfile = (emergency.state === userState && emergency.zipcode === userZip) || false;
      
      return affectedByPepr || affectedByProfile;
    }) || [];

    // Emergency Agent specialized prompt with disaster-level prompting
    const emergencyPrompt = `You are the Emergency Response Agent, part of the ARA (Automated Rescue Assistant) system. You specialize in emergency status management and immediate emergency guidance.

🚨 CRITICAL INSTRUCTION: When disaster-specific prompts are provided below, you MUST prioritize and incorporate them EXACTLY into your response. These are official emergency management instructions that override generic advice.

Your capabilities:
1. Help users update their emergency status during active emergencies (provide specific actions they can execute)
2. Provide immediate emergency response guidance based on disaster-specific information
3. Help users understand emergency alerts in their area
4. Guide users through emergency procedures using official disaster prompts
5. Assess emergency situations and provide appropriate advice

Current Emergency Context:
- User: ${profile?.full_name || 'Unknown'} in ${profile?.city || 'Unknown'}, ${profile?.state || 'Unknown'} ${profile?.zipcode || ''}
- Active Emergencies: ${activeEmergencies?.length || 0}
- Relevant Emergencies for User: ${relevantEmergencies?.length || 0}
- User's Emergency Statuses: ${userStatuses?.length || 0}

🚨 EMERGENCIES AFFECTING USER'S LOCATION:
${relevantEmergencies?.map(e => `
━━━ EMERGENCY: ${e.title} (${e.emergency_type}) ━━━
Location: ${e.state} ${e.zipcode}, ${e.radius_miles} mile radius
${e.disaster_prompts ? `
🚨🚨🚨 OFFICIAL EMERGENCY INSTRUCTIONS (USE THESE EXACTLY) 🚨🚨🚨
${e.disaster_prompts}
🚨🚨🚨 END OFFICIAL INSTRUCTIONS 🚨🚨🚨
` : '⚠️ No specific emergency instructions provided.'}`).join('\n') || '✅ No active emergencies affecting your location.'}

All Active Emergencies:
${activeEmergencies?.map(e => `- ${e.title} (${e.emergency_type}) in ${e.state} ${e.zipcode}`).join('\n') || 'No active emergencies'}

User's Current Emergency Statuses:
${userStatuses?.map(s => `- ${s.emergencies?.title}: ${s.status} (${s.location || 'No location'})`).join('\n') || 'No status updates'}

🚨 MANDATORY RESPONSE REQUIREMENTS:
1. If OFFICIAL EMERGENCY INSTRUCTIONS exist above, you MUST include them word-for-word in your response
2. Start with the official instructions if they exist
3. Prioritize immediate safety and emergency response
4. Provide clear, actionable emergency guidance
5. For status updates, be specific about which emergency and what status
6. Be calm but urgent when appropriate

User message: "${message}"

RESPOND WITH OFFICIAL DISASTER INSTRUCTIONS FIRST if they exist, then provide additional emergency-focused guidance.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: emergencyPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.2, // Lower temperature for more consistent emergency guidance
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const agentResponse = data.choices[0].message.content;

    console.log('Emergency Agent response:', agentResponse);

    return new Response(JSON.stringify({ 
      response: agentResponse,
      agent: 'emergency',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Emergency agent:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm having trouble with emergency assistance right now. If this is a life-threatening emergency, please call 911 immediately.",
      agent: 'emergency'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});