import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface PEPR {
  id: string;
  name: string;
  city: string;
  state: string;
  emergency_contacts?: string;
}

interface AddEmergencyContactFormProps {
  peprs: PEPR[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface EmergencyContactFormData {
  contacts: string;
  pepr_ids: string[];
  action: 'replace' | 'append';
}

export const AddEmergencyContactForm = ({ peprs, onSuccess, onCancel }: AddEmergencyContactFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<EmergencyContactFormData>({
    defaultValues: {
      contacts: '',
      pepr_ids: [],
      action: 'append',
    },
  });

  const onSubmit = async (data: EmergencyContactFormData) => {
    if (data.pepr_ids.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one PEPR",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update emergency contacts for each selected PEPR
      const updatePromises = data.pepr_ids.map(async (pepr_id) => {
        const pepr = peprs.find(p => p.id === pepr_id);
        let newContacts = data.contacts;
        
        if (data.action === 'append' && pepr?.emergency_contacts) {
          newContacts = `${pepr.emergency_contacts}\n\n${data.contacts}`;
        }
        
        return supabase
          .from('peprs')
          .update({ emergency_contacts: newContacts })
          .eq('id', pepr_id);
      });

      await Promise.all(updatePromises);
      
      toast({
        title: "Success",
        description: "Emergency contacts updated successfully",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error updating emergency contacts:', error);
      toast({
        title: "Error",
        description: "Failed to update emergency contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Add Emergency Contacts</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contacts"
              rules={{ required: "Emergency contacts are required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Contacts</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Name: John Doe&#10;Phone: (555) 123-4567&#10;Relationship: Brother&#10;&#10;Name: Jane Smith&#10;Phone: (555) 987-6543&#10;Relationship: Friend"
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="append"
                        value="append"
                        checked={field.value === 'append'}
                        onChange={() => field.onChange('append')}
                        className="h-4 w-4"
                      />
                      <label htmlFor="append" className="text-sm font-normal">
                        Add to existing contacts
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="replace"
                        value="replace"
                        checked={field.value === 'replace'}
                        onChange={() => field.onChange('replace')}
                        className="h-4 w-4"
                      />
                      <label htmlFor="replace" className="text-sm font-normal">
                        Replace existing contacts
                      </label>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="text-base">Apply to PEPRs</FormLabel>
              <div className="mt-2 space-y-2">
                {peprs.map((pepr) => (
                  <FormField
                    key={pepr.id}
                    control={form.control}
                    name="pepr_ids"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(pepr.id)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, pepr.id]);
                              } else {
                                field.onChange(currentValue.filter((id) => id !== pepr.id));
                              }
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            {pepr.name}
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            {pepr.city}, {pepr.state}
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Contacts"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};