import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, MapPin, Clock, Info, CheckCircle } from 'lucide-react';
import { EmergencyMapView } from './EmergencyMapView';

interface Emergency {
  id: string;
  title: string;
  description: string | null;
  emergency_type: string;
  state: string;
  zipcode: string;
  radius_miles: number;
  is_active: boolean;
  created_at: string;
  declared_by: string;
}

interface EmergencyStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EmergencyStatusModal = ({ open, onOpenChange }: EmergencyStatusModalProps) => {
  const { profile } = useAuth();
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [userLocations, setUserLocations] = useState<Array<{zipcode: string, state: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [relevantEmergencies, setRelevantEmergencies] = useState<Emergency[]>([]);

  useEffect(() => {
    if (open && profile) {
      fetchEmergencyData();
    }
  }, [open, profile]);

  // Enhanced distance calculation function
  const calculateDistance = (zip1: string, state1: string, zip2: string, state2: string): number => {
    if (zip1 === zip2 && state1 === state2) return 0;
    
    const zip1Num = parseInt(zip1.replace(/\D/g, '')) || 0;
    const zip2Num = parseInt(zip2.replace(/\D/g, '')) || 0;
    const zipDiff = Math.abs(zip1Num - zip2Num);
    
    let distance = zipDiff * 0.1; // Rough approximation
    
    if (state1 !== state2) {
      distance += 50; // Add 50 miles for different states
    }
    
    return Math.min(distance, 500);
  };

  // Function to check if user is within emergency area
  const isWithinEmergencyArea = (userZip: string, userState: string, emergencyZip: string, emergencyState: string, radiusMiles: number): boolean => {
    const distance = calculateDistance(userZip, userState, emergencyZip, emergencyState);
    return distance <= radiusMiles;
  };

  const fetchEmergencyData = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      // Fetch user's PEPR locations
      const { data: peprData, error: peprError } = await supabase
        .from('peprs')
        .select('name, state, zipcode')
        .eq('owner_id', profile.id);

      if (peprError) {
        console.error('Error fetching PEPRs:', peprError);
        throw peprError;
      }
      
      setUserLocations(peprData || []);

      // Fetch active emergencies
      const { data: emergencyData, error: emergencyError } = await supabase
        .from('emergencies')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (emergencyError) {
        console.error('Error fetching emergencies:', emergencyError);
        throw emergencyError;
      }
      
      setEmergencies(emergencyData || []);

      // Enhanced filtering using proper distance calculation
      const relevant = (emergencyData || []).filter(emergency => 
        (peprData || []).some(location => 
          isWithinEmergencyArea(location.zipcode, location.state, emergency.zipcode, emergency.state, emergency.radius_miles)
        )
      );
      
      setRelevantEmergencies(relevant);

    } catch (error) {
      console.error('Error fetching emergency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmergencyTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fire': return 'bg-red-500';
      case 'flood': return 'bg-blue-500';
      case 'earthquake': return 'bg-orange-500';
      case 'storm': return 'bg-purple-500';
      case 'tornado': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getEmergencyIcon = (type: string) => {
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Emergency Status
          </DialogTitle>
          <DialogDescription>
            Active emergencies and alerts in your area
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-secondary/20 rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Emergency Map */}
            {emergencies.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Emergency Map View
                </h3>
                <EmergencyMapView 
                  emergencies={emergencies}
                  userLocation={profile ? { zipcode: profile.zipcode || '', state: profile.state || '' } : undefined}
                  height="300px"
                />
              </div>
            )}

            {/* User Locations Overview */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Your Monitored Locations
              </h3>
              <div className="flex flex-wrap gap-2">
                {userLocations.map((location, index) => (
                  <Badge key={index} variant="outline">
                    {location.name} - {location.state} {location.zipcode}
                  </Badge>
                ))}
              </div>
              {userLocations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No locations to monitor. Create a PEPR to set up location monitoring.
                </p>
              )}
            </div>

            {/* Relevant Emergencies */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Emergencies in Your Area ({relevantEmergencies.length})
              </h3>
              
              {relevantEmergencies.length > 0 ? (
                <div className="space-y-3">
                  {relevantEmergencies.map((emergency) => (
                    <Alert key={emergency.id} className="border-l-4 border-l-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{emergency.title}</h4>
                                <Badge 
                                  className={`text-white ${getEmergencyTypeColor(emergency.emergency_type)}`}
                                >
                                  {emergency.emergency_type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {emergency.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {emergency.state} {emergency.zipcode}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(emergency.created_at).toLocaleDateString()} at{' '}
                                  {new Date(emergency.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-600 font-medium">No Active Emergencies</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      There are currently no active emergencies in your monitored areas
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* All Active Emergencies */}
            {emergencies.length > relevantEmergencies.length && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Other Active Emergencies ({emergencies.length - relevantEmergencies.length})
                </h3>
                
                <div className="space-y-3">
                  {emergencies
                    .filter(e => !relevantEmergencies.some(re => re.id === e.id))
                    .map((emergency) => (
                    <Card key={emergency.id} className="border-l-4 border-l-blue-300">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{emergency.title}</h4>
                              <Badge 
                                variant="secondary"
                                className={`text-white ${getEmergencyTypeColor(emergency.emergency_type)}`}
                              >
                                {emergency.emergency_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {emergency.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {emergency.state} {emergency.zipcode}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(emergency.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {emergencies.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">No Active Emergencies</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    There are currently no active emergencies reported in the system
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};