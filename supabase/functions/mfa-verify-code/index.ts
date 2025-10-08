import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TOTP verification logic
function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const time = Math.floor(Date.now() / 1000 / 30);
  
  for (let i = -window; i <= window; i++) {
    if (generateTOTP(secret, time + i) === token) {
      return true;
    }
  }
  return false;
}

function generateTOTP(secret: string, time: number): string {
  const key = base32Decode(secret);
  const timeBytes = new ArrayBuffer(8);
  const timeView = new DataView(timeBytes);
  timeView.setUint32(4, time, false);
  
  const hmac = hmacSha1(key, new Uint8Array(timeBytes));
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

function base32Decode(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = new Uint8Array(Math.floor(encoded.length * 5 / 8));
  let index = 0;
  
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i].toUpperCase();
    const charIndex = alphabet.indexOf(char);
    if (charIndex === -1) continue;
    
    value = (value << 5) | charIndex;
    bits += 5;
    
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  
  return output.slice(0, index);
}

function hmacSha1(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;
  if (key.length > blockSize) {
    key = sha1(key);
  }
  
  const keyPadded = new Uint8Array(blockSize);
  keyPadded.set(key);
  
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = keyPadded[i] ^ 0x36;
    opad[i] = keyPadded[i] ^ 0x5c;
  }
  
  const innerHash = sha1(new Uint8Array([...ipad, ...data]));
  return sha1(new Uint8Array([...opad, ...innerHash]));
}

function sha1(data: Uint8Array): Uint8Array {
  const h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
  const w = new Array(80);
  
  // Pad the message
  const msgLen = data.length;
  const padLen = ((msgLen + 8) >>> 6) + 1;
  const padded = new Uint8Array(padLen * 64);
  padded.set(data);
  padded[msgLen] = 0x80;
  
  // Set message length
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, msgLen * 8, false);
  
  // Process each 64-byte chunk
  for (let chunk = 0; chunk < padLen; chunk++) {
    const offset = chunk * 64;
    
    // Break chunk into sixteen 32-bit words
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    
    // Extend the words
    for (let i = 16; i < 80; i++) {
      w[i] = rotateLeft(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }
    
    // Initialize hash value for this chunk
    let [a, b, c, d, e] = h;
    
    // Main loop
    for (let i = 0; i < 80; i++) {
      let f, k;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5A827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }
      
      const temp = (rotateLeft(a, 5) + f + e + k + w[i]) & 0xffffffff;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }
    
    // Add this chunk's hash to result
    h[0] = (h[0] + a) & 0xffffffff;
    h[1] = (h[1] + b) & 0xffffffff;
    h[2] = (h[2] + c) & 0xffffffff;
    h[3] = (h[3] + d) & 0xffffffff;
    h[4] = (h[4] + e) & 0xffffffff;
  }
  
  // Convert to bytes
  const result = new Uint8Array(20);
  const resultView = new DataView(result.buffer);
  for (let i = 0; i < 5; i++) {
    resultView.setUint32(i * 4, h[i], false);
  }
  
  return result;
}

function rotateLeft(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) & 0xffffffff;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, enable = false } = await req.json();

    if (!code || code.length !== 6) {
      return new Response(JSON.stringify({ error: 'Invalid verification code' }), {
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

    // Get user's MFA secret
    const { data: mfaData, error: mfaError } = await supabaseClient
      .from('hieroglyphics')
      .select('*')
      .eq('userid', user.id)
      .maybeSingle();

    if (mfaError || !mfaData || !mfaData.secret) {
      return new Response(JSON.stringify({ error: 'MFA not set up. Please start enrollment first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the code
    const isValid = verifyTOTP(mfaData.secret, code);

    if (!isValid) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid verification code' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If enabling MFA, update the record
    if (enable) {
      const { error: updateError } = await supabaseClient
        .from('hieroglyphics')
        .update({
          enabled: true,
          last_verified_at: new Date().toISOString(),
        })
        .eq('userid', user.id);

      if (updateError) {
        console.error('Error enabling MFA:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to enable MFA' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Just update last verified time
      const { error: updateError } = await supabaseClient
        .from('hieroglyphics')
        .update({
          last_verified_at: new Date().toISOString(),
        })
        .eq('userid', user.id);

      if (updateError) {
        console.error('Error updating verification time:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: enable ? 'MFA has been successfully enabled' : 'Code verified successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mfa-verify-code function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});