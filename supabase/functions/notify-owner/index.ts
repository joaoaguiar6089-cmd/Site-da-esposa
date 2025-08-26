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
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, clientName, clientPhone, appointmentDate, appointmentTime, procedureName, professionalName, notes }: NotificationRequest = await req.json();

    console.log('=== Owner Notification Function Called ===');
    console.log('Notification type:', type);
    console.log('Client details:', { clientName, clientPhone });
    console.log('Raw appointmentDate received:', appointmentDate);

    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    const OWNER_PHONE = '92986149271'; // Número da proprietária (sem prefixo 55)

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error('Z-API credentials not configured');
      throw new Error('Z-API credentials not configured');
    }

    console.log('Environment check:', {
      hasInstanceId: !!ZAPI_INSTANCE_ID,
      hasToken: !!ZAPI_TOKEN,
      instanceIdLength: ZAPI_INSTANCE_ID?.length,
      tokenLength: ZAPI_TOKEN?.length,
      ownerPhone: OWNER_PHONE
    });

    let templateType = '';
    
    switch (type) {
      case 'agendamento':
        templateType = 'agendamento_proprietaria';
        break;
      case 'alteracao':
        templateType = 'alteracao_proprietaria';
        break;
      case 'cancelamento':
        templateType = 'cancelamento_proprietaria';
        break;
    }

    // Debug: Log raw date received
    console.log('=== DEBUGGING DATE ISSUE ===');
    console.log('Raw appointmentDate type:', typeof appointmentDate);
    console.log('Raw appointmentDate value:', appointmentDate);
    console.log('Raw appointmentDate as JSON:', JSON.stringify(appointmentDate));
    
    // Check if it's already a Date object or string
    let dateString = appointmentDate;
    if (appointmentDate instanceof Date) {
      console.log('appointmentDate is a Date object, converting to ISO string');
      dateString = appointmentDate.toISOString().split('T')[0];
    }
    
    // Format date correctly to avoid timezone issues
    const dateComponents = dateString.split('-');
    const formattedDate = `${dateComponents[2]}/${dateComponents[1]}/${dateComponents[0]}`;
    console.log('Date formatting detailed:', { 
      originalDate: appointmentDate,
      dateString: dateString,
      dateComponents, 
      formattedDate 
    });
    const notesText = notes ? `\n📝 Observações: ${notes}` : '';

    // Get template and format message
    const getTemplateResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-whatsapp-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        templateType,
        variables: {
          clientName,
          clientPhone,
          appointmentDate: formattedDate,
          appointmentTime,
          procedureName,
          notes: notesText
        }
      }),
    });

    const templateResult = await getTemplateResponse.json();
    console.log('Template result:', templateResult);
    const message = templateResult.message || `Notificação de ${type}: ${clientName} - ${procedureName}`;
    console.log('Final message to send:', message);

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