import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Bot, User, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'coordinator' | 'pepr' | 'emergency' | 'advisor';
  timestamp: string;
  isLoading?: boolean;
}

interface AgentRouting {
  pepr: boolean;
  emergency: boolean;
  advisor: boolean;
}

export const ChatInterface = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const addMessage = (content: string, sender: ChatMessage['sender'], id?: string) => {
    const message: ChatMessage = {
      id: id || Date.now().toString(),
      content,
      sender,
      timestamp: new Date().toISOString(),
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

  const updateLoadingMessage = (id: string, content: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id 
        ? { ...msg, content, isLoading: false }
        : msg
    ));
  };

  const callAgent = async (agentType: string, message: string) => {
    if (!profile) return;

    const loadingId = addLoadingMessage(agentType as ChatMessage['sender']);
    
    try {
      const { data, error } = await supabase.functions.invoke(`${agentType}-agent`, {
        body: { message, userId: profile.user_id }
      });

      if (error) throw error;

      updateLoadingMessage(loadingId, data.response);
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
        return { name: 'PEPR Specialist', icon: Bot, color: 'bg-green-500' };
      case 'emergency':
        return { name: 'Emergency Response', icon: Bot, color: 'bg-red-500' };
      case 'advisor':
        return { name: 'Preparedness Advisor', icon: Bot, color: 'bg-purple-500' };
      default:
        return { name: 'Assistant', icon: Bot, color: 'bg-gray-500' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isExpanded) {
    return (
      <Card className="fixed bottom-6 right-6 w-80 shadow-lg border-primary/20 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setIsExpanded(true)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 bg-primary rounded-full">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            ARA Chat Assistant
            <ChevronUp className="h-4 w-4 ml-auto" />
          </CardTitle>
          <CardDescription className="text-sm">
            Get help with emergency preparedness, PEPRs, and emergency status
          </CardDescription>
        </CardHeader>
        {messages.length > 0 && (
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? 's' : ''} • Click to open
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-lg border-primary/20 flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 bg-primary rounded-full">
            <MessageCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          ARA Chat Assistant
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CardTitle>
        <div className="flex items-center gap-2">
          <CardDescription className="text-sm flex-1">
            Multi-agent emergency assistance
          </CardDescription>
          {activeAgents.length > 0 && (
            <div className="flex gap-1">
              {activeAgents.map(agent => (
                <Badge key={agent} variant="secondary" className="text-xs">
                  {agent} working...
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Hi! I'm ARA, your emergency preparedness assistant. I can help you with:
            </p>
            <ul className="text-xs mt-2 space-y-1">
              <li>• Creating and managing PEPRs</li>
              <li>• Emergency status updates</li>
              <li>• Preparedness advice and planning</li>
            </ul>
            <p className="text-xs mt-3 font-medium">Ask me anything!</p>
          </div>
        )}

        {messages.map((message) => {
          const agentInfo = getAgentInfo(message.sender);
          const Icon = agentInfo.icon;

          return (
            <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${agentInfo.color}`}>
                <Icon className="h-3 w-3 text-white" />
              </div>
              
              <div className={`flex-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {agentInfo.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                
                <div className={`inline-block max-w-[280px] p-3 rounded-lg text-sm ${
                  message.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary'
                }`}>
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about emergency preparedness..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};