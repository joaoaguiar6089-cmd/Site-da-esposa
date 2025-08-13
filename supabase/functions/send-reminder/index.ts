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

    // Calcular data de amanhã para buscar agendamentos que precisam de lembrete
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log('Checking appointments for date:', tomorrowStr);

    // Buscar agendamentos de amanhã que ainda estão agendados
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients!appointments_client_id_fkey(nome, sobrenome, celular),
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

    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
    const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error('WhatsApp credentials not configured');
      throw new Error('WhatsApp API credentials not configured');
    }

    const results = [];

    for (const appointment of appointments) {
      try {
        const client = appointment.clients;
        const procedure = appointment.procedures;
        
        // Clean phone number
        const cleanPhone = client.celular.replace(/\D/g, '');
        const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        const appointmentUrl = `https://ejqsaloqrczyfiqljcym.supabase.co/agendamento?cpf=${encodeURIComponent(client.cpf)}`;
        
        const message = `🔔 *Lembrete de Consulta*\n\nOlá ${client.nome}!\n\nEste é um lembrete de que você tem um agendamento AMANHÃ:\n\n📅 Data: ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}\n⏰ Horário: ${appointment.appointment_time}\n💉 Procedimento: ${procedure.name}\n\n📍 Local: Tefé-AM - Av. Brasil, 63b\n\n🔗 *Gerencie seu agendamento:*\n${appointmentUrl}\n\n✅ Confirmar agendamento\n📝 Solicitar alteração\n❌ Cancelar agendamento\n\nObrigado! 🙏`;

        const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { body: message }
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`Reminder sent successfully to ${client.nome} (${client.celular})`);
          results.push({ 
            success: true, 
            client: client.nome, 
            phone: client.celular,
            appointment_id: appointment.id 
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