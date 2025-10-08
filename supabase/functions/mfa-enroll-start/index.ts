import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate TOTP secret
function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

// Generate QR code URL for TOTP
function generateQRCodeURL(secret: string, email: string, issuer: string = 'Baranex'): string {
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({
    secret,
    issuer,
  });
  
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already has MFA setup
    const { data: existingMFA, error: mfaError } = await supabaseClient
      .from('hieroglyphics')
      .select('*')
      .eq('userid', user.id)
      .maybeSingle();

    if (mfaError && mfaError.code !== 'PGRST116') {
      console.error('Error checking existing MFA:', mfaError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingMFA && existingMFA.enabled) {
      return new Response(JSON.stringify({ error: 'MFA already enabled' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate new secret
    const secret = generateSecret();
    const qrCodeURL = generateQRCodeURL(secret, user.email || 'user@baranex.app');

    // Store the secret temporarily (not enabled yet)
    const { error: upsertError } = await supabaseClient
      .from('hieroglyphics')
      .upsert({
        userid: user.id,
        secret,
        enabled: false,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'userid'
      });

    if (upsertError) {
      console.error('Error storing MFA secret:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to store MFA data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      qrCodeURL,
      secret,
      message: 'MFA setup initiated. Please scan the QR code with your authenticator app.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mfa-enroll-start function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});