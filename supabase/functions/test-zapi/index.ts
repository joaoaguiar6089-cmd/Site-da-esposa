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
    console.log('=== Z-API Test Function Called ===');
    
    let ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    console.log('Raw environment variables:', {
      ZAPI_INSTANCE_ID: ZAPI_INSTANCE_ID,
      ZAPI_TOKEN: ZAPI_TOKEN,
      hasInstanceId: !!ZAPI_INSTANCE_ID,
      hasToken: !!ZAPI_TOKEN,
    });

    // Extract instance ID if full URL was provided
    if (ZAPI_INSTANCE_ID?.includes('instances/')) {
      const match = ZAPI_INSTANCE_ID.match(/instances\/([^\/]+)/);
      if (match) {
        const extractedId = match[1];
        console.log('Extracted instance ID from URL:', { original: ZAPI_INSTANCE_ID, extracted: extractedId });
        ZAPI_INSTANCE_ID = extractedId;
      }
    }

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error('Missing Z-API credentials');
      return new Response(JSON.stringify({ 
        error: 'Z-API credentials not configured',
        debug: {
          hasInstanceId: !!ZAPI_INSTANCE_ID,
          hasToken: !!ZAPI_TOKEN,
          instanceIdValue: ZAPI_INSTANCE_ID ? 'present' : 'missing',
          tokenValue: ZAPI_TOKEN ? 'present' : 'missing'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test 1: Check instance status
    const statusUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/status`;
    console.log('Testing instance status with URL:', statusUrl);

    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const statusData = await statusResponse.json();
    console.log('Status check response:', {
      status: statusResponse.status,
      statusText: statusResponse.statusText,
      data: statusData
    });

    // Test 2: Try sending a simple message
    const testPhone = '5551997080499';
    const testMessage = 'Teste de configuração Z-API';
    
    const sendUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
    console.log('Testing message send with URL:', sendUrl);
    
    const requestBody = {
      phone: testPhone,
      message: testMessage
    };

    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const sendData = await sendResponse.json();
    console.log('Send message response:', {
      status: sendResponse.status,
      statusText: sendResponse.statusText,
      data: sendData
    });

    return new Response(JSON.stringify({ 
      success: true,
      statusCheck: {
        status: statusResponse.status,
        data: statusData
      },
      sendTest: {
        status: sendResponse.status,
        data: sendData
      },
      debug: {
        instanceId: ZAPI_INSTANCE_ID,
        tokenPresent: !!ZAPI_TOKEN,
        statusUrl,
        sendUrl
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in test-zapi function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        name: error.name
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);