import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaEventRequest {
  event_name: string;
  event_data?: Record<string, any>;
  user_data?: {
    em?: string; // email (hashed)
    ph?: string; // phone (hashed)
    fn?: string; // first name (hashed)
    ln?: string; // last name (hashed)
    ct?: string; // city (hashed)
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
    const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID');
    const API_VERSION = 'v21.0'; // Meta Graph API version

    if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
      throw new Error('META_ACCESS_TOKEN or META_PIXEL_ID not configured');
    }

    const { event_name, event_data = {}, user_data = {} }: MetaEventRequest = await req.json();

    if (!event_name) {
      throw new Error('event_name is required');
    }

    // Build the Meta Pixel event payload
    const eventPayload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: event_data.source_url || 'https://ejqsaloqrczyfiqljcym.supabase.co',
          user_data: {
            client_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            client_user_agent: req.headers.get('user-agent') || 'unknown',
            ...user_data,
          },
          custom_data: event_data,
        },
      ],
    };

    console.log('Sending event to Meta Pixel:', JSON.stringify(eventPayload));

    // Send event to Meta Conversion API
    const metaUrl = `https://graph.facebook.com/${API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;
    
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    const responseData = await response.json();
    console.log('Meta API response:', JSON.stringify(responseData));

    if (!response.ok) {
      throw new Error(`Meta API error: ${JSON.stringify(responseData)}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event sent successfully',
        meta_response: responseData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending Meta event:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
