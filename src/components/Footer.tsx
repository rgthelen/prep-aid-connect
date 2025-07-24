import { Shield, Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <div className="font-bold text-foreground">ARA</div>
                <div className="text-xs text-muted-foreground">PreRescue</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Technology focused on saving lives and improving emergency resource efficiency through standardized emergency preparedness records.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Platform</h3>
            <div className="space-y-2">
              <a href="#features" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Create PEPR
              </a>
              <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Admin Login
              </a>
              <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Emergency Response
              </a>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Resources</h3>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Emergency Preparedness Guide
              </a>
              <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                PEPR Documentation
              </a>
              <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                API Documentation
              </a>
              <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Support Center
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Emergency Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">24/7 Emergency Line</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">emergency@ara-prerescue.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Global Coverage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            © 2024 ARA PreRescue. All rights reserved. | Emergency Preparedness Technology
          </div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;