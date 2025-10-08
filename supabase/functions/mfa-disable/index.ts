import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TOTP verification function (extracted from mfa-verify-code)
function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const time = Math.floor(Date.now() / 1000 / 30);
  
  for (let i = -window; i <= window; i++) {
    const timeToCheck = time + i;
    const generatedToken = generateTOTP(secret, timeToCheck);
    
    if (generatedToken === token) {
      return true;
    }
  }
  
  return false;
}

function generateTOTP(secret: string, time: number): string {
  const key = base32Decode(secret);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, time, false);
  
  const hmac = hmacSha1(key, new Uint8Array(timeBuffer));
  const offset = hmac[hmac.length - 1] & 0xf;
  
  const binary = 
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

function base32Decode(encoded: string): Uint8Array {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  encoded = encoded.toUpperCase().replace(/=+$/, '');
  
  let bits = '';
  for (let i = 0; i < encoded.length; i++) {
    const val = base32Chars.indexOf(encoded[i]);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  
  return bytes;
}

function hmacSha1(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;
  
  if (key.length > blockSize) {
    key = sha1(key);
  }
  
  if (key.length < blockSize) {
    const newKey = new Uint8Array(blockSize);
    newKey.set(key);
    key = newKey;
  }
  
  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = 0x5c ^ key[i];
    iKeyPad[i] = 0x36 ^ key[i];
  }
  
  const innerData = new Uint8Array(iKeyPad.length + data.length);
  innerData.set(iKeyPad);
  innerData.set(data, iKeyPad.length);
  
  const innerHash = sha1(innerData);
  
  const outerData = new Uint8Array(oKeyPad.length + innerHash.length);
  outerData.set(oKeyPad);
  outerData.set(innerHash, oKeyPad.length);
  
  return sha1(outerData);
}

function sha1(data: Uint8Array): Uint8Array {
  const msgLen = data.length;
  const bitLen = msgLen * 8;
  
  const paddedLen = Math.ceil((bitLen + 65) / 512) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[msgLen] = 0x80;
  
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen, false);
  
  let h0 = 0x67452301;
  let h1 = 0xEFCDAB89;
  let h2 = 0x98BADCFE;
  let h3 = 0x10325476;
  let h4 = 0xC3D2E1F0;
  
  for (let i = 0; i < paddedLen; i += 64) {
    const w = new Uint32Array(80);
    
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    
    for (let j = 16; j < 80; j++) {
      w[j] = rotateLeft(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
    }
    
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    
    for (let j = 0; j < 80; j++) {
      let f, k;
      
      if (j < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5A827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }
      
      const temp = (rotateLeft(a, 5) + f + e + k + w[j]) >>> 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }
    
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  
  const result = new Uint8Array(20);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, h0, false);
  resultView.setUint32(4, h1, false);
  resultView.setUint32(8, h2, false);
  resultView.setUint32(12, h3, false);
  resultView.setUint32(16, h4, false);
  
  return result;
}

function rotateLeft(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password, mfaCode } = await req.json();

    // Require BOTH password AND MFA code for security
    if (!password || !mfaCode) {
      return new Response(JSON.stringify({ 
        error: 'Both password and MFA code required for security' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Check if user has MFA enabled
    const { data: mfaData, error: mfaError } = await supabaseClient
      .from('hieroglyphics')
      .select('*')
      .eq('userid', user.id)
      .maybeSingle();

    if (mfaError || !mfaData || !mfaData.enabled) {
      return new Response(JSON.stringify({ error: 'MFA is not enabled' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY FIX: Actually verify the MFA code against the stored secret
    if (!mfaData.secret) {
      return new Response(JSON.stringify({ error: 'MFA secret not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isValidCode = verifyTOTP(mfaData.secret, mfaCode);
    
    if (!isValidCode) {
      console.warn(`Invalid MFA code attempt for user ${user.id}`);
      return new Response(JSON.stringify({ error: 'Invalid MFA code' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify password by attempting to update it
    try {
      const { error: reauthError } = await supabaseClient.auth.updateUser({
        password: password
      });
      
      if (reauthError) {
        return new Response(JSON.stringify({ error: 'Invalid password' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Password verification failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Both password and MFA code verified - disable MFA
    const { error: disableError } = await supabaseClient
      .from('hieroglyphics')
      .update({
        enabled: false,
        secret: null, // Clear the secret for security
        last_verified_at: null,
      })
      .eq('userid', user.id);

    if (disableError) {
      console.error('Error disabling MFA:', disableError);
      return new Response(JSON.stringify({ error: 'Failed to disable MFA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`MFA successfully disabled for user ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Two-Factor Authentication has been successfully disabled'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mfa-disable function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
