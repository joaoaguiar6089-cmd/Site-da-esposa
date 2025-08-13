import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'agendamento' | 'alteracao' | 'cancelamento';
  clientName: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  procedureName: string;
  professionalName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, clientName, clientPhone, appointmentDate, appointmentTime, procedureName, professionalName }: NotificationRequest = await req.json();

    console.log('=== Owner Notification Function Called ===');
    console.log('Notification type:', type);
    console.log('Client details:', { clientName, clientPhone });

    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    const OWNER_PHONE = '5592986149271'; // Número da proprietária

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error('Z-API credentials not configured');
      throw new Error('Z-API credentials not configured');
    }

    console.log('Environment check:', {
      hasInstanceId: !!ZAPI_INSTANCE_ID,
      hasToken: !!ZAPI_TOKEN,
      instanceIdLength: ZAPI_INSTANCE_ID?.length,
      tokenLength: ZAPI_TOKEN?.length
    });

    let messageIcon = '';
    let actionText = '';
    
    switch (type) {
      case 'agendamento':
        messageIcon = '📅';
        actionText = 'NOVO AGENDAMENTO';
        break;
      case 'alteracao':
        messageIcon = '📝';
        actionText = 'AGENDAMENTO ALTERADO';
        break;
      case 'cancelamento':
        messageIcon = '❌';
        actionText = 'AGENDAMENTO CANCELADO';
        break;
    }

    const formattedDate = new Date(appointmentDate).toLocaleDateString('pt-BR');
    const professionalInfo = professionalName ? `\n👩‍⚕️ Profissional: ${professionalName}` : '';

    const message = `${messageIcon} *${actionText}*\n\n👤 Cliente: ${clientName}\n📱 Telefone: ${clientPhone}\n📅 Data: ${formattedDate}\n⏰ Horário: ${appointmentTime}\n💉 Procedimento: ${procedureName}${professionalInfo}\n\n📍 Clínica Dra. Karoline Ferreira\nTefé-AM`;

    const requestBody = {
      phone: OWNER_PHONE,
      message: message
    };

    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    console.log('Sending Z-API request:', {
      url,
      body: requestBody,
      headers: { 'Content-Type': 'application/json', 'Client-Token': '[REDACTED]' }
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_TOKEN
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log('Z-API response:', {
      status: response.status,
      statusText: response.statusText,
      data
    });

    if (response.ok) {
      console.log('Owner notification sent successfully via Z-API:', {
        messageId: data.id || data.messageId,
        zaapId: data.zaapId,
        type: type,
        client: clientName,
        deliveryStatus: 'sent'
      });

      return new Response(JSON.stringify({
        success: true,
        messageId: data.id || data.messageId,
        zaapId: data.zaapId,
        type: type,
        client: clientName
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.error('Failed to send owner notification:', data);
      throw new Error(data.error?.message || `Z-API error: ${response.status}`);
    }

  } catch (error: any) {
    console.error('Error in notify-owner function:', error);
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