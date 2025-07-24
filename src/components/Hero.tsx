import { Button } from "@/components/ui/button";
import { AlertTriangle, Users, MapPin, Clock } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-background/80" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
            <AlertTriangle className="h-4 w-4" />
            Emergency Preparedness Platform
          </div>

          {/* Headline */}
          <h1 className="text-responsive-xl font-bold text-foreground mb-6 leading-tight">
            Save Lives with <span className="text-primary">PreRescue</span>
            <br />
            Emergency Preparedness Records
          </h1>

          {/* Description */}
          <p className="text-responsive-lg text-muted-foreground mb-8 leading-relaxed">
            Secure, standardized Personal Emergency Preparedness Records (PEPRs) that connect individuals with emergency services when it matters most. Prepare now, respond faster.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">Global</div>
              <div className="text-sm text-muted-foreground">Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">Secure</div>
              <div className="text-sm text-muted-foreground">Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">Instant</div>
              <div className="text-sm text-muted-foreground">Alerts</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="xl" className="flex-1 sm:flex-none">
              Create Your PEPR
            </Button>
            <Button variant="outline" size="xl" className="flex-1 sm:flex-none">
              Learn More
            </Button>
          </div>

          {/* Quick Features */}
          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-foreground">Family Tracking</div>
                <div className="text-sm text-muted-foreground">Keep loved ones informed</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-foreground">Smart Location</div>
                <div className="text-sm text-muted-foreground">Global address engine</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-foreground">Real-time Updates</div>
                <div className="text-sm text-muted-foreground">Instant status notifications</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;