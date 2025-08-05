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
    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
    const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
      throw new Error('WhatsApp API credentials not configured');
    }

    const { to, message }: WhatsAppRequest = await req.json();

    console.log('Received WhatsApp request:', { originalNumber: to, message: message.substring(0, 50) + '...' });

    // Enhanced phone number formatting
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
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: { body: message }
    };

    console.log('Sending WhatsApp API request:', {
      url: `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`,
      body: requestBody
    });

    const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data: WhatsAppResponse = await response.json();
    
    console.log('WhatsApp API response:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });
    
    if (!response.ok) {
      console.error('WhatsApp API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: data,
        requestBody: requestBody
      });
      throw new Error(`WhatsApp API error (${response.status}): ${data.error?.message || 'Unknown error'}`);
    }

    // Log successful delivery details
    const messageId = data.messages?.[0]?.id;
    const waId = data.contacts?.[0]?.wa_id;
    
    console.log('WhatsApp message sent successfully:', {
      messageId,
      waId,
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
        messageId: data.messages?.[0]?.id,
        waId: data.contacts?.[0]?.wa_id
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