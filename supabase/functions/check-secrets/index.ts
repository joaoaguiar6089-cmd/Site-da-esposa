import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Checking Supabase Secrets ===');
    
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    console.log('Raw secret values:', {
      ZAPI_INSTANCE_ID_exists: !!ZAPI_INSTANCE_ID,
      ZAPI_INSTANCE_ID_value: ZAPI_INSTANCE_ID,
      ZAPI_INSTANCE_ID_length: ZAPI_INSTANCE_ID?.length || 0,
      ZAPI_TOKEN_exists: !!ZAPI_TOKEN,
      ZAPI_TOKEN_value: ZAPI_TOKEN,
      ZAPI_TOKEN_length: ZAPI_TOKEN?.length || 0,
    });

    // Test what we should have vs what we actually have
    const expectedInstanceId = '3E5A81BACD2BF05A4EA8FEB4B7E03144';
    const expectedToken = '858B2CDA86812E5804947A22';

    const comparison = {
      instanceId: {
        expected: expectedInstanceId,
        actual: ZAPI_INSTANCE_ID,
        matches: ZAPI_INSTANCE_ID === expectedInstanceId,
        actualLength: ZAPI_INSTANCE_ID?.length || 0,
        expectedLength: expectedInstanceId.length
      },
      token: {
        expected: expectedToken,
        actual: ZAPI_TOKEN,
        matches: ZAPI_TOKEN === expectedToken,
        actualLength: ZAPI_TOKEN?.length || 0,
        expectedLength: expectedToken.length
      }
    };

    console.log('Secret comparison:', comparison);

    return new Response(JSON.stringify({ 
      success: true,
      secrets: {
        ZAPI_INSTANCE_ID: ZAPI_INSTANCE_ID,
        ZAPI_TOKEN: ZAPI_TOKEN,
      },
      comparison: comparison,
      message: 'Check console logs for detailed secret values'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error checking secrets:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);