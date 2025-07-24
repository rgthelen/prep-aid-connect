import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shield, 
  Globe, 
  Smartphone, 
  Database, 
  Clock, 
  Users,
  MapPin,
  MessageSquare,
  Languages,
  Zap
} from "lucide-react";

const Features = () => {
  const currentFeatures = [
    {
      icon: Shield,
      title: "Personal Emergency Preparedness Records (PEPRs)",
      description: "Secure, standardized emergency profiles with critical information accessible to first responders."
    },
    {
      icon: Globe,
      title: "Global Smart Address Engine",
      description: "Intelligent location system that works across all countries and regions for precise emergency response."
    },
    {
      icon: Smartphone,
      title: "Mobile-Optimized Interface",
      description: "Designed for emergency situations with intuitive mobile-first design for quick status updates."
    },
    {
      icon: Database,
      title: "Family & Pet Information",
      description: "Comprehensive profiles including family members, pets, and special medical/mobility needs."
    },
    {
      icon: Clock,
      title: "Real-Time Status Updates",
      description: "Instant notifications and status updates during active emergencies in your area."
    },
    {
      icon: MapPin,
      title: "Geofenced Emergency Zones",
      description: "Administrators can create emergency zones by county, state, or custom map areas."
    }
  ];

  const comingFeatures = [
    {
      icon: MessageSquare,
      title: "AI Emergency Chat Assistant",
      description: "Intelligent chat interface for gathering critical information during emergency situations."
    },
    {
      icon: Zap,
      title: "Smart Emergency Prompts",
      description: "Dynamic, context-aware prompts tailored to specific disaster types and individual circumstances."
    },
    {
      icon: Languages,
      title: "Multi-Language Support",
      description: "Full platform and chat translation across 10+ languages for global emergency response."
    }
  ];

  return (
    <section id="features" className="py-16">
      <div className="container mx-auto px-4">
        {/* Current Features */}
        <div className="text-center mb-12">
          <h2 className="text-responsive-lg font-bold text-foreground mb-4">
            Core Features
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Essential tools for emergency preparedness and response, available now.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {currentFeatures.map((feature, index) => (
            <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                  <span className="text-lg">{feature.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon Features */}
        <div className="text-center mb-12">
          <h2 className="text-responsive-lg font-bold text-foreground mb-4">
            Coming Soon
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Advanced features in development to enhance emergency response capabilities.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {comingFeatures.map((feature, index) => (
            <Card key={index} className="shadow-sm border-dashed border-2 border-muted">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <feature.icon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-lg text-muted-foreground">{feature.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  In Development
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;