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
      icon: MessageSquare,
      title: "AI Emergency Chat Assistant",
      description: "Multi-agent AI system with specialized emergency, PEPR management, and preparedness advisors for comprehensive guidance."
    },
    {
      icon: Shield,
      title: "Personal Emergency Preparedness Records (PEPRs)",
      description: "Secure, standardized emergency profiles with critical information accessible to first responders and family members."
    },
    {
      icon: Clock,
      title: "Real-Time Emergency Alerts & Status",
      description: "Instant emergency notifications and status updates during active disasters in your area with proximity-based alerts."
    },
    {
      icon: MapPin,
      title: "Interactive Emergency Mapping",
      description: "Live emergency zones with Mapbox integration showing affected areas, evacuation routes, and safe zones."
    },
    {
      icon: Users,
      title: "Family & Emergency Contacts",
      description: "Comprehensive family member profiles with special needs, medications, and automated emergency contact notifications."
    },
    {
      icon: Database,
      title: "Admin Emergency Management",
      description: "Administrative dashboard for declaring emergencies, managing disaster zones, and monitoring user safety statuses."
    }
  ];

  const comingFeatures = [
    {
      icon: Smartphone,
      title: "Mobile Push Notifications",
      description: "Native mobile app with GPS-based emergency alerts and offline functionality for remote areas."
    },
    {
      icon: Languages,
      title: "Multi-Language Support",
      description: "Full platform and AI chat translation across 10+ languages for global emergency response."
    },
    {
      icon: Globe,
      title: "Integration with Emergency Services",
      description: "Direct integration with 911 dispatch systems and first responder databases for faster emergency response."
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