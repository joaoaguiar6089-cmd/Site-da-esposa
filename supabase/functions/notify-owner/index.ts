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
    console.log('=== Owner Notification Function Started ===');
    
    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
    const { type, clientName, clientPhone, appointmentDate, appointmentTime, procedureName, professionalName, notes }: NotificationRequest = requestBody;

    console.log('=== Owner Notification Function Called ===');
    console.log('Notification type:', type);
    console.log('Client details:', { clientName, clientPhone });
    console.log('Raw appointmentDate received:', appointmentDate);

    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    
    console.log('Environment variables check:', {
      hasInstanceId: !!ZAPI_INSTANCE_ID,
      hasToken: !!ZAPI_TOKEN,
      supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      supabaseKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    });
    
    // Get owner phone from database settings
    console.log('Fetching owner phone from database...');
    const ownerPhoneResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/notification_settings?setting_key=eq.owner_phone&select=setting_value`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
      },
    });
    
    console.log('Owner phone response status:', ownerPhoneResponse.status);
    
    if (!ownerPhoneResponse.ok) {
      console.error('Failed to fetch owner phone:', await ownerPhoneResponse.text());
      throw new Error(`Failed to fetch owner phone: ${ownerPhoneResponse.status}`);
    }
    
    const ownerPhoneData = await ownerPhoneResponse.json();
    console.log('Owner phone data:', ownerPhoneData);
    
    const OWNER_PHONE = ownerPhoneData?.[0]?.setting_value || '5597984387295'; // Fallback para o número da proprietária
    console.log('Owner phone to use:', OWNER_PHONE);

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

    // Format date consistently to Brazilian format (DD/MM/YYYY)
    const formatDateToBrazil = (dateString: string): string => {
      if (!dateString) return '';
      
      try {
        // If date is in YYYY-MM-DD format, convert to DD/MM/YYYY
        if (dateString.includes('-') && dateString.length === 10) {
          const [year, month, day] = dateString.split('-');
          if (year && month && day) {
            return `${day}/${month}/${year}`;
          }
        }
        return dateString;
      } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
      }
    };
    
    const formattedDate = formatDateToBrazil(appointmentDate);
    
    console.log('Date formatting:', { 
      originalDate: appointmentDate, 
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

    const zapiRequestBody = {
      phone: OWNER_PHONE,
      message: message
    };

    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    console.log('Sending Z-API request:', {
      url,
      body: zapiRequestBody,
      headers: { 'Content-Type': 'application/json', 'Client-Token': '[REDACTED]' }
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': 'Fa3cbd2c46f99489eb361d6ccd87960efS' // Token de segurança Z-API (mesmo usado em send-whatsapp)
      },
      body: JSON.stringify(zapiRequestBody)
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