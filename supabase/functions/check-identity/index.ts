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
    const { email, phone } = await req.json()

    if (!email && !phone) {
      return new Response(JSON.stringify({ error: 'Missing email or phone' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Normalize inputs
    const normEmail = typeof email === 'string' ? email.trim().toLowerCase() : null
    const normPhone = typeof phone === 'string' ? phone.trim() : null

    // 1) Check auth.users via Admin SDK (no direct HTTP calls)
    let emailExistsAuth = false
    if (normEmail) {
      try {
        const perPage = 100
        for (let page = 1; page <= 5; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
          if (error) {
            console.error('admin.listUsers error:', error)
            break
          }
          const users = data?.users || []
          const found = users.some((u: any) => {
            const primary = (u.email || '').trim().toLowerCase()
            if (primary === normEmail) return true
            const identities = Array.isArray(u.identities) ? u.identities : []
            return identities.some((id: any) => (id.identity_data?.email || '').trim().toLowerCase() === normEmail)
          })
          if (found) {
            emailExistsAuth = true
            break
          }
          if (users.length < perPage) break // no more pages
        }
      } catch (e) {
        console.error('Admin SDK lookup failed:', e)
      }
    }

    // 2) Check profiles for email and phone
    let emailExistsProfiles = false
    let phoneExistsProfiles = false

    if (normEmail) {
      const { count: emailCount, error: emailErr } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('email', normEmail)
      if (emailErr) console.error('profiles email check error:', emailErr)
      emailExistsProfiles = (emailCount ?? 0) > 0
    }

    if (normPhone) {
      const { count: phoneCount, error: phoneErr } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('phone', normPhone)
      if (phoneErr) console.error('profiles phone check error:', phoneErr)
      phoneExistsProfiles = (phoneCount ?? 0) > 0
    }

    const emailTaken = !!(emailExistsAuth || emailExistsProfiles)
    const phoneTaken = !!phoneExistsProfiles

    return new Response(
      JSON.stringify({ emailTaken, phoneTaken, emailExistsAuth, emailExistsProfiles, phoneExistsProfiles }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (err) {
    console.error('check-identity error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
