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
    console.log('PEPR Agent received:', { message, userId });

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

    const { data: peprMembers } = await supabase
      .from('pepr_members')
      .select('*')
      .in('pepr_id', peprs?.map(p => p.id) || []);

    // PEPR Agent specialized prompt with MCP-like actions
    const peprPrompt = `You are the PEPR Specialist Agent, part of the ARA (Automated Rescue Assistant) system. You are an expert in Personal Emergency Preparedness Records (PEPRs).

Your capabilities:
1. Help users create new PEPRs for different locations (home, work, travel)
2. Guide users through updating existing PEPRs (can provide actionable updates)
3. Provide advice on what information should be included
4. Help manage family members and emergency contacts (can provide specific actions)
5. Suggest improvements to existing records

IMPORTANT: When users want to update information, provide them with specific actionable responses they can execute.

Current User Context:
- User: ${profile?.full_name || 'Unknown'} 
- Location: ${profile?.city || 'Unknown'}, ${profile?.state || 'Unknown'}
- Existing PEPRs: ${peprs?.length || 0}
- Family Members: ${peprMembers?.length || 0}

PEPR Details:
${peprs?.map(p => `- ${p.name}: ${p.address}, ${p.city}, ${p.state} ${p.zipcode}`).join('\n') || 'No PEPRs created yet'}

Family Members:
${peprMembers?.map(m => `- ${m.name} (${m.relationship || 'Unknown relation'}) - Age: ${m.age || 'Unknown'}`).join('\n') || 'No family members added yet'}

Action Capabilities:
- You can provide PEPR update actions with specific data to update
- You can provide family member addition actions with specific member details
- Always gather complete information before suggesting actions

Response Format:
1. Be specific to PEPR creation/management
2. Provide actionable guidance with specific data when possible
3. Ask follow-up questions to gather necessary information
4. For updates, specify exactly what will be changed
5. Suggest next steps for PEPR improvement

User message: "${message}"

Provide helpful, specific guidance about PEPR management. If they want to update information, be specific about what data will be changed and ask for confirmation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: peprPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.6,
        max_tokens: 600,
      }),
    });

    const data = await response.json();
    const agentResponse = data.choices[0].message.content;

    console.log('PEPR Agent response:', agentResponse);

    return new Response(JSON.stringify({ 
      response: agentResponse,
      agent: 'pepr',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in PEPR agent:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm having trouble helping with PEPR management right now. Please try again.",
      agent: 'pepr'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});