import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Plus, Users, AlertTriangle, FileText, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FamilyContactsModal } from '@/components/FamilyContactsModal';
import { EmergencyStatusModal } from '@/components/EmergencyStatusModal';

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

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const [peprs, setPeprs] = useState<PEPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyContactsOpen, setFamilyContactsOpen] = useState(false);
  const [emergencyStatusOpen, setEmergencyStatusOpen] = useState(false);

  useEffect(() => {
    fetchPeprs();
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