import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PEPR {
  id: string;
  owner_id: string;
  zipcode: string;
  state: string;
  city: string;
}

interface Emergency {
  id: string;
  zipcode: string;
  state: string;
  radius_miles: number;
  is_active: boolean;
}

// Function to calculate distance between two zip codes (simplified)
// In production, you'd use a proper geocoding service
function calculateDistance(zip1: string, state1: string, zip2: string, state2: string): number {
  // For demo purposes, return a random distance between 0-200 miles
  // In production, you'd geocode the zip codes and calculate actual distance
  if (zip1 === zip2 && state1 === state2) return 0;
  return Math.random() * 200;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { emergency_id, action } = await req.json()
    
    console.log(`Processing emergency ${emergency_id} with action: ${action}`)

    // Get the emergency details
    const { data: emergency, error: emergencyError } = await supabase
      .from('emergencies')
      .select('id, zipcode, state, radius_miles, is_active')
      .eq('id', emergency_id)
      .single()

    if (emergencyError || !emergency) {
      throw new Error(`Emergency not found: ${emergencyError?.message}`)
    }

    // Get all PEPRs
    const { data: peprs, error: peprsError } = await supabase
      .from('peprs')
      .select('id, owner_id, zipcode, state, city')

    if (peprsError) {
      throw new Error(`Failed to fetch PEPRs: ${peprsError.message}`)
    }

    console.log(`Found ${peprs?.length || 0} PEPRs to check`)

    // Find affected PEPRs within the emergency radius
    const affectedPeprs: PEPR[] = []
    
    for (const pepr of peprs || []) {
      const distance = calculateDistance(
        emergency.zipcode, 
        emergency.state,
        pepr.zipcode,
        pepr.state
      )
      
      if (distance <= emergency.radius_miles) {
        affectedPeprs.push(pepr)
        console.log(`PEPR ${pepr.id} is affected (distance: ${distance} miles)`)
      }
    }

    console.log(`Found ${affectedPeprs.length} affected PEPRs`)

    // Update or create user emergency status for affected users
    for (const pepr of affectedPeprs) {
      if (emergency.is_active) {
        // Create or update status for active emergency
        const { error: upsertError } = await supabase
          .from('user_emergency_status')
          .upsert({
            user_id: pepr.owner_id,
            emergency_id: emergency.id,
            status: 'unknown',
            location: `${pepr.city}, ${pepr.state} ${pepr.zipcode}`,
            notes: `Automatically added due to proximity to emergency (within ${emergency.radius_miles} miles)`
          }, {
            onConflict: 'user_id,emergency_id'
          })

        if (upsertError) {
          console.error(`Failed to upsert status for user ${pepr.owner_id}:`, upsertError)
        } else {
          console.log(`Updated status for user ${pepr.owner_id}`)
        }
      } else {
        // Emergency is inactive, optionally remove or mark as resolved
        const { error: updateError } = await supabase
          .from('user_emergency_status')
          .update({
            notes: 'Emergency has been deactivated',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', pepr.owner_id)
          .eq('emergency_id', emergency.id)

        if (updateError) {
          console.error(`Failed to update inactive status for user ${pepr.owner_id}:`, updateError)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        affected_users: affectedPeprs.length,
        emergency_active: emergency.is_active
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in update-emergency-status function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})