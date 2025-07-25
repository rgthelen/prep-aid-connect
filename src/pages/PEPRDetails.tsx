import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowLeft, MapPin, Calendar, Users, FileText, Phone, AlertTriangle, Edit } from 'lucide-react';

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
  created_at: string;
  updated_at: string;
}

interface PEPRMember {
  id: string;
  name: string;
  age: number | null;
  relationship: string | null;
  special_needs: string | null;
  medications: string | null;
}

const PEPRDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [pepr, setPepr] = useState<PEPR | null>(null);
  const [members, setMembers] = useState<PEPRMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id && profile) {
      fetchPEPRDetails();
    }
  }, [id, profile]);

  const fetchPEPRDetails = async () => {
    if (!id || !profile) return;

    try {
      setLoading(true);
      
      // Fetch PEPR details
      const { data: peprData, error: peprError } = await supabase
        .from('peprs')
        .select('*')
        .eq('id', id)
        .eq('owner_id', profile.id)
        .single();

      if (peprError) throw peprError;
      setPepr(peprData);

      // Fetch PEPR members
      const { data: membersData, error: membersError } = await supabase
        .from('pepr_members')
        .select('*')
        .eq('pepr_id', id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

    } catch (error: any) {
      console.error('Error fetching PEPR details:', error);
      setError('Failed to load PEPR details');
    } finally {
      setLoading(false);
    }
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
          <Link to="/dashboard" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Shield className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">ARA PreRescue</span>
              <span className="text-xs text-muted-foreground">PEPR Details</span>
            </div>
          </Link>
          
          <Link to={`/edit-pepr/${pepr.id}`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit PEPR
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{pepr.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {pepr.address}, {pepr.city}, {pepr.state} {pepr.zipcode}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <p className="text-sm">{pepr.address}</p>
                <p className="text-sm">{pepr.city}, {pepr.state} {pepr.zipcode}</p>
                <p className="text-sm">{pepr.country}</p>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {new Date(pepr.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Updated: {new Date(pepr.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Special Needs & Medical */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Medical & Special Needs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Special Needs</label>
                <p className="text-sm">{pepr.special_needs || 'None specified'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Medications</label>
                <p className="text-sm">{pepr.medications || 'None specified'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Pets</label>
                <p className="text-sm">{pepr.pets || 'None'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contacts</label>
                <p className="text-sm whitespace-pre-wrap">{pepr.emergency_contacts || 'No emergency contacts specified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Family Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Family Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{member.name}</h4>
                        <div className="flex gap-2">
                          {member.age && (
                            <Badge variant="outline">Age {member.age}</Badge>
                          )}
                          {member.relationship && (
                            <Badge variant="secondary">{member.relationship}</Badge>
                          )}
                        </div>
                      </div>
                      
                      {member.special_needs && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Special Needs:</span>
                          <p className="text-xs">{member.special_needs}</p>
                        </div>
                      )}
                      
                      {member.medications && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Medications:</span>
                          <p className="text-xs">{member.medications}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No family members added</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PEPRDetails;