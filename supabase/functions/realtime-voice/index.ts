import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400, headers: corsHeaders });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;
  let sessionReady = false;

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not found');
    socket.close(1011, 'Server configuration error');
    return response;
  }

  // Get user context from auth header
  const authHeader = headers.get('authorization');
  let userContext = '';
  
  if (authHeader) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Get user's PEPRs and active emergencies
        const { data: peprs } = await supabase
          .from('peprs')
          .select('*')
          .eq('user_id', user.id);
          
        const { data: emergencies } = await supabase
          .from('emergencies')
          .select('*')
          .eq('is_active', true);
          
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        userContext = `
User Context:
- User: ${profile?.full_name || user.email}
- User has ${peprs?.length || 0} PEPR(s) created
- There are ${emergencies?.length || 0} active emergencies
- User location context: ${peprs?.map(p => `${p.city}, ${p.state}`).join('; ') || 'None'}

Emergency Context:
${emergencies?.map(e => `- ${e.title} (${e.emergency_type}) in ${e.state}, affecting ${e.zipcode} within ${e.radius_miles} miles`).join('\n') || 'No active emergencies'}

Instructions: You are an AI emergency preparedness assistant. Help the user with emergency planning, PEPR management, and provide guidance during emergencies. Be concise but thorough. If there are active emergencies affecting the user's area, prioritize emergency response guidance.`;
      }
    } catch (error) {
      console.error('Error getting user context:', error);
    }
  }

  socket.onopen = () => {
    console.log('Client WebSocket connected');
    
    // Connect to OpenAI Realtime API
    openAISocket = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview");
    
    openAISocket.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
      
      // Send session configuration
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: userContext || 'You are a helpful AI assistant specializing in emergency preparedness. Help users with creating PEPRs, emergency planning, and crisis response guidance.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          },
          tools: [
            {
              type: 'function',
              name: 'update_emergency_status',
              description: 'Update the user\'s emergency status in their PEPR',
              parameters: {
                type: 'object',
                properties: {
                  status: { 
                    type: 'string',
                    enum: ['safe', 'needs_help', 'at_home', 'evacuated', 'unknown']
                  },
                  notes: { type: 'string' },
                  location: { type: 'string' }
                },
                required: ['status']
              }
            },
            {
              type: 'function',
              name: 'get_emergency_info',
              description: 'Get detailed information about active emergencies',
              parameters: {
                type: 'object',
                properties: {
                  location: { type: 'string' }
                }
              }
            }
          ],
          tool_choice: 'auto',
          temperature: 0.7,
          max_response_output_tokens: 'inf'
        }
      };
      
      openAISocket.send(JSON.stringify(sessionConfig));
    };

    openAISocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('OpenAI message:', data.type);
      
      if (data.type === 'session.created') {
        sessionReady = true;
        console.log('OpenAI session ready');
      }
      
      // Handle function calls
      if (data.type === 'response.function_call_arguments.done') {
        console.log('Function call:', data.name, data.arguments);
        
        // Send function result back
        const functionResult = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: data.call_id,
            output: JSON.stringify({ success: true, message: 'Status updated successfully' })
          }
        };
        openAISocket.send(JSON.stringify(functionResult));
        openAISocket.send(JSON.stringify({ type: 'response.create' }));
      }
      
      // Forward all messages to client
      socket.send(event.data);
    };

    openAISocket.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
    };

    openAISocket.onclose = () => {
      console.log('OpenAI WebSocket closed');
      socket.close();
    };
  };

  socket.onmessage = (event) => {
    if (openAISocket && sessionReady) {
      console.log('Forwarding message to OpenAI');
      openAISocket.send(event.data);
    } else {
      console.log('Session not ready, queuing message');
    }
  };

  socket.onclose = () => {
    console.log('Client WebSocket closed');
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error('Client WebSocket error:', error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});