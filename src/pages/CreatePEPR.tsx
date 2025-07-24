import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

interface FamilyMember {
  name: string;
  age: string;
  relationship: string;
  special_needs: string;
  medications: string;
}

const CreatePEPR = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // PEPR form data
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
    emergency_contacts: '',
  });

  // Family members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState<FamilyMember>({
    name: '',
    age: '',
    relationship: '',
    special_needs: '',
    medications: '',
  });

  const addFamilyMember = () => {
    if (newMember.name.trim()) {
      setFamilyMembers([...familyMembers, newMember]);
      setNewMember({
        name: '',
        age: '',
        relationship: '',
        special_needs: '',
        medications: '',
      });
      setShowAddMember(false);
    }
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create PEPR
      const { data: peprData, error: peprError } = await supabase
        .from('peprs')
        .insert({
          owner_id: profile.id,
          ...formData,
        })
        .select()
        .single();

      if (peprError) throw peprError;

      // Add family members
      if (familyMembers.length > 0) {
        const membersData = familyMembers.map(member => ({
          pepr_id: peprData.id,
          name: member.name,
          age: member.age ? parseInt(member.age) : null,
          relationship: member.relationship,
          special_needs: member.special_needs,
          medications: member.medications,
        }));

        const { error: membersError } = await supabase
          .from('pepr_members')
          .insert(membersData);

        if (membersError) throw membersError;
      }

      setSuccess('PEPR created successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create PEPR');
    } finally {
      setLoading(false);
    }
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
              <span className="text-xs text-muted-foreground">Create PEPR</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Your PEPR</h1>
          <p className="text-muted-foreground">
            Set up your Personal Emergency Preparedness Record to ensure you're ready for any emergency.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide your primary address and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">PEPR Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Smith Family Home"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(value) => setFormData({ ...formData, address: value })}
                  onSelect={(result) => {
                    // Auto-fill city, state, zip from selected address
                    const context = result.context || [];
                    const place = context.find(c => c.id.startsWith('place'));
                    const region = context.find(c => c.id.startsWith('region'));
                    const postcode = context.find(c => c.id.startsWith('postcode'));
                    
                    setFormData(prev => ({
                      ...prev,
                      address: result.place_name.split(',')[0], // Just the street address
                      city: place?.text || prev.city,
                      state: region?.text || prev.state,
                      zipcode: postcode?.text || prev.zipcode,
                    }));
                  }}
                  placeholder="Enter street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipcode">ZIP Code</Label>
                  <Input
                    id="zipcode"
                    value={formData.zipcode}
                    onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
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
                Important information for first responders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="special_needs">Special Needs or Disabilities</Label>
                <Textarea
                  id="special_needs"
                  value={formData.special_needs}
                  onChange={(e) => setFormData({ ...formData, special_needs: e.target.value })}
                  placeholder="Mobility limitations, hearing/vision impairments, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  placeholder="List any critical medications"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pets">Pets</Label>
                <Textarea
                  id="pets"
                  value={formData.pets}
                  onChange={(e) => setFormData({ ...formData, pets: e.target.value })}
                  placeholder="Number and types of pets"
                />
              </div>
            </CardContent>
          </Card>

          {/* Family Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Family Members & Residents
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </CardTitle>
              <CardDescription>
                Add family members and other residents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {familyMembers.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.relationship} {member.age && `• Age ${member.age}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFamilyMember(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {showAddMember && (
                <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Name"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    />
                    <Input
                      placeholder="Age"
                      value={newMember.age}
                      onChange={(e) => setNewMember({ ...newMember, age: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Relationship (spouse, child, parent, etc.)"
                    value={newMember.relationship}
                    onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={addFamilyMember}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMember(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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
              <div className="space-y-2">
                <Label htmlFor="emergency_contacts">Emergency Contacts</Label>
                <Textarea
                  id="emergency_contacts"
                  value={formData.emergency_contacts}
                  onChange={(e) => setFormData({ ...formData, emergency_contacts: e.target.value })}
                  placeholder="Name, relationship, phone number for each contact"
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating PEPR...' : 'Create PEPR'}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreatePEPR;