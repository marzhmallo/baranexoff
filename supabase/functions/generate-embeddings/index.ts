import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableName, brgyid } = await req.json();
    if (!tableName) throw new Error("tableName is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build query based on table and brgyid
    let query = supabaseAdmin
      .from(tableName)
      .select('*')
      .is('embedding', null);

    if (brgyid) {
      query = query.eq('brgyid', brgyid);
    }

    const { data: records, error } = await query;
    if (error) throw error;

    console.log(`Processing ${records?.length || 0} records from ${tableName}`);

    let processed = 0;
    let errors = 0;

    if (records && records.length > 0) {
      for (const record of records) {
        try {
          let inputText = '';
          
          // Create optimized text for semantic search
          switch (tableName) {
            case 'residents':
              inputText = `Resident: ${record.first_name || ''} ${record.last_name || ''}. 
                          Nickname: ${record.nickname || 'None'}. 
                          Purok: ${record.purok || 'Unknown'}. 
                          Address: ${record.address || 'Unknown'}. 
                          Contact: ${record.mobile_number || 'None'}. 
                          Birthdate: ${record.birthdate || 'Unknown'}.`;
              break;
              
            case 'announcements':
              inputText = `Announcement: ${record.title || 'No title'}. 
                          Content: ${record.content || 'No content'}. 
                          Category: ${record.category || 'General'}. 
                          Visibility: ${record.visibility || 'Public'}.`;
              break;
              
            case 'docrequests':
              inputText = `Document Request: ${record.type || 'Unknown type'}. 
                          Number: ${record.docnumber || 'No number'}. 
                          Status: ${record.status || 'Unknown'}. 
                          Purpose: ${record.purpose || 'Unknown'}. 
                          Receiver: ${record.receiver?.name || 'Unknown'}.`;
              break;
              
            case 'events':
              inputText = `Event: ${record.title || 'No title'}. 
                          Date: ${record.start_time || 'Unknown'}. 
                          Location: ${record.location || 'Unknown'}. 
                          Description: ${record.description || 'No description'}. 
                          Type: ${record.event_type || 'Unknown'}.`;
              break;
              
            case 'households':
              inputText = `Household: ${record.name || 'Unknown'}. 
                          Address: ${record.address || 'Unknown'}. 
                          Purok: ${record.purok || 'Unknown'}. 
                          Head of Family: ${record.headname || 'Unknown'}.`;
              break;
              
            default:
              console.log(`Skipping unconfigured table: ${tableName}`);
              continue;
          }

          // Generate embedding
          const res = await fetch(EMBEDDING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: "models/text-embedding-004",
              content: { 
                parts: [{ text: inputText }] 
              }
            }),
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error(`Embedding failed for ${tableName} ID ${record.id}:`, errorText);
            errors++;
            continue;
          }
          
          const data = await res.json();
          const embedding = data.embedding?.values;

          if (!embedding) {
            console.error(`No embedding returned for ${tableName} ID ${record.id}`);
            errors++;
            continue;
          }

          // Update record with embedding
          const { error: updateError } = await supabaseAdmin
            .from(tableName)
            .update({ embedding: embedding })
            .eq('id', record.id);

          if (updateError) {
            console.error(`Update failed for ${tableName} ID ${record.id}:`, updateError);
            errors++;
          } else {
            processed++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (recordError) {
          console.error(`Error processing record ${record.id}:`, recordError);
          errors++;
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed, 
      errors,
      table: tableName,
      brgyid: brgyid 
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (e) {
    console.error('Generate embeddings function error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});