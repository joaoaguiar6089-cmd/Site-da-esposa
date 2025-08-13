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
    console.log('=== SIMPLE Z-API TEST ===');
    
    // Fixed values for testing
    const INSTANCE_ID = '3E5A81BACD2BF05A4EA8FEB4B7E03144';
    const TOKEN = '858B2CDA86812E5804947A22';
    const CLIENT_TOKEN = 'Fa3cbd2c46f99489eb361d6ccd87960efS'; // Security token
    const TEST_PHONE = '5551997080499';
    const TEST_MESSAGE = 'Teste simples Z-API';

    console.log('Test values:', {
      instanceId: INSTANCE_ID,
      token: TOKEN,
      phone: TEST_PHONE,
      message: TEST_MESSAGE
    });

    const requestBody = {
      phone: TEST_PHONE,
      message: TEST_MESSAGE
    };

    const apiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;
    
    console.log('Making request to:', apiUrl);
    console.log('Request body:', requestBody);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': CLIENT_TOKEN, // Token de segurança correto
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);

    const responseText = await response.text();
    console.log('Response body (raw):', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { raw: responseText };
    }

    console.log('Response data (parsed):', data);

    return new Response(JSON.stringify({ 
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: data,
      testInfo: {
        instanceId: INSTANCE_ID,
        token: TOKEN,
        phone: TEST_PHONE,
        apiUrl: apiUrl
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in simple test:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);