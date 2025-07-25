import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PEPR {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  special_needs: string | null;
  medications: string | null;
  pets: string | null;
  emergency_contacts: string | null;
}

const EditPEPR = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pepr, setPepr] = useState<PEPR | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'United States',
    special_needs: '',
    medications: '',
    pets: '',
    emergency_contacts: ''
  });

  useEffect(() => {
    if (id && profile) {
      fetchPEPR();
    }
  }, [id, profile]);

  const fetchPEPR = async () => {
    if (!id || !profile) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('peprs')
        .select('*')
        .eq('id', id)
        .eq('owner_id', profile.id)
        .single();

      if (error) throw error;
      
      setPepr(data);
      setFormData({
        name: data.name || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipcode: data.zipcode || '',
        country: data.country || 'United States',
        special_needs: data.special_needs || '',
        medications: data.medications || '',
        pets: data.pets || '',
        emergency_contacts: data.emergency_contacts || ''
      });

    } catch (error: any) {
      console.error('Error fetching PEPR:', error);
      setError('Failed to load PEPR');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('peprs')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "PEPR updated successfully",
      });

      navigate(`/pepr/${id}`);

    } catch (error: any) {
      console.error('Error updating PEPR:', error);
      toast({
        title: "Error",
        description: "Failed to update PEPR",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-secondary rounded w-1/4"></div>
            <div className="h-32 bg-secondary rounded"></div>
            <div className="h-24 bg-secondary rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pepr) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 font-medium">{error || 'PEPR not found'}</p>
              <Link to="/dashboard">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={`/pepr/${id}`} className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Shield className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">ARA PreRescue</span>
              <span className="text-xs text-muted-foreground">Edit PEPR</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Edit PEPR</h1>
          <p className="text-muted-foreground">
            Update your Personal Emergency Preparedness Record information.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the basic details of your PEPR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">PEPR Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Home, Work, Vacation Home"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="State"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="zipcode">Zip Code *</Label>
                  <Input
                    id="zipcode"
                    value={formData.zipcode}
                    onChange={(e) => handleChange('zipcode', e.target.value)}
                    placeholder="Zip code"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical & Special Needs */}
          <Card>
            <CardHeader>
              <CardTitle>Medical & Special Needs</CardTitle>
              <CardDescription>
                Important medical information and special requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="special_needs">Special Needs</Label>
                <Textarea
                  id="special_needs"
                  value={formData.special_needs}
                  onChange={(e) => handleChange('special_needs', e.target.value)}
                  placeholder="Mobility aids, dietary restrictions, accessibility requirements, etc."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="medications">Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => handleChange('medications', e.target.value)}
                  placeholder="List of medications, dosages, and medical conditions"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="pets">Pets</Label>
                <Textarea
                  id="pets"
                  value={formData.pets}
                  onChange={(e) => handleChange('pets', e.target.value)}
                  placeholder="Pet names, types, special needs, veterinarian contact"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contacts</CardTitle>
              <CardDescription>
                People to contact in case of emergency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="emergency_contacts">Emergency Contacts</Label>
                <Textarea
                  id="emergency_contacts"
                  value={formData.emergency_contacts}
                  onChange={(e) => handleChange('emergency_contacts', e.target.value)}
                  placeholder="Name, relationship, phone number, email, address for each contact"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={saving}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            
            <Link to={`/pepr/${id}`}>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EditPEPR;