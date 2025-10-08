import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userRole, brgyid } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!brgyid) {
      return new Response(JSON.stringify({ error: 'brgyid is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing ALLAN query:', { query, userRole, brgyid });

    // 1. Generate embedding for the user's query
    const embeddingResponse = await fetch(EMBEDDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: query }] }
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API failed: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding?.values;

    if (!queryEmbedding) {
      throw new Error('No embedding returned from API');
    }

    // 2. Perform semantic search using existing function
    const { data: searchResults, error: searchError } = await supabaseAdmin.rpc('semantic_search_all', {
      query_embedding: queryEmbedding,
      brgyid_filter: brgyid,
      match_threshold: 0.6,
      match_count: 8
    });

    if (searchError) {
      console.error('Semantic search error:', searchError);
      throw searchError;
    }

    console.log('Search results found:', searchResults?.length || 0);

    // 3. Prepare context for Gemini
    let context = 'No relevant information found in database.';
    
    if (searchResults && searchResults.length > 0) {
      context = searchResults.map((result: any) => {
        switch (result.entity_type) {
          case 'resident':
            return `RESIDENT: ${result.display_name}
- Purok: ${result.metadata.purok || 'Unknown'}
- Address: ${result.metadata.address || 'Unknown'}
- Contact: ${result.metadata.mobile_number || 'None'}
- Barangay: ${result.metadata.barangay || 'Unknown'}
- Relevance: ${(result.relevance * 100).toFixed(1)}%`;

          case 'announcement':
            return `ANNOUNCEMENT: ${result.display_name}
- Content: ${result.metadata.content}
- Visibility: ${result.metadata.visibility}
- Posted: ${new Date(result.metadata.created_at).toLocaleDateString()}
- Relevance: ${(result.relevance * 100).toFixed(1)}%`;

          case 'document':
            return `DOCUMENT: ${result.display_name}
- Status: ${result.metadata.status}
- Type: ${result.metadata.type}
- Receiver: ${result.metadata.receiver}
- Created: ${new Date(result.metadata.created_at).toLocaleDateString()}
- Relevance: ${(result.relevance * 100).toFixed(1)}%`;

          case 'event':
            return `EVENT: ${result.display_name}
- Date: ${new Date(result.metadata.start_time).toLocaleDateString()}
- Location: ${result.metadata.location}
- Description: ${result.metadata.description}
- Visibility: ${result.metadata.visibility}
- Relevance: ${(result.relevance * 100).toFixed(1)}%`;

          case 'household':
            return `HOUSEHOLD: ${result.display_name}
- Address: ${result.metadata.address}
- Purok: ${result.metadata.PUROK}
- Head of Family: ${result.metadata.head_of_family}
- Relevance: ${(result.relevance * 100).toFixed(1)}%`;

          default:
            return `${result.entity_type.toUpperCase()}: ${result.display_name}
- Relevance: ${(result.relevance * 100).toFixed(1)}%`;
        }
      }).join('\n\n');
    }

    // 4. Generate final response using Gemini
    const prompt = `You are ALLAN (Automated Learning Live Artificial Neurointelligence), the AI assistant for Baranex barangay management system.

USER QUERY: "${query}"
USER ROLE: ${userRole || 'user'}
BARANGAY ID: ${brgyid}

SEARCH RESULTS FROM DATABASE:
${context}

INSTRUCTIONS:
- Provide helpful, accurate information based on the search results above
- If no relevant results found, politely inform the user and suggest alternatives
- Be conversational but professional
- If multiple results found, summarize the most relevant ones
- For residents, offer to provide more details if available
- For documents, clearly state the status
- For events/announcements, highlight key details
- Always maintain data privacy and only share appropriate information for the user's role
- Keep responses concise and focused

RESPONSE:`;

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API failed: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    const finalAnswer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
                       'I apologize, but I encountered an error generating a response.';

    return new Response(JSON.stringify({
      response: finalAnswer,
      searchResults: searchResults?.map((r: any) => ({
        type: r.entity_type,
        name: r.display_name,
        relevance: Math.round(r.relevance * 100)
      })) || [],
      totalResults: searchResults?.length || 0,
      source: 'allan_semantic'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('ALLAN-core error:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      response: "I'm experiencing technical difficulties. Please try again in a moment.",
      source: 'allan_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});