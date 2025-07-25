import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Users, User, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Emergency {
  id: string;
  title: string;
  emergency_type: string;
  state: string;
  zipcode: string;
}

interface EmergencyStatusUpdateProps {
  emergency: Emergency;
  onStatusUpdate?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'safe', label: 'We are SAFE', icon: CheckCircle, color: 'text-green-600' },
  { value: 'individual_safe', label: 'I am SAFE', icon: User, color: 'text-green-600' },
  { value: 'someone_in_danger', label: 'Someone is in danger', icon: AlertTriangle, color: 'text-amber-600' },
  { value: 'we_in_danger', label: 'We are in danger', icon: Users, color: 'text-red-600' },
  { value: 'need_help', label: 'We need help', icon: HelpCircle, color: 'text-red-600' },
  { value: 'unknown', label: 'Status unknown', icon: HelpCircle, color: 'text-gray-600' },
];

export const EmergencyStatusUpdate = ({ emergency, onStatusUpdate }: EmergencyStatusUpdateProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (!profile || !status) return;

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('user_emergency_status')
        .upsert({
          user_id: profile.id,
          emergency_id: emergency.id,
          status,
          notes: notes || null,
          location: location || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,emergency_id'
        });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Your emergency status has been updated successfully.",
      });

      onStatusUpdate?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update your status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const selectedStatusOption = STATUS_OPTIONS.find(opt => opt.value === status);

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Update Your Status
        </CardTitle>
        <CardDescription>
          <div className="space-y-1">
            <div className="font-medium">{emergency.title}</div>
            <Badge variant="outline">{emergency.emergency_type}</Badge>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Current Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select your status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Current Location (optional)</label>
          <Textarea
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where are you currently located?"
            className="min-h-[60px]"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Additional Notes (optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information about your situation..."
            className="min-h-[80px]"
          />
        </div>

        <Button 
          onClick={handleStatusUpdate}
          disabled={!status || updating}
          className="w-full"
        >
          {updating ? 'Updating...' : 'Update Status'}
        </Button>

        {selectedStatusOption && (
          <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
            <selectedStatusOption.icon className={`h-4 w-4 ${selectedStatusOption.color}`} />
            <span className="text-sm">Selected: {selectedStatusOption.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};