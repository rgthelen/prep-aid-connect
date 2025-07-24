import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
}

interface AddFamilyMemberFormProps {
  peprs: PEPR[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface FamilyMemberFormData {
  name: string;
  age?: number;
  relationship?: string;
  special_needs?: string;
  medications?: string;
  pepr_ids: string[];
}

export const AddFamilyMemberForm = ({ peprs, onSuccess, onCancel }: AddFamilyMemberFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FamilyMemberFormData>({
    defaultValues: {
      name: '',
      age: undefined,
      relationship: '',
      special_needs: '',
      medications: '',
      pepr_ids: [],
    },
  });

  const onSubmit = async (data: FamilyMemberFormData) => {
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
      // Insert family member for each selected PEPR
      const memberPromises = data.pepr_ids.map(pepr_id => 
        supabase.from('pepr_members').insert({
          pepr_id,
          name: data.name,
          age: data.age || null,
          relationship: data.relationship || null,
          special_needs: data.special_needs || null,
          medications: data.medications || null,
        })
      );

      await Promise.all(memberPromises);
      
      toast({
        title: "Success",
        description: "Family member added successfully",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error adding family member:', error);
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Add Family Member</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Age" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Spouse, Child" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="special_needs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Needs</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special needs or considerations"
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medications</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Current medications"
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
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
                {loading ? "Adding..." : "Add Family Member"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};