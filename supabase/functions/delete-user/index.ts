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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const { userId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Client with end-user JWT for auth checks
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    })

    // Service role client for privileged operations
    const admin = createClient(supabaseUrl, serviceKey)

    // Verify caller
    const { data: { user: caller }, error: getUserErr } = await supabase.auth.getUser()
    if (getUserErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Load caller profile
    const { data: callerProfile, error: callerErr } = await supabase
      .from('profiles')
      .select('id, role, superior_admin, brgyid')
      .eq('id', caller.id)
      .maybeSingle()

    if (callerErr || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Load target profile
    const { data: targetProfile, error: targetErr } = await admin
      .from('profiles')
      .select('id, brgyid, superior_admin')
      .eq('id', userId)
      .maybeSingle()

    if (targetErr || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Target profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Check caller's roles using has_role function
    const { data: isAdmin, error: roleErr } = await admin
      .rpc('has_role', { _user_id: callerId, _role: 'admin' })
    
    if (roleErr) {
      console.error('Role check error:', roleErr)
      return new Response(JSON.stringify({ error: 'Failed to verify permissions' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Authorization rules:
    // - Superior admins can delete anyone
    // - Admins can delete users within their barangay but not superior admins
    const isSuperior = !!callerProfile.superior_admin
    const sameBarangay = callerProfile.brgyid && targetProfile.brgyid && callerProfile.brgyid === targetProfile.brgyid

    if (!(isSuperior || (isAdmin && sameBarangay && !targetProfile.superior_admin))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Delete auth user first
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId)
    if (delAuthErr) {
      console.error('Auth delete error:', delAuthErr)
      return new Response(JSON.stringify({ error: 'Failed to delete auth user' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Delete profile row
    const { error: delProfileErr } = await admin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (delProfileErr) {
      console.error('Profile delete error:', delProfileErr)
      return new Response(JSON.stringify({ error: 'Auth deleted, but failed to delete profile' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})