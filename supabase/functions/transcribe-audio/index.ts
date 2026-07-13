import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // --- Authenticate caller ---
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const callerId = claimsData?.claims?.sub as string | undefined;
    if (claimsError || !callerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { audioUrl, messageId } = await req.json();
    if (!audioUrl || !messageId || typeof audioUrl !== 'string' || typeof messageId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing audioUrl or messageId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Validate audioUrl points to our own storage (chat-voices / chat-media) ---
    let parsed: URL;
    try { parsed = new URL(audioUrl); } catch {
      return new Response(JSON.stringify({ error: 'Invalid audioUrl' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const expectedHost = new URL(supabaseUrl).host;
    const isOwnStorage =
      parsed.host === expectedHost &&
      parsed.pathname.startsWith('/storage/v1/object/') &&
      (parsed.pathname.includes('/chat-voices/') || parsed.pathname.includes('/chat-media/'));
    if (!isOwnStorage) {
      return new Response(JSON.stringify({ error: 'audioUrl not allowed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Verify caller is a participant of the message's conversation ---
    const { data: msg, error: msgErr } = await admin
      .from('messages')
      .select('id, conversation_id, sender_id, conversations!inner(participant1_id, participant2_id)')
      .eq('id', messageId)
      .single();
    if (msgErr || !msg) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const conv: any = (msg as any).conversations;
    if (conv?.participant1_id !== callerId && conv?.participant2_id !== callerId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio file');
    }
    const audioBlob = await audioResponse.blob();
    const audioBase64 = await blobToBase64(audioBlob);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Please transcribe this audio message. Return ONLY the transcribed text, nothing else. If the audio is unclear or empty, respond with '[Unable to transcribe]'. If there's no speech, respond with '[No speech detected]'." },
              { type: "input_audio", input_audio: { data: audioBase64, format: "wav" } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error: ' + errorText);
    }

    const data = await response.json();
    const transcription = data.choices?.[0]?.message?.content?.trim() || '[Unable to transcribe]';

    const { error: updateError } = await admin
      .from('messages')
      .update({ transcription })
      .eq('id', messageId);

    if (updateError) {
      console.error('Failed to update message:', updateError);
      throw new Error('Failed to save transcription');
    }

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
