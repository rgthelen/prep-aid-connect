import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, ArrowLeft, AlertTriangle, Users, MapPin, Plus } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { EmergencyMap } from '@/components/EmergencyMap';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  is_admin: boolean;
}

interface Emergency {
  id: string;
  title: string;
  description: string | null;
  emergency_type: string;
  zipcode: string;
  radius_miles: number;
  state: string;
  is_active: boolean;
  created_at: string;
  disaster_prompts: string | null;
}

const Admin = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMapCreator, setShowMapCreator] = useState(false);
  const [editingEmergency, setEditingEmergency] = useState<Emergency | null>(null);

  // Emergency form
  const [emergencyForm, setEmergencyForm] = useState({
    title: '',
    description: '',
    emergency_type: '',
    zipcode: '',
    radius_miles: 10,
    state: '',
    disaster_prompts: '',
  });

  // If user is not admin, redirect
  if (!profile?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchUsers();
    fetchEmergencies();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, city, state, zipcode, is_admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError('Failed to fetch users');
    }
  };

  const fetchEmergencies = async () => {
    try {
      const { data, error } = await supabase
        .from('emergencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmergencies(data || []);
    } catch (err: any) {
      setError('Failed to fetch emergencies');
    }
  };

  const createEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    console.log('Creating emergency with form data:', emergencyForm);
    console.log('Profile:', profile);

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!emergencyForm.title || !emergencyForm.emergency_type || !emergencyForm.zipcode || !emergencyForm.state) {
        throw new Error('Please fill in all required fields (title, type, zipcode, state)');
      }

      const emergencyData = {
        title: emergencyForm.title,
        description: emergencyForm.description || null,
        emergency_type: emergencyForm.emergency_type,
        zipcode: emergencyForm.zipcode,
        state: emergencyForm.state,
        radius_miles: emergencyForm.radius_miles,
        disaster_prompts: emergencyForm.disaster_prompts || null,
        declared_by: profile.id,
      };

      console.log('Inserting emergency data:', emergencyData);

      const { data, error } = await supabase
        .from('emergencies')
        .insert(emergencyData)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Emergency created successfully:', data);

      setSuccess('Emergency declared successfully!');
      setEmergencyForm({
        title: '',
        description: '',
        emergency_type: '',
        zipcode: '',
        radius_miles: 10,
        state: '',
        disaster_prompts: '',
      });
      fetchEmergencies();
    } catch (err: any) {
      console.error('Failed to create emergency:', err);
      setError(`Failed to declare emergency: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
      setSuccess(`User ${!currentStatus ? 'promoted to' : 'removed from'} admin successfully`);
    } catch (err: any) {
      setError('Failed to update user admin status');
    }
  };

  const toggleEmergencyStatus = async (emergencyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('emergencies')
        .update({ is_active: !currentStatus })
        .eq('id', emergencyId);

      if (error) throw error;
      fetchEmergencies();
    } catch (err: any) {
      setError('Failed to update emergency status');
    }
  };

  const editEmergency = (emergency: Emergency) => {
    setEditingEmergency(emergency);
    setEmergencyForm({
      title: emergency.title,
      description: emergency.description || '',
      emergency_type: emergency.emergency_type,
      zipcode: emergency.zipcode,
      radius_miles: emergency.radius_miles,
      state: emergency.state,
      disaster_prompts: emergency.disaster_prompts || '',
    });
  };

  const updateEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editingEmergency) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('emergencies')
        .update({
          title: emergencyForm.title,
          description: emergencyForm.description || null,
          emergency_type: emergencyForm.emergency_type,
          zipcode: emergencyForm.zipcode,
          state: emergencyForm.state,
          radius_miles: emergencyForm.radius_miles,
          disaster_prompts: emergencyForm.disaster_prompts || null,
        })
        .eq('id', editingEmergency.id);

      if (error) throw error;

      setSuccess('Emergency updated successfully!');
      setEditingEmergency(null);
      setEmergencyForm({
        title: '',
        description: '',
        emergency_type: '',
        zipcode: '',
        radius_miles: 10,
        state: '',
        disaster_prompts: '',
      });
      fetchEmergencies();
    } catch (err: any) {
      setError(`Failed to update emergency: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingEmergency(null);
    setEmergencyForm({
      title: '',
      description: '',
      emergency_type: '',
      zipcode: '',
      radius_miles: 10,
      state: '',
      disaster_prompts: '',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Shield className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">ARA PreRescue</span>
              <span className="text-xs text-muted-foreground">Admin Panel</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users and declare emergencies in affected areas.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {!showMapCreator ? (
            <>
              {/* Declare Emergency */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-emergency" />
                    {editingEmergency ? 'Edit Emergency' : 'Declare Emergency'}
                  </CardTitle>
                  <CardDescription>
                    {editingEmergency ? 'Update emergency details' : 'Create an emergency alert for specific areas'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button 
                      onClick={() => setShowMapCreator(true)}
                      className="w-full flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      Create Emergency with Map
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or use form</span>
                      </div>
                    </div>

                    <form onSubmit={editingEmergency ? updateEmergency : createEmergency} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Emergency Title</Label>
                        <Input
                          id="title"
                          value={emergencyForm.title}
                          onChange={(e) => setEmergencyForm({ ...emergencyForm, title: e.target.value })}
                          placeholder="e.g., Wildfire Alert"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emergency_type">Emergency Type</Label>
                        <Input
                          id="emergency_type"
                          value={emergencyForm.emergency_type}
                          onChange={(e) => setEmergencyForm({ ...emergencyForm, emergency_type: e.target.value })}
                          placeholder="e.g., Wildfire, Flood, Earthquake"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zipcode">ZIP Code</Label>
                          <Input
                            id="zipcode"
                            value={emergencyForm.zipcode}
                            onChange={(e) => setEmergencyForm({ ...emergencyForm, zipcode: e.target.value })}
                            placeholder="12345"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={emergencyForm.state}
                            onChange={(e) => setEmergencyForm({ ...emergencyForm, state: e.target.value })}
                            placeholder="CA"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="radius">Radius (miles)</Label>
                        <Input
                          id="radius"
                          type="number"
                          value={emergencyForm.radius_miles}
                          onChange={(e) => setEmergencyForm({ ...emergencyForm, radius_miles: parseInt(e.target.value) || 10 })}
                          min="1"
                          max="100"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={emergencyForm.description}
                          onChange={(e) => setEmergencyForm({ ...emergencyForm, description: e.target.value })}
                          placeholder="Additional details about the emergency..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="disaster_prompts">Disaster-Level AI Prompts (Optional)</Label>
                        <Textarea
                          id="disaster_prompts"
                          value={emergencyForm.disaster_prompts}
                          onChange={(e) => setEmergencyForm({ ...emergencyForm, disaster_prompts: e.target.value })}
                          placeholder="Special instructions for the Emergency Agent during this disaster (e.g., 'Tell people to avoid downtown area due to bridge collapse. Recommend evacuation routes via Highway 101.')"
                          className="min-h-[80px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          These prompts will be automatically included when the Emergency Agent responds to users during this emergency.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" variant="emergency" className="flex-1" disabled={loading}>
                          {loading ? (editingEmergency ? 'Updating...' : 'Declaring Emergency...') : (editingEmergency ? 'Update Emergency' : 'Declare Emergency')}
                        </Button>
                        {editingEmergency && (
                          <Button type="button" variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </div>
                </CardContent>
              </Card>

              {/* User Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    User Management ({users.length} users)
                  </CardTitle>
                  <CardDescription>
                    Manage user accounts and admin permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{user.full_name || user.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.city && user.state ? `${user.city}, ${user.state}` : 'No location set'}
                            {user.zipcode && ` • ${user.zipcode}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.is_admin && (
                            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                              Admin
                            </span>
                          )}
                          <Button
                            variant={user.is_admin ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => toggleUserAdmin(user.id, user.is_admin)}
                          >
                            {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emergency" />
                      Create Emergency with Map
                    </CardTitle>
                    <CardDescription>
                      Use the interactive map to define emergency areas
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowMapCreator(false)}
                  >
                    Back to Form
                  </Button>
                </CardHeader>
                <CardContent>
                  <EmergencyMap 
                    onEmergencyCreated={() => {
                      fetchEmergencies();
                      setShowMapCreator(false);
                      setSuccess('Emergency created successfully with map!');
                    }}
                    existingEmergencies={emergencies}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Active Emergencies */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emergency" />
              Emergency Management
            </CardTitle>
            <CardDescription>
              View and manage declared emergencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emergencies.map((emergency) => (
                  <TableRow key={emergency.id}>
                    <TableCell className="font-medium">{emergency.title}</TableCell>
                    <TableCell>{emergency.emergency_type}</TableCell>
                    <TableCell>
                      {emergency.zipcode}, {emergency.state} ({emergency.radius_miles} mi)
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${
                        emergency.is_active 
                          ? 'bg-emergency text-emergency-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {emergency.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleEmergencyStatus(emergency.id, emergency.is_active)}
                        >
                          {emergency.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editEmergency(emergency)}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;