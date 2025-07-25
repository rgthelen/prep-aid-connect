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
    console.log('Chat coordinator received:', { message, userId });

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

    const { data: emergencies } = await supabase
      .from('emergencies')
      .select('*, disaster_prompts')
      .eq('is_active', true);

    // Main coordinator prompt
    const coordinatorPrompt = `You are ARA (Automated Rescue Assistant), a friendly and helpful emergency preparedness coordinator. 

Your role is to:
1. Greet users warmly and understand their needs
2. Determine which specialized agents can help them
3. Coordinate responses from multiple agents when needed
4. Provide immediate helpful responses while agents work
5. Be smart about routing to the most relevant agents

Available Specialized Agents:
- PEPR Agent: Creates, updates, and manages Personal Emergency Preparedness Records (PEPRs). Use when users want to create/edit PEPRs, add locations, update personal info, manage family members.
- Emergency Agent: Updates emergency status during active emergencies and provides emergency response guidance. Use when there are active emergencies, status updates needed, or emergency response questions.
- Advisor Agent: Provides general emergency preparedness advice, planning guidance, and educational information. Use for general questions about preparedness.

User Context:
- Profile: ${profile ? `${profile.full_name || 'User'} in ${profile.city || 'Unknown'}, ${profile.state || 'Unknown'}` : 'No profile'}
- PEPRs: ${peprs?.length || 0} records
- Active Emergencies: ${emergencies?.length || 0} ${emergencies?.length ? `(${emergencies.map(e => e.title).join(', ')})` : ''}

Smart Routing Guidelines:
- For "update my name", "change address", "add family member" → PEPR Agent
- For "I am safe", "need help", "emergency status" → Emergency Agent (only if active emergencies)
- For "how to prepare", "what should I do", "advice" → Advisor Agent
- For complex requests, route to multiple agents

User message: "${message}"

Respond with:
1. A brief, friendly immediate response (2-3 sentences max)
2. Agent routing decisions in this format:
   AGENT_ROUTING:
   - pepr: true/false (if they need PEPR management)
   - emergency: true/false (if they need emergency status/guidance)
   - advisor: true/false (if they need general advice)

Be concise but helpful in your immediate response.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: coordinatorPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const coordinatorResponse = data.choices[0].message.content;

    console.log('Coordinator response:', coordinatorResponse);

    // Parse agent routing from response
    const routingMatch = coordinatorResponse.match(/AGENT_ROUTING:\s*(.*?)(?=\n\n|\n$|$)/s);
    let routing = { pepr: false, emergency: false, advisor: false };
    
    if (routingMatch) {
      const routingText = routingMatch[1];
      routing.pepr = routingText.includes('pepr: true');
      routing.emergency = routingText.includes('emergency: true');
      routing.advisor = routingText.includes('advisor: true');
    }

    // Clean response (remove routing section)
    const cleanResponse = coordinatorResponse.replace(/AGENT_ROUTING:.*$/s, '').trim();

    return new Response(JSON.stringify({ 
      response: cleanResponse,
      routing,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat coordinator:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm having trouble processing your request right now. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});