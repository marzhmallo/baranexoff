import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const { userId, barangayId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createClient(supabaseUrl, serviceKey)

    // Verify caller
    const { data: { user: caller } } = await supabase.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // SECURITY FIX: Check if caller has permission to promote users
    const { data: callerProfile, error: profileErr } = await admin
      .from('profiles')
      .select('superior_admin')
      .eq('id', caller.id)
      .maybeSingle()

    if (profileErr || !callerProfile) {
      console.error('Error fetching caller profile:', profileErr)
      return new Response(JSON.stringify({ error: 'Forbidden: Profile not found' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Check if caller has glyph role using has_role function
    const { data: isGlyph, error: glyphErr } = await admin
      .rpc('has_role', { _user_id: caller.id, _role: 'glyph' })
    
    if (glyphErr) {
      console.error('Role check error:', glyphErr)
      return new Response(JSON.stringify({ error: 'Failed to verify permissions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Only allow glyph role or superior admins to promote users
    if (!isGlyph && !callerProfile.superior_admin) {
      console.warn(`Unauthorized promotion attempt by user ${caller.id}`)
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to promote users' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Optional: if barangayId is provided, ensure the user is the submitter
    if (barangayId) {
      const { data: brgy, error: brgyErr } = await admin
        .from('barangays')
        .select('id, submitter')
        .eq('id', barangayId)
        .maybeSingle()

      if (brgyErr || !brgy) {
        return new Response(JSON.stringify({ error: 'Barangay not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      if (brgy.submitter !== userId) {
        return new Response(JSON.stringify({ error: 'User is not the submitter for this barangay' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    // Promote the user: set superior_admin = true and status = 'approved'
    const { error: updateErr } = await admin
      .from('profiles')
      .update({ superior_admin: true, status: 'approved' })
      .eq('id', userId)

    if (updateErr) {
      console.error('promote-user update error:', updateErr)
      return new Response(JSON.stringify({ error: 'Failed to promote user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Add user to user_roles table with admin role
    const { error: roleErr } = await admin
      .from('user_roles')
      .upsert({ 
        user_id: userId, 
        role: 'admin',
        assigned_by: caller.id 
      }, { onConflict: 'user_id,role' })

    if (roleErr) {
      console.error('promote-user role assignment error:', roleErr)
      return new Response(JSON.stringify({ error: 'Failed to assign admin role' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log(`User ${userId} promoted to admin by ${caller.id}`)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('promote-user error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
