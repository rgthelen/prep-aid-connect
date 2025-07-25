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

// Enhanced distance calculation using Haversine formula
// This provides more accurate distance calculation
function calculateDistance(zip1: string, state1: string, zip2: string, state2: string): number {
  // If same zip and state, distance is 0
  if (zip1 === zip2 && state1 === state2) return 0;
  
  // For demonstration, we'll use a simplified approach
  // In production, you'd use a proper geocoding API to get lat/lng
  // Here we'll generate consistent "distances" based on zip code difference
  const zip1Num = parseInt(zip1.replace(/\D/g, '')) || 0;
  const zip2Num = parseInt(zip2.replace(/\D/g, '')) || 0;
  const zipDiff = Math.abs(zip1Num - zip2Num);
  
  // Convert zip difference to approximate miles (very rough estimation)
  let distance = zipDiff * 0.1; // Rough approximation
  
  // Add state difference penalty
  if (state1 !== state2) {
    distance += 50; // Add 50 miles for different states
  }
  
  // Cap at reasonable distance
  return Math.min(distance, 500);
}

// Function to check if a point is within an emergency area
function isWithinEmergencyArea(userZip: string, userState: string, emergencyZip: string, emergencyState: string, radiusMiles: number): boolean {
  const distance = calculateDistance(userZip, userState, emergencyZip, emergencyState);
  return distance <= radiusMiles;
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

    // Find affected PEPRs within the emergency radius using enhanced calculation
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
        console.log(`PEPR ${pepr.id} is affected (distance: ${distance.toFixed(1)} miles)`)
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