import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Bot, User, Loader2, AlertTriangle, Shield, Users } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'coordinator' | 'pepr' | 'emergency' | 'advisor';
  timestamp: string;
  isLoading?: boolean;
  actions?: Array<{
    type: 'update_pepr' | 'update_status' | 'add_family_member';
    data?: any;
    executed?: boolean;
  }>;
}

interface AgentRouting {
  pepr: boolean;
  emergency: boolean;
  advisor: boolean;
}

export const ProminentChatInterface = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const addMessage = (content: string, sender: ChatMessage['sender'], id?: string, actions?: ChatMessage['actions']) => {
    const message: ChatMessage = {
      id: id || Date.now().toString(),
      content,
      sender,
      timestamp: new Date().toISOString(),
      actions,
    };
    setMessages(prev => [...prev, message]);
    return message;
  };

  const addLoadingMessage = (sender: ChatMessage['sender']) => {
    const id = `loading-${sender}-${Date.now()}`;
    const message: ChatMessage = {
      id,
      content: '',
      sender,
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    setMessages(prev => [...prev, message]);
    return id;
  };

  const updateLoadingMessage = (id: string, content: string, actions?: ChatMessage['actions']) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id 
        ? { ...msg, content, isLoading: false, actions }
        : msg
    ));
  };

  const executeAction = async (messageId: string, actionIndex: number) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.actions || !message.actions[actionIndex]) return;

    const action = message.actions[actionIndex];
    
    try {
      switch (action.type) {
        case 'update_status':
          if (action.data?.emergencyId && action.data?.status) {
            const { error } = await supabase
              .from('user_emergency_status')
              .upsert({
                user_id: profile?.id,
                emergency_id: action.data.emergencyId,
                status: action.data.status,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,emergency_id'
              });

            if (error) throw error;
            
            toast({
              title: "Status Updated",
              description: "Your emergency status has been updated successfully.",
            });
          }
          break;
        
        case 'update_pepr':
          // Handle PEPR updates
          toast({
            title: "PEPR Action",
            description: "PEPR update functionality would be implemented here.",
          });
          break;
          
        case 'add_family_member':
          // Handle family member addition
          toast({
            title: "Family Member",
            description: "Family member addition functionality would be implemented here.",
          });
          break;
      }

      // Mark action as executed
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? {
              ...msg,
              actions: msg.actions?.map((act, idx) => 
                idx === actionIndex ? { ...act, executed: true } : act
              )
            }
          : msg
      ));
    } catch (error) {
      console.error('Error executing action:', error);
      toast({
        title: "Error",
        description: "Failed to execute action. Please try again.",
        variant: "destructive",
      });
    }
  };

  const callAgent = async (agentType: string, message: string) => {
    if (!profile) return;

    const loadingId = addLoadingMessage(agentType as ChatMessage['sender']);
    
    try {
      const { data, error } = await supabase.functions.invoke(`${agentType}-agent`, {
        body: { message, userId: profile.user_id }
      });

      if (error) throw error;

      // Parse actions from agent response if they exist
      const actions = data.actions || [];
      
      updateLoadingMessage(loadingId, data.response, actions);
    } catch (error) {
      console.error(`Error calling ${agentType} agent:`, error);
      updateLoadingMessage(loadingId, `Sorry, I'm having trouble connecting to the ${agentType} specialist right now.`);
    } finally {
      setActiveAgents(prev => prev.filter(agent => agent !== agentType));
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !profile) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message
    addMessage(userMessage, 'user');

    try {
      // Call coordinator
      const coordinatorLoadingId = addLoadingMessage('coordinator');
      
      const { data: coordinatorData, error } = await supabase.functions.invoke('chat-coordinator', {
        body: { message: userMessage, userId: profile.user_id }
      });

      if (error) throw error;

      // Update coordinator response
      updateLoadingMessage(coordinatorLoadingId, coordinatorData.response);

      // Check which agents to call
      const routing: AgentRouting = coordinatorData.routing;
      const agentsToCall = [];
      
      if (routing.pepr) agentsToCall.push('pepr');
      if (routing.emergency) agentsToCall.push('emergency');
      if (routing.advisor) agentsToCall.push('advisor');

      setActiveAgents(agentsToCall);

      // Call agents asynchronously
      agentsToCall.forEach(agent => {
        callAgent(agent, userMessage);
      });

    } catch (error) {
      console.error('Error in chat:', error);
      addMessage("I'm sorry, I'm having trouble processing your request right now. Please try again.", 'coordinator');
      toast({
        title: "Chat Error",
        description: "There was an issue with the chat system. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAgentInfo = (sender: ChatMessage['sender']) => {
    switch (sender) {
      case 'user':
        return { name: 'You', icon: User, color: 'bg-blue-500' };
      case 'coordinator':
        return { name: 'ARA Assistant', icon: Bot, color: 'bg-primary' };
      case 'pepr':
        return { name: 'PEPR Specialist', icon: Shield, color: 'bg-green-500' };
      case 'emergency':
        return { name: 'Emergency Response', icon: AlertTriangle, color: 'bg-red-500' };
      case 'advisor':
        return { name: 'Preparedness Advisor', icon: Users, color: 'bg-purple-500' };
      default:
        return { name: 'Assistant', icon: Bot, color: 'bg-gray-500' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'update_status': return 'Update Emergency Status';
      case 'update_pepr': return 'Update PEPR';
      case 'add_family_member': return 'Add Family Member';
      default: return 'Execute Action';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-primary/20">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-primary/5 to-secondary/20">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-primary rounded-full">
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          ARA Emergency Assistant
          {activeAgents.length > 0 && (
            <div className="flex gap-1 ml-auto">
              {activeAgents.map(agent => (
                <Badge key={agent} variant="secondary" className="text-xs animate-pulse">
                  {agent} working...
                </Badge>
              ))}
            </div>
          )}
        </CardTitle>
        <CardDescription className="text-base">
          Your intelligent emergency preparedness assistant with specialized agents for PEPR management, emergency response, and preparedness advice.
        </CardDescription>
      </CardHeader>

      {/* Messages */}
      <div className="h-[500px] overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-secondary/10">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <div className="flex justify-center gap-4 mb-6">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome to ARA Emergency Assistant</h3>
            <p className="text-sm mb-4">
              I'm your multi-agent emergency preparedness assistant. I can help you with:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 bg-card rounded-lg border">
                <h4 className="font-medium text-green-600 mb-2">PEPR Management</h4>
                <p className="text-xs">Create, update, and manage Personal Emergency Preparedness Records</p>
              </div>
              <div className="p-4 bg-card rounded-lg border">
                <h4 className="font-medium text-red-600 mb-2">Emergency Response</h4>
                <p className="text-xs">Update status during emergencies and get immediate guidance</p>
              </div>
              <div className="p-4 bg-card rounded-lg border">
                <h4 className="font-medium text-purple-600 mb-2">Preparedness Advice</h4>
                <p className="text-xs">Get expert advice on emergency planning and preparation</p>
              </div>
            </div>
            <p className="text-sm mt-6 font-medium">Ask me anything about emergency preparedness!</p>
          </div>
        )}

        {messages.map((message) => {
          const agentInfo = getAgentInfo(message.sender);
          const Icon = agentInfo.icon;

          return (
            <div key={message.id} className={`flex gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${agentInfo.color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              
              <div className={`flex-1 max-w-[80%] ${message.sender === 'user' ? 'text-right' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {agentInfo.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                
                <div className={`inline-block p-4 rounded-lg text-sm ${
                  message.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card border shadow-sm'
                }`}>
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>

                {/* Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.executed ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => executeAction(message.id, index)}
                        disabled={action.executed}
                        className="text-xs"
                      >
                        {action.executed ? "✓ " : ""}{getActionLabel(action.type)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t bg-card">
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about emergency preparedness, PEPRs, or emergency response..."
            disabled={isLoading}
            className="flex-1 text-base"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            size="lg"
            className="px-6"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};