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
import { ProminentChatInterface } from '@/components/ProminentChatInterface';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';

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
  const { t } = useTranslation();
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
        title: t('dashboard.statusUpdated'),
        description: t('dashboard.statusUpdatedDesc'),
      });

      // Refresh both emergencies and user statuses to show the updated status
      await fetchActiveEmergencies();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: t('dashboard.errorTitle'),
        description: t('dashboard.errorDesc'),
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
      case 'safe': return t('dashboard.statusOptions.safe');
      case 'individual_safe': return t('dashboard.statusOptions.safe');
      case 'someone_in_danger': return t('dashboard.statusOptions.needs_help');
      case 'we_in_danger': return t('dashboard.statusOptions.needs_help');
      case 'need_help': return t('dashboard.statusOptions.needs_help');
      default: return t('dashboard.statusOptions.unknown');
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
              <span className="text-xs text-muted-foreground">{t('dashboard.signOut')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <span className="text-sm text-muted-foreground">
              {t('dashboard.welcome')}, {profile?.full_name || profile?.email}
              {profile?.is_admin && <span className="ml-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded">{t('dashboard.actions.adminPanel')}</span>}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              {t('dashboard.signOut')}
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
              {t('dashboard.activeAlerts')}
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
                              <span className="font-medium">{t('dashboard.yourStatusLabel')}</span>
                              <span className={getStatusColor(userStatus.status)}>
                                {getStatusLabel(userStatus.status)}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {t('dashboard.updatedLabel')}{new Date(userStatus.updated_at).toLocaleString()})
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 min-w-[200px]">
                          <label className="text-sm font-medium block mb-2">{t('dashboard.updateStatus')}:</label>
                          <Select
                            value={userStatus?.status || ''}
                            onValueChange={(value) => updateEmergencyStatus(emergency.id, value)}
                            disabled={updatingStatus === emergency.id}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('dashboard.updateStatus')} />
                            </SelectTrigger>
                            <SelectContent className="bg-card border border-border z-50">
                              <SelectItem value="safe">{t('dashboard.statusOptions.safe')}</SelectItem>
                              <SelectItem value="needs_help">{t('dashboard.statusOptions.needs_help')}</SelectItem>
                              <SelectItem value="at_home">{t('dashboard.statusOptions.at_home')}</SelectItem>
                              <SelectItem value="evacuated">{t('dashboard.statusOptions.evacuated')}</SelectItem>
                              <SelectItem value="unknown">{t('dashboard.statusOptions.unknown')}</SelectItem>
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

        {/* Main Chat Interface - Prominent */}
        <div className="mb-12">
          <ProminentChatInterface />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('dashboard.emergencyData')}</h2>
          <p className="text-muted-foreground">
            {t('dashboard.emergencyDataDesc')}
          </p>
        </div>

        {/* Existing PEPRs Section */}
        {loading ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.yourPeprs')}</h2>
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
              <h2 className="text-xl font-semibold">{t('dashboard.yourPeprs')}</h2>
              <span className="text-sm text-muted-foreground">{peprs.length} {t('dashboard.record')}</span>
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
                      {t('dashboard.created')} {new Date(pepr.created_at).toLocaleDateString()}
                    </div>
                    <div className="space-y-2">
                      <Link to={`/pepr/${pepr.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          {t('dashboard.viewDetails')}
                        </Button>
                      </Link>
                      <Link to={`/edit-pepr/${pepr.id}`}>
                        <Button variant="ghost" size="sm" className="w-full text-xs">
                          {t('dashboard.editPepr')}
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
              <h3 className="text-lg font-medium mb-2">{t('dashboard.noPeprsYet')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('dashboard.createFirstDesc')}
              </p>
              <Link to="/create-pepr">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.createFirst')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create PEPR Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  {peprs.length > 0 ? t('dashboard.createAnother') : t('dashboard.createPepr')}
                </CardTitle>
                <CardDescription>
                  {peprs.length > 0 
                    ? t('dashboard.createAnotherDesc')
                    : t('dashboard.createPeprDesc')
                  }
               </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/create-pepr">
                <Button className="w-full">
                  {t('dashboard.getStarted')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Family Members Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('dashboard.familyContacts')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.familyContactsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setFamilyContactsOpen(true)}
              >
                {t('dashboard.manageContacts')}
              </Button>
            </CardContent>
          </Card>

          {/* Emergency Status Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t('dashboard.emergencyStatus')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.emergencyStatusDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setEmergencyStatusOpen(true)}
              >
                {t('dashboard.checkStatus')}
              </Button>
            </CardContent>
          </Card>

          {/* Admin Panel (only for admins) */}
          {profile?.is_admin && (
            <Card className="hover:shadow-lg transition-shadow border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {t('dashboard.adminPanelTitle')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.adminPanelDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/admin">
                  <Button variant="emergency" className="w-full">
                    {t('dashboard.accessAdmin')}
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