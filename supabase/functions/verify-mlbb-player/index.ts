import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyRequest {
  player_id: string;
  server_id: string;
}

interface VerifyResponse {
  found: boolean;
  player_name?: string;
  player_id?: string;
  server_id?: string;
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (userLimit.count >= 10) { // Max 10 requests per minute
    return false;
  }
  
  userLimit.count++;
  return true;
}

function validatePlayerId(playerId: string): boolean {
  // Validate: alphanumeric, min 3 chars, max 20 chars
  const pattern = /^[a-zA-Z0-9]{3,20}$/;
  return pattern.test(playerId);
}

function validateServerId(serverId: string): boolean {
  // Validate: numeric, 1-5 digits
  const pattern = /^[0-9]{1,5}$/;
  return pattern.test(serverId);
}

async function verifyMLBBPlayer(playerId: string, serverId: string): Promise<VerifyResponse> {
  // In production, this would call the actual Mobile Legends API
  // For now, we'll simulate the verification with mock data
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock verification logic - in production replace with actual MLBB API call
  // Example: const response = await fetch(`https://mlbb-api.example.com/verify`, {...});
  
  const mockPlayers: Record<string, string> = {
    '123456': 'DarkKnight',
    '789012': 'ShadowHunter',
    '345678': 'MysticMage',
    '901234': 'SwiftBlade',
  };
  
  const playerName = mockPlayers[playerId];
  
  if (playerName) {
    return {
      found: true,
      player_name: playerName,
      player_id: playerId,
      server_id: serverId,
    };
  }
  
  return { found: false };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body: VerifyRequest = await req.json();
    const { player_id, server_id } = body;

    // Validate inputs
    if (!player_id || !server_id) {
      return new Response(
        JSON.stringify({ error: 'Player ID and Server ID are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Sanitize and validate
    const sanitizedPlayerId = player_id.trim();
    const sanitizedServerId = server_id.trim();

    if (!validatePlayerId(sanitizedPlayerId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Player ID format. Must be 3-20 alphanumeric characters.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!validateServerId(sanitizedServerId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Server ID format. Must be numeric.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Verifying MLBB player: ${sanitizedPlayerId} on server: ${sanitizedServerId}`);

    // Verify player
    const result = await verifyMLBBPlayer(sanitizedPlayerId, sanitizedServerId);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-mlbb-player:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
