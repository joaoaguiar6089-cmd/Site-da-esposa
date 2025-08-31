import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting automatic reminder function...');

    // Get reminder settings
    const { data: reminderSettings, error: settingsError } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !reminderSettings) {
      console.log('No active reminder settings found or error:', settingsError);
      return new Response(JSON.stringify({ message: 'No active reminder settings found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Reminder settings loaded:', { 
      time: reminderSettings.reminder_time, 
      active: reminderSettings.is_active 
    });

    // Calculate tomorrow's date in Brazil timezone
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log('Checking appointments for date:', tomorrowStr);

    // Get appointments for tomorrow that are scheduled
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients!appointments_client_id_fkey(nome, sobrenome, celular, cpf),
        procedures!appointments_procedure_id_fkey(name, duration)
      `)
      .eq('appointment_date', tomorrowStr)
      .eq('status', 'agendado');

    if (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }

    console.log(`Found ${appointments?.length || 0} appointments for tomorrow`);

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: 'No appointments found for tomorrow' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if we have WhatsApp credentials
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error('Z-API credentials not configured');
      throw new Error('Z-API credentials not configured');
    }

    const results = [];

    for (const appointment of appointments) {
      try {
        const client = appointment.clients;
        const procedure = appointment.procedures;
        
        // Clean phone number
        const cleanPhone = client.celular.replace(/\D/g, '');
        const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        // Format date for display
        const formattedDate = new Date(appointment.appointment_date).toLocaleDateString('pt-BR');
        
        // Replace variables in template
        let message = reminderSettings.template_content;
        message = message.replace(/{clientName}/g, client.nome);
        message = message.replace(/{clientPhone}/g, client.celular);
        message = message.replace(/{appointmentDate}/g, formattedDate);
        message = message.replace(/{appointmentTime}/g, appointment.appointment_time);
        message = message.replace(/{procedureName}/g, procedure.name);
        message = message.replace(/{notes}/g, appointment.notes || '');

        console.log(`Sending reminder to ${client.nome} (${client.celular})`);

        // Send WhatsApp message using Z-API
        const response = await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phoneNumber,
            message: message
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`Reminder sent successfully to ${client.nome} (${client.celular})`);
          results.push({ 
            success: true, 
            client: client.nome, 
            phone: client.celular,
            appointment_id: appointment.id,
            message_id: data.messageId || data.id
          });
        } else {
          console.error(`Failed to send reminder to ${client.nome}:`, data);
          results.push({ 
            success: false, 
            client: client.nome, 
            phone: client.celular,
            error: data.error?.message || 'Unknown error',
            appointment_id: appointment.id 
          });
        }
      } catch (error) {
        console.error(`Error sending reminder for appointment ${appointment.id}:`, error);
        results.push({ 
          success: false, 
          appointment_id: appointment.id,
          error: error.message 
        });
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${appointments.length} reminders`,
      results: results 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-reminder function:', error);
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