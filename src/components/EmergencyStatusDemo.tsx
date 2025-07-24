import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock, MapPin, Phone, Users } from "lucide-react";

const EmergencyStatusDemo = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-responsive-lg font-bold text-foreground mb-4">
            Emergency Response in Action
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See how PreRescue connects emergency services with critical information when disasters strike.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Admin View */}
          <Card className="shadow-lg">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Emergency Operations Center
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Active Emergency</h3>
                  <Badge variant="destructive">Hurricane Alert</Badge>
                </div>
                
                <div className="bg-emergency/10 border border-emergency/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-emergency" />
                    <span className="font-medium">Miami-Dade County, FL</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Category 3 Hurricane - Evacuation zones A, B activated
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-emergency">2,847</div>
                      <div className="text-xs text-muted-foreground">Residents Notified</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-warning">431</div>
                      <div className="text-xs text-muted-foreground">Pending Response</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-safe">2,416</div>
                      <div className="text-xs text-muted-foreground">Confirmed Safe</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Recent Status Updates</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-safe" />
                      <span>Johnson Family - Evacuated to Shelter</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-warning" />
                      <span>Maria Rodriguez - Still at home, needs assistance</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-safe" />
                      <span>Chen Family - Relocated to relatives</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  View Full Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User View */}
          <Card className="shadow-lg">
            <CardHeader className="bg-warning text-warning-foreground">
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Your Emergency Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
                  <h3 className="font-semibold text-warning mb-1">Emergency Alert Active</h3>
                  <p className="text-sm text-muted-foreground">
                    Hurricane approaching your area. Please update your status.
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Your PEPR Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span>1234 Ocean Dr, Miami, FL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Family Members:</span>
                      <span>4 people, 1 pet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Special Needs:</span>
                      <span>Elderly resident (wheelchair)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Emergency Contact:</span>
                      <span>Sister in Orlando</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Update Your Status</h4>
                  <div className="grid gap-2">
                    <Button variant="safe" size="sm" className="w-full justify-start">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      I am safe and have evacuated
                    </Button>
                    <Button variant="warning" size="sm" className="w-full justify-start">
                      <Clock className="h-4 w-4 mr-2" />
                      Still at home, need time to evacuate
                    </Button>
                    <Button variant="emergency" size="sm" className="w-full justify-start">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Need immediate assistance
                    </Button>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Family Status:</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    2 members confirmed safe • 1 pending update
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default EmergencyStatusDemo;