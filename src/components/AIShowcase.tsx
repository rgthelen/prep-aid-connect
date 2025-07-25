import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Mic, 
  Brain, 
  Zap, 
  Users, 
  Shield,
  Bot,
  Volume2
} from "lucide-react";

const AIShowcase = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-primary/5 to-background border-y border-border">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
            <Brain className="h-3 w-3 mr-1" />
            Powered by AI
          </Badge>
          <h2 className="text-responsive-lg font-bold text-foreground mb-4">
            Multi-Agent AI Emergency System
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Our advanced agentic AI core features specialized emergency response agents that work together to provide personalized guidance, real-time assistance, and comprehensive emergency preparedness support.
          </p>
        </div>

        {/* AI Agents Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Coordinator Agent</h3>
                  <p className="text-sm text-muted-foreground">Smart routing & triage</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Intelligently routes your requests to the right specialized agent based on emergency context and current situation.
              </p>
              <Badge variant="outline" className="text-xs">Active Now</Badge>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Shield className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Emergency Agent</h3>
                  <p className="text-sm text-muted-foreground">Crisis response & guidance</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Provides immediate emergency response guidance, safety instructions, and real-time status updates during active disasters.
              </p>
              <Badge variant="outline" className="text-xs">Active Now</Badge>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">PEPR Agent</h3>
                  <p className="text-sm text-muted-foreground">Profile management</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Helps create and manage your Personal Emergency Preparedness Records with family information and special needs.
              </p>
              <Badge variant="outline" className="text-xs">Active Now</Badge>
            </CardContent>
          </Card>
        </div>

        {/* AI Capabilities */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Intelligent Emergency Assistance
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium text-foreground">Context-Aware Responses</p>
                  <p className="text-sm text-muted-foreground">AI agents understand your location, emergency type, and personal circumstances to provide tailored guidance.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium text-foreground">Real-Time Processing</p>
                  <p className="text-sm text-muted-foreground">Instant analysis of emergency situations with immediate, actionable response recommendations.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium text-foreground">Natural Conversation</p>
                  <p className="text-sm text-muted-foreground">Chat naturally with AI agents in plain language - no complex commands or interfaces needed.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Next-Generation Features
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mic className="h-5 w-5 text-amber-500 mt-1" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">Voice Input</p>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Speak your emergency status and questions when typing isn't possible during crisis situations.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Volume2 className="h-5 w-5 text-amber-500 mt-1" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">Audio Responses</p>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Receive spoken emergency instructions when visual attention needs to be elsewhere.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-amber-500 mt-1" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">Predictive Alerts</p>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">AI-powered risk assessment and proactive emergency preparedness recommendations.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIShowcase;