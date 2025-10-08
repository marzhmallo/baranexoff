import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isValidPhilippineNumber(phone: string): boolean {
  if (!phone) return false;
  // Clean the phone number (remove spaces, dashes, etc.)
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Matches 09XXXXXXXXX or +639XXXXXXXXX
  const regex = /^(\+63|0)?9\d{9}$/;
  return regex.test(cleaned);
}

function normalizePhoneNumber(phone: string): string {
  // Convert to +639XXXXXXXXX format for Textbee
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+63')) return cleaned;
  if (cleaned.startsWith('09')) return '+63' + cleaned.substring(1);
  if (cleaned.startsWith('9')) return '+63' + cleaned;
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brgyid, message, recipient_ids } = await req.json();

    if (!brgyid || !message) {
      throw new Error('Barangay ID and message are required.');
    }

    console.log(`[send-emergency-alert] Sending alert for brgyid: ${brgyid}, mode: ${recipient_ids ? 'selected' : 'all'}`);

    let phoneNumbers: string[] = [];

    // Mode 1: Send to all residents and admins in the barangay
    if (!recipient_ids || recipient_ids.length === 0) {
      // Fetch admin/staff phone numbers from profiles
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('phone')
        .eq('brgyid', brgyid)
        .not('phone', 'is', null);

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        throw profileError;
      }

      // Fetch resident phone numbers
      const { data: residents, error: residentError } = await supabaseAdmin
        .from('residents')
        .select('mobile_number')
        .eq('brgyid', brgyid)
        .not('mobile_number', 'is', null);

      if (residentError) {
        console.error('Error fetching residents:', residentError);
        throw residentError;
      }

      const profilePhones = profiles?.map(p => p.phone).filter(Boolean) || [];
      const residentPhones = residents?.map(r => r.mobile_number).filter(Boolean) || [];
      
      phoneNumbers = [...profilePhones, ...residentPhones];
      console.log(`[send-emergency-alert] Found ${profilePhones.length} admin phones, ${residentPhones.length} resident phones`);
    } 
    // Mode 2: Send to selected recipients
    else {
      console.log(`[send-emergency-alert] Fetching ${recipient_ids.length} selected recipients`);
      
      // Split recipient_ids into profile IDs and resident IDs
      // Assuming format: "profile-{uuid}" or "resident-{uuid}"
      const profileIds = recipient_ids
        .filter((id: string) => id.startsWith('profile-'))
        .map((id: string) => id.replace('profile-', ''));
      
      const residentIds = recipient_ids
        .filter((id: string) => id.startsWith('resident-'))
        .map((id: string) => id.replace('resident-', ''));

      // Fetch selected profiles
      if (profileIds.length > 0) {
        const { data: profiles, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('phone')
          .in('id', profileIds)
          .not('phone', 'is', null);

        if (profileError) {
          console.error('Error fetching selected profiles:', profileError);
        } else {
          phoneNumbers.push(...(profiles?.map(p => p.phone).filter(Boolean) || []));
        }
      }

      // Fetch selected residents
      if (residentIds.length > 0) {
        const { data: residents, error: residentError } = await supabaseAdmin
          .from('residents')
          .select('mobile_number')
          .in('id', residentIds)
          .not('mobile_number', 'is', null);

        if (residentError) {
          console.error('Error fetching selected residents:', residentError);
        } else {
          phoneNumbers.push(...(residents?.map(r => r.mobile_number).filter(Boolean) || []));
        }
      }

      console.log(`[send-emergency-alert] Found ${phoneNumbers.length} phone numbers from selection`);
    }

    // Remove duplicates and validate
    phoneNumbers = [...new Set(phoneNumbers)];
    const validPhones = phoneNumbers.filter(isValidPhilippineNumber);
    
    console.log(`[send-emergency-alert] Total unique numbers: ${phoneNumbers.length}, Valid Philippine numbers: ${validPhones.length}`);

    if (validPhones.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No valid Philippine phone numbers found.",
          successCount: 0,
          failureCount: 0,
          totalRecipients: 0
        }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare Textbee Gateway API calls
    const textbeeApiKey = Deno.env.get('TEXTBEE_API_KEY');
    const textbeeDeviceId = Deno.env.get('TEXTBEE_DEVICE_ID');
    
    if (!textbeeApiKey) {
      throw new Error('TEXTBEE_API_KEY not configured');
    }
    if (!textbeeDeviceId) {
      throw new Error('TEXTBEE_DEVICE_ID not configured');
    }

    console.log(`[send-emergency-alert] Sending to ${validPhones.length} recipients via Textbee Gateway (Device: ${textbeeDeviceId})`);

    const sendPromises = validPhones.map(number => {
      const normalizedNumber = normalizePhoneNumber(number);
      return fetch(`https://api.textbee.dev/api/v1/gateway/devices/${textbeeDeviceId}/sendSMS`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': textbeeApiKey
        },
        body: JSON.stringify({
          recipients: [normalizedNumber],
          message: message
        })
      });
    });

    // Execute all API calls in parallel
    const results = await Promise.allSettled(sendPromises);
    
    const successfulSends = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    const failedSends = results.length - successfulSends;

    console.log(`[send-emergency-alert] Results: ${successfulSends} successful, ${failedSends} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Emergency alert sent to ${successfulSends} of ${validPhones.length} recipients.`,
        successCount: successfulSends,
        failureCount: failedSends,
        totalRecipients: validPhones.length
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[send-emergency-alert] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
