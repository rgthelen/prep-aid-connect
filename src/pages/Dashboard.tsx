import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Plus, Users, AlertTriangle, FileText, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FamilyContactsModal } from '@/components/FamilyContactsModal';
import { EmergencyStatusModal } from '@/components/EmergencyStatusModal';
import { useToast } from '@/hooks/use-toast';

interface PEPR {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  created_at: string;
  updated_at: string;
}

interface Emergency {
  id: string;
  title: string;
  emergency_type: string;
  state: string;
  zipcode: string;
  radius_miles: number;
  description: string | null;
  created_at: string;
}

interface UserEmergencyStatus {
  id: string;
  status: string;
  notes: string | null;
  location: string | null;
  updated_at: string;
  emergency_id: string;
}

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [peprs, setPeprs] = useState<PEPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyContactsOpen, setFamilyContactsOpen] = useState(false);
  const [emergencyStatusOpen, setEmergencyStatusOpen] = useState(false);
  const [activeEmergencies, setActiveEmergencies] = useState<Emergency[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserEmergencyStatus[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchPeprs();
      fetchActiveEmergencies();
    }
  }, [profile]);

  const fetchPeprs = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('peprs')
        .select('id, name, address, city, state, zipcode, created_at, updated_at')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPeprs(data || []);
    } catch (error) {
      console.error('Error fetching PEPRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (zip1: string, state1: string, zip2: string, state2: string): number => {
    if (zip1 === zip2 && state1 === state2) return 0;
    
    const zip1Num = parseInt(zip1.replace(/\D/g, '')) || 0;
    const zip2Num = parseInt(zip2.replace(/\D/g, '')) || 0;
    const zipDiff = Math.abs(zip1Num - zip2Num);
    
    let distance = zipDiff * 0.1;
    
    if (state1 !== state2) {
      distance += 50;
    }
    
    return Math.min(distance, 500);
  };

  const isWithinEmergencyArea = (userZip: string, userState: string, emergencyZip: string, emergencyState: string, radiusMiles: number): boolean => {
    const distance = calculateDistance(userZip, userState, emergencyZip, emergencyState);
    return distance <= radiusMiles;
  };

  const fetchActiveEmergencies = async () => {
    if (!profile) return;
    
    try {
      // Fetch active emergencies
      const { data: emergencies, error: emergencyError } = await supabase
        .from('emergencies')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (emergencyError) throw emergencyError;

      // Filter emergencies relevant to user's locations
      const relevantEmergencies = (emergencies || []).filter(emergency => 
        peprs.some(pepr => 
          isWithinEmergencyArea(pepr.zipcode, pepr.state, emergency.zipcode, emergency.state, emergency.radius_miles)
        )
      );

      setActiveEmergencies(relevantEmergencies);

      // Fetch user's emergency statuses
      const { data: statuses, error: statusError } = await supabase
        .from('user_emergency_status')
        .select('*')
        .eq('user_id', profile.id)
        .in('emergency_id', relevantEmergencies.map(e => e.id));

      if (statusError) throw statusError;
      setUserStatuses(statuses || []);

    } catch (error) {
      console.error('Error fetching emergency data:', error);
    }
  };

  const updateEmergencyStatus = async (emergencyId: string, status: string) => {
    if (!profile) return;

    try {
      setUpdatingStatus(emergencyId);

      const { error } = await supabase
        .from('user_emergency_status')
        .upsert({
          user_id: profile.id,
          emergency_id: emergencyId,
          status,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,emergency_id'
        });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Your emergency status has been updated successfully.",
      });

      // Refresh both emergencies and user statuses to show the updated status
      await fetchActiveEmergencies();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update your status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
      case 'individual_safe':
        return 'text-green-600';
      case 'someone_in_danger':
        return 'text-amber-600';
      case 'we_in_danger':
      case 'need_help':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'safe': return 'We are SAFE';
      case 'individual_safe': return 'I am SAFE';
      case 'someone_in_danger': return 'Someone is in danger';
      case 'we_in_danger': return 'We are in danger';
      case 'need_help': return 'We need help';
      default: return 'Status unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">ARA PreRescue</span>
              <span className="text-xs text-muted-foreground">Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.full_name || profile?.email}
              {profile?.is_admin && <span className="ml-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded">Admin</span>}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Active Emergency Alerts */}
        {activeEmergencies.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Emergency Alerts
            </h2>
            <div className="space-y-4">
              {activeEmergencies.map((emergency) => {
                const userStatus = userStatuses.find(s => s.emergency_id === emergency.id);
                return (
                  <Alert key={emergency.id} className="border-l-4 border-l-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{emergency.title}</h4>
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                              {emergency.emergency_type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {emergency.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {emergency.state} {emergency.zipcode}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(emergency.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {userStatus && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">Your Status: </span>
                              <span className={getStatusColor(userStatus.status)}>
                                {getStatusLabel(userStatus.status)}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                (Updated: {new Date(userStatus.updated_at).toLocaleString()})
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 min-w-[200px]">
                          <label className="text-sm font-medium block mb-2">Update Status:</label>
                          <Select
                            value={userStatus?.status || ''}
                            onValueChange={(value) => updateEmergencyStatus(emergency.id, value)}
                            disabled={updatingStatus === emergency.id}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="safe">We are SAFE</SelectItem>
                              <SelectItem value="individual_safe">I am SAFE</SelectItem>
                              <SelectItem value="someone_in_danger">Someone is in danger</SelectItem>
                              <SelectItem value="we_in_danger">We are in danger</SelectItem>
                              <SelectItem value="need_help">We need help</SelectItem>
                              <SelectItem value="unknown">Status unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your Personal Emergency Preparedness Records and stay ready for any situation.
          </p>
        </div>

        {/* Existing PEPRs Section */}
        {loading ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your PEPRs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-secondary rounded w-3/4"></div>
                    <div className="h-3 bg-secondary rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-secondary rounded mb-2"></div>
                    <div className="h-3 bg-secondary rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : peprs.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your PEPRs</h2>
              <span className="text-sm text-muted-foreground">{peprs.length} record(s)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {peprs.map((pepr) => (
                <Card key={pepr.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-primary" />
                      {pepr.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      {pepr.city}, {pepr.state} {pepr.zipcode}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(pepr.created_at).toLocaleDateString()}
                    </div>
                    <div className="space-y-2">
                      <Link to={`/pepr/${pepr.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      <Link to={`/edit-pepr/${pepr.id}`}>
                        <Button variant="ghost" size="sm" className="w-full text-xs">
                          Edit PEPR
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="text-center py-8 px-4 border-2 border-dashed border-border rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No PEPRs Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Personal Emergency Preparedness Record to get started.
              </p>
              <Link to="/create-pepr">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First PEPR
                </Button>
              </Link>
            </div>
          </div>
        )}

        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create PEPR Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Plus className="h-5 w-5 text-primary" />
                 {peprs.length > 0 ? 'Create Another PEPR' : 'Create PEPR'}
               </CardTitle>
               <CardDescription>
                 {peprs.length > 0 
                   ? 'Add a PEPR for travel, work, or secondary locations'
                   : 'Set up your Personal Emergency Preparedness Record'
                 }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/create-pepr">
                <Button className="w-full">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Family Members Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Family & Contacts
              </CardTitle>
              <CardDescription>
                Manage your emergency contacts and family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setFamilyContactsOpen(true)}
              >
                Manage Contacts
              </Button>
            </CardContent>
          </Card>

          {/* Emergency Status Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Emergency Status
              </CardTitle>
              <CardDescription>
                Check active emergencies in your area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setEmergencyStatusOpen(true)}
              >
                Check Status
              </Button>
            </CardContent>
          </Card>

          {/* Admin Panel (only for admins) */}
          {profile?.is_admin && (
            <Card className="hover:shadow-lg transition-shadow border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Admin Panel
                </CardTitle>
                <CardDescription>
                  Manage users and declare emergencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/admin">
                  <Button variant="emergency" className="w-full">
                    Admin Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modals */}
        <FamilyContactsModal 
          open={familyContactsOpen} 
          onOpenChange={setFamilyContactsOpen} 
        />
        <EmergencyStatusModal 
          open={emergencyStatusOpen} 
          onOpenChange={setEmergencyStatusOpen} 
        />
      </main>
    </div>
  );
};

export default Dashboard;