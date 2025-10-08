import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId, idType, files } = await req.json()
    if (!userId || !Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const results: Array<{ path: string; url: string | null }> = []

    for (const f of files as Array<{ name: string; type?: string; b64: string }>) {
      const ext = (f.name?.split('.')?.pop() || 'jpg').toLowerCase()
      const filename = `${crypto.randomUUID()}.${ext}`
      const path = `dis/${userId}/${filename}`
      const bytes = b64ToBytes(f.b64)
      const contentType = f.type || 'image/jpeg'

      const { error: upErr } = await supabase.storage
        .from('usersdis')
        .upload(path, bytes, { contentType, upsert: false, cacheControl: '3600' })

      if (upErr) {
        console.error('Upload error:', upErr)
        return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
      }

      const { data: pub } = supabase.storage.from('usersdis').getPublicUrl(path)
      results.push({ path, url: pub?.publicUrl || null })
    }

    // Insert metadata into docx table using service role (bypasses RLS)
    try {
      if (results.length > 0) {
        const payload = results.map((r) => ({
          userid: userId,
          resid: null,
          document_type: idType || 'User ID',
          file_path: r.path,
          notes: null,
        }))
        const { error: insertErr } = await supabase.from('docx').insert(payload)
        if (insertErr) {
          console.error('docx insert error:', insertErr)
          // Continue returning upload results even if DB insert fails
        }
      }
    } catch (e) {
      console.error('docx insert unexpected error:', e)
    }

    return new Response(JSON.stringify({ uploaded: results, idType: idType || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
