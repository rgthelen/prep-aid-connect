import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, MapPin, Heart, Plus, Edit } from 'lucide-react';
import { AddFamilyMemberForm } from './AddFamilyMemberForm';
import { AddEmergencyContactForm } from './AddEmergencyContactForm';

interface FamilyMember {
  id: string;
  name: string;
  age: number | null;
  relationship: string | null;
  special_needs: string | null;
  medications: string | null;
  pepr_name: string;
  pepr_location: string;
}

interface PEPR {
  id: string;
  name: string;
  city: string;
  state: string;
  emergency_contacts: string | null;
}

interface FamilyContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FamilyContactsModal = ({ open, onOpenChange }: FamilyContactsModalProps) => {
  const { profile } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [peprs, setPeprs] = useState<PEPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFamilyForm, setShowAddFamilyForm] = useState(false);
  const [showAddContactForm, setShowAddContactForm] = useState(false);

  useEffect(() => {
    if (open && profile) {
      fetchFamilyData();
    }
  }, [open, profile]);

  const fetchFamilyData = async () => {
    if (!profile) return;
    
    try {
      // Fetch PEPRs with emergency contacts
      const { data: peprData, error: peprError } = await supabase
        .from('peprs')
        .select('id, name, city, state, emergency_contacts')
        .eq('owner_id', profile.id);

      if (peprError) throw peprError;
      setPeprs(peprData || []);

      // Fetch family members with PEPR details
      const { data: membersData, error: membersError } = await supabase
        .from('pepr_members')
        .select(`
          id,
          name,
          age,
          relationship,
          special_needs,
          medications,
          peprs!inner(name, city, state)
        `)
        .in('pepr_id', (peprData || []).map(p => p.id));

      if (membersError) throw membersError;

      const formattedMembers = (membersData || []).map(member => ({
        ...member,
        pepr_name: member.peprs.name,
        pepr_location: `${member.peprs.city}, ${member.peprs.state}`
      }));

      setFamilyMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching family data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family & Emergency Contacts
          </DialogTitle>
          <DialogDescription>
            View and manage your family members and emergency contacts across all PEPRs
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-secondary/20 rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add Family Member Form */}
            {showAddFamilyForm && (
              <AddFamilyMemberForm
                peprs={peprs}
                onSuccess={() => {
                  setShowAddFamilyForm(false);
                  fetchFamilyData();
                }}
                onCancel={() => setShowAddFamilyForm(false)}
              />
            )}

            {/* Add Emergency Contact Form */}
            {showAddContactForm && (
              <AddEmergencyContactForm
                peprs={peprs}
                onSuccess={() => {
                  setShowAddContactForm(false);
                  fetchFamilyData();
                }}
                onCancel={() => setShowAddContactForm(false)}
              />
            )}

            {!showAddFamilyForm && !showAddContactForm && (
              <>
                {/* Family Members */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Family Members ({familyMembers.length})
                    </h3>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddFamilyForm(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Family Member
                    </Button>
                  </div>
              
              {familyMembers.length > 0 ? (
                <div className="grid gap-3">
                  {familyMembers.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{member.name}</h4>
                              {member.age && (
                                <Badge variant="secondary" className="text-xs">
                                  Age {member.age}
                                </Badge>
                              )}
                              {member.relationship && (
                                <Badge variant="outline" className="text-xs">
                                  {member.relationship}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {member.pepr_name} - {member.pepr_location}
                            </p>
                            {member.special_needs && (
                              <p className="text-sm text-amber-600">
                                <strong>Special Needs:</strong> {member.special_needs}
                              </p>
                            )}
                            {member.medications && (
                              <p className="text-sm text-blue-600">
                                <strong>Medications:</strong> {member.medications}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No family members added yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add family members when creating or editing a PEPR
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

                {/* Emergency Contacts */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      Emergency Contacts
                    </h3>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddContactForm(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Contacts
                    </Button>
                  </div>
              
              <div className="grid gap-3">
                {peprs.map((pepr) => (
                  <Card key={pepr.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {pepr.name}
                      </CardTitle>
                      <CardDescription>
                        {pepr.city}, {pepr.state}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {pepr.emergency_contacts ? (
                        <div className="whitespace-pre-wrap text-sm">
                          {pepr.emergency_contacts}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No emergency contacts listed
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {peprs.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No PEPRs created yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a PEPR to add emergency contacts
                    </p>
                  </CardContent>
                </Card>
                  )}
                </div>
              </>
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