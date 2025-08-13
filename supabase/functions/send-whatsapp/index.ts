import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  to: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Z-API WhatsApp Function Called ===');
    
    let ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    console.log('Environment check:', {
      hasInstanceId: !!ZAPI_INSTANCE_ID,
      hasToken: !!ZAPI_TOKEN,
      instanceIdLength: ZAPI_INSTANCE_ID?.length || 0,
      tokenLength: ZAPI_TOKEN?.length || 0
    });

    // Extract instance ID if full URL was provided
    if (ZAPI_INSTANCE_ID?.includes('instances/')) {
      const match = ZAPI_INSTANCE_ID.match(/instances\/([^\/]+)/);
      if (match) {
        ZAPI_INSTANCE_ID = match[1];
        console.log('Extracted instance ID from URL:', ZAPI_INSTANCE_ID);
      }
    }

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error('Missing Z-API credentials');
      throw new Error('Z-API credentials not configured');
    }

    const { to, message }: WhatsAppRequest = await req.json();

    console.log('Received WhatsApp request:', { originalNumber: to, message: message.substring(0, 50) + '...' });

    // Format phone number for Z-API (Brazilian format with country code)
    const cleanPhone = to.replace(/\D/g, '');
    console.log('Cleaned phone number:', cleanPhone);
    
    // Ensure phone number has Brazilian country code (55)
    let phoneNumber = cleanPhone;
    if (!cleanPhone.startsWith('55')) {
      phoneNumber = `55${cleanPhone}`;
    }
    
    // Validate phone number format (must be 12 or 13 digits for Brazilian numbers)
    if (phoneNumber.length < 12 || phoneNumber.length > 13) {
      console.error('Invalid phone number format:', { original: to, cleaned: cleanPhone, formatted: phoneNumber });
      throw new Error(`Formato de telefone inválido: ${to}. Use o formato (XX) XXXXX-XXXX`);
    }
    
    console.log('Final formatted phone number:', phoneNumber);

    // Request body as per Z-API documentation
    const requestBody = {
      phone: phoneNumber,
      message: message
    };

    // Z-API endpoint as per official documentation
    const apiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    console.log('Sending Z-API request:', {
      url: apiUrl,
      body: requestBody,
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': '[REDACTED]'
      }
    });

    // Make request with Client-Token header as required by Z-API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': 'Fa3cbd2c46f99489eb361d6ccd87960efS', // Token de segurança Z-API
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log('Z-API response:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });
    
    if (!response.ok) {
      console.error('Z-API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: data,
        requestBody: requestBody,
        apiUrl: apiUrl
      });
      throw new Error(`Z-API error (${response.status}): ${data.error || data.message || JSON.stringify(data)}`);
    }

    // Log successful delivery details
    const messageId = data.messageId;
    const zaapId = data.zaapId;
    
    console.log('WhatsApp message sent successfully via Z-API:', {
      messageId,
      zaapId,
      originalNumber: to,
      formattedNumber: phoneNumber,
      deliveryStatus: 'sent'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        messageId,
        zaapId,
        ...data
      },
      debug: {
        originalNumber: to,
        formattedNumber: phoneNumber,
        messageId: data.messageId,
        zaapId: data.zaapId,
        provider: 'Z-API'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-whatsapp function:', error);
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