import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  to: string;
  message: string;
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      throw new Error('Z-API credentials not configured');
    }

    const { to, message }: WhatsAppRequest = await req.json();

    console.log('Received WhatsApp request:', { originalNumber: to, message: message.substring(0, 50) + '...' });

    // Enhanced phone number formatting for Z-API
    const cleanPhone = to.replace(/\D/g, '');
    console.log('Cleaned phone number:', cleanPhone);
    
    // Format phone number for Brazil (+55)
    let phoneNumber = cleanPhone;
    if (!cleanPhone.startsWith('55')) {
      phoneNumber = `55${cleanPhone}`;
    }
    
    // Validate phone number format
    if (phoneNumber.length < 12 || phoneNumber.length > 13) {
      console.error('Invalid phone number format:', { original: to, cleaned: cleanPhone, formatted: phoneNumber });
      throw new Error(`Formato de telefone inválido: ${to}. Use o formato (XX) XXXXX-XXXX`);
    }
    
    console.log('Final formatted phone number:', phoneNumber);

    const requestBody = {
      phone: phoneNumber,
      message: message
    };

    const apiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    console.log('Sending Z-API request:', {
      url: apiUrl,
      body: requestBody
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        requestBody: requestBody
      });
      throw new Error(`Z-API error (${response.status}): ${data.error?.message || data.message || 'Unknown error'}`);
    }

    // Log successful delivery details
    const messageId = data.messageId;
    
    console.log('WhatsApp message sent successfully via Z-API:', {
      messageId,
      originalNumber: to,
      formattedNumber: phoneNumber,
      deliveryStatus: 'sent'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      debug: {
        originalNumber: to,
        formattedNumber: phoneNumber,
        messageId: data.messageId,
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