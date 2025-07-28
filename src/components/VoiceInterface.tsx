import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface VoiceInterfaceProps {
  onTranscriptUpdate?: (transcript: string) => void;
  onAIResponse?: (response: string) => void;
  className?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ 
  onTranscriptUpdate, 
  onAIResponse,
  className = ""
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const chatRef = useRef<RealtimeChat | null>(null);
  const currentTranscriptRef = useRef('');
  const currentAIResponseRef = useRef('');

  const handleMessage = (event: any) => {
    console.log('Voice message received:', event.type);

    switch (event.type) {
      case 'session.created':
        setConnectionStatus('connected');
        setIsConnected(true);
        toast({
          title: t('common.success'),
          description: "Voice interface connected successfully",
        });
        break;

      case 'input_audio_buffer.speech_started':
        setIsRecording(true);
        console.log('User started speaking');
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsRecording(false);
        console.log('User stopped speaking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        const userTranscript = event.transcript || '';
        setTranscript(userTranscript);
        currentTranscriptRef.current = userTranscript;
        
        if (userTranscript.trim()) {
          setMessages(prev => [...prev, {
            role: 'user',
            content: userTranscript,
            timestamp: Date.now()
          }]);
          onTranscriptUpdate?.(userTranscript);
        }
        break;

      case 'response.audio_transcript.delta':
        currentAIResponseRef.current += event.delta || '';
        break;

      case 'response.audio_transcript.done':
        const aiResponse = currentAIResponseRef.current;
        if (aiResponse.trim()) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: aiResponse,
            timestamp: Date.now()
          }]);
          onAIResponse?.(aiResponse);
        }
        currentAIResponseRef.current = '';
        break;

      case 'response.audio.delta':
        setIsAISpeaking(true);
        break;

      case 'response.audio.done':
        setIsAISpeaking(false);
        break;

      case 'error':
        console.error('Voice service error:', event.message);
        toast({
          title: t('common.error'),
          description: event.message || 'Voice service error',
          variant: "destructive",
        });
        break;

      case 'response.function_call_arguments.done':
        console.log('Function called:', event.name, event.arguments);
        toast({
          title: "Action Executed",
          description: `Executed: ${event.name}`,
        });
        break;
    }
  };

  const startConversation = async () => {
    try {
      setConnectionStatus('connecting');
      chatRef.current = new RealtimeChat();
      chatRef.current.addMessageHandler(handleMessage);
      
      // Get auth token if user is logged in
      const authToken = user ? localStorage.getItem('supabase.auth.token') : undefined;
      
      await chatRef.current.connect(authToken);
      
    } catch (error) {
      console.error('Error starting voice conversation:', error);
      setConnectionStatus('disconnected');
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to start voice conversation',
        variant: "destructive",
      });
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsRecording(false);
    setIsAISpeaking(false);
    setConnectionStatus('disconnected');
    currentTranscriptRef.current = '';
    currentAIResponseRef.current = '';
    
    toast({
      title: t('common.success'),
      description: "Voice conversation ended",
    });
  };

  const sendTextToVoice = (text: string) => {
    try {
      chatRef.current?.sendTextMessage(text);
    } catch (error) {
      console.error('Error sending text message:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to send message to voice assistant',
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  // Public method to send text messages
  useEffect(() => {
    // Add sendTextToVoice to parent component access
    if (typeof window !== 'undefined') {
      (window as any).sendTextToVoice = sendTextToVoice;
    }
  }, [isConnected]);

  const getStatusColor = () => {
    if (isAISpeaking) return 'bg-blue-500';
    if (isRecording) return 'bg-red-500 animate-pulse';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (connectionStatus === 'connecting') return 'Connecting...';
    if (isAISpeaking) return 'AI Speaking';
    if (isRecording) return 'Listening...';
    if (isConnected) return 'Ready';
    return 'Disconnected';
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-muted-foreground">{getStatusText()}</span>
      </div>

      {/* Main Control Button */}
      {!isConnected ? (
        <Button 
          onClick={startConversation}
          disabled={connectionStatus === 'connecting'}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full flex items-center gap-2"
        >
          <Phone className="h-5 w-5" />
          {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Voice Chat'}
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <Button 
            onClick={endConversation}
            variant="destructive"
            className="px-6 py-3 rounded-full flex items-center gap-2"
          >
            <PhoneOff className="h-5 w-5" />
            End Chat
          </Button>
        </div>
      )}

      {/* Live Transcript */}
      {isConnected && transcript && (
        <div className="max-w-md p-3 bg-secondary rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">You said:</p>
          <p className="text-sm">{transcript}</p>
        </div>
      )}

      {/* Recent Messages */}
      {messages.length > 0 && (
        <div className="max-w-md space-y-2 max-h-40 overflow-y-auto">
          {messages.slice(-3).map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`p-2 rounded-lg text-sm ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground ml-4' 
                  : 'bg-secondary mr-4'
              }`}
            >
              <p className="font-medium capitalize">{message.role}:</p>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-500">
          <Mic className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">Recording...</span>
        </div>
      )}

      {/* AI Speaking Indicator */}
      {isAISpeaking && (
        <div className="flex items-center gap-2 text-blue-500">
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{animationDelay: '0ms'}} />
            <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{animationDelay: '150ms'}} />
            <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{animationDelay: '300ms'}} />
          </div>
          <span className="text-sm font-medium">AI Speaking...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceInterface;