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

    console.log('🚀 Starting automatic reminder function...');

    // Buscar configurações de lembrete
    const { data: reminderSettings, error: settingsError } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !reminderSettings) {
      console.log('❌ No active reminder settings found:', settingsError?.message);
      return new Response(JSON.stringify({ 
        success: false,
        message: 'No active reminder settings found',
        error: settingsError?.message 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Reminder settings loaded:', { 
      time: reminderSettings.reminder_time, 
      active: reminderSettings.is_active 
    });

    // --- Melhor gestão de fuso horário ---
    // Usar Intl para fuso horário de Brasília
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    console.log('🕐 Current time (Brasília):', brasiliaTime.toISOString());
    
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();
    
    const [reminderHour, reminderMinute] = reminderSettings.reminder_time.split(':').map(Number);

    console.log(`⏰ Time check - Current: ${currentHour}:${String(currentMinute).padStart(2, '0')}, Configured: ${reminderHour}:${String(reminderMinute).padStart(2, '0')}`);

    // --- Verificação de horário mais flexível (janela de 5 minutos) ---
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const reminderTotalMinutes = reminderHour * 60 + reminderMinute;
    const timeDifference = Math.abs(currentTotalMinutes - reminderTotalMinutes);

    if (timeDifference > 5) { // 5 minutos de tolerância
      console.log(`⏳ Not time yet. Time difference: ${timeDifference} minutes`);
      return new Response(JSON.stringify({ 
        success: false,
        message: `Not time yet. Current: ${currentHour}:${String(currentMinute).padStart(2, '0')}, Configured: ${reminderHour}:${String(reminderMinute).padStart(2, '0')}`,
        timeDifference: timeDifference
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Time check passed - sending reminders...');

    // Calcular data de amanhã usando o fuso horário correto
    const tomorrow = new Date(brasiliaTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log('📅 Checking appointments for date:', tomorrowStr);

    // --- Verificar se já enviou lembretes hoje ---
    const todayStr = brasiliaTime.toISOString().split('T')[0];
    
    const { data: sentToday, error: sentTodayError } = await supabase
      .from('reminder_logs')
      .select('client_phone')
      .eq('sent_date', todayStr)
      .eq('appointment_date', tomorrowStr);

    if (sentTodayError) {
      console.error('Error checking sent reminders:', sentTodayError);
    }

    const alreadySentPhones = new Set((sentToday || []).map(log => log.client_phone));
    console.log(`📝 Already sent reminders today to ${alreadySentPhones.size} phones`);

    // Buscar agendamentos para amanhã
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients!appointments_client_id_fkey(nome, sobrenome, celular, cpf),
        procedures!appointments_procedure_id_fkey(name, duration)
      `)
      .eq('appointment_date', tomorrowStr)
      .in('status', ['agendado', 'confirmado']);

    if (error) {
      console.error('❌ Error fetching appointments:', error);
      throw error;
    }

    console.log(`📋 Found ${appointments?.length || 0} appointments for tomorrow`);

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No appointments found for tomorrow',
        appointmentsCount: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filtrar agendamentos que ainda não receberam lembrete
    const appointmentsToRemind = appointments.filter(appointment => {
      const cleanPhone = appointment.clients.celular.replace(/\D/g, '');
      return !alreadySentPhones.has(cleanPhone);
    });

    console.log(`📲 Will send reminders to ${appointmentsToRemind.length} clients (${appointments.length - appointmentsToRemind.length} already sent today)`);

    if (appointmentsToRemind.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'All reminders for tomorrow already sent today',
        totalAppointments: appointments.length,
        alreadySent: appointments.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Credenciais Z-API
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error('❌ Z-API credentials not configured');
      throw new Error('Z-API credentials not configured');
    }

    console.log('📡 Z-API configured, starting to send messages...');

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Enviar mensagens
    for (const appointment of appointmentsToRemind) {
      try {
        const client = appointment.clients;
        const procedure = appointment.procedures;
        
        // Limpar número de telefone
        const cleanPhone = client.celular.replace(/\D/g, '');
        const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        console.log(`📞 Processing reminder for ${client.nome} (${client.celular})`);

        // Formatando data brasileira
        const appointmentDate = new Date(appointment.appointment_date + 'T12:00:00');
        const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Substituir variáveis no template
        let message = reminderSettings.template_content;
        message = message.replace(/{clientName}/g, client.nome);
        message = message.replace(/{clientPhone}/g, client.celular);
        message = message.replace(/{appointmentDate}/g, formattedDate);
        message = message.replace(/{appointmentTime}/g, appointment.appointment_time);
        message = message.replace(/{procedureName}/g, procedure.name);
        message = message.replace(/{notes}/g, appointment.notes || '');

        console.log(`📤 Sending to ${phoneNumber}...`);

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
        
        if (response.ok && data.messageId) {
          console.log(`✅ Reminder sent successfully to ${client.nome}`);
          successCount++;
          
          // Registrar envio no log
          const logResult = await supabase
            .from('reminder_logs')
            .insert({
              appointment_id: appointment.id,
              client_phone: cleanPhone,
              sent_date: todayStr,
              appointment_date: tomorrowStr,
              message_id: data.messageId,
              status: 'sent'
            });

          if (logResult.error) {
            console.error('Error logging reminder:', logResult.error);
          }

          results.push({ 
            success: true, 
            client: client.nome, 
            phone: client.celular,
            appointment_id: appointment.id,
            message_id: data.messageId
          });
        } else {
          console.error(`❌ Failed to send reminder to ${client.nome}:`, data);
          errorCount++;
          
          results.push({ 
            success: false, 
            client: client.nome, 
            phone: client.celular,
            error: data.error?.message || `API Error: ${response.status}`,
            appointment_id: appointment.id,
            response_data: data
          });
        }

        // Delay entre mensagens para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Error sending reminder for appointment ${appointment.id}:`, error);
        errorCount++;
        
        results.push({ 
          success: false, 
          appointment_id: appointment.id,
          client: appointment.clients?.nome || 'Unknown',
          error: error.message 
        });
      }
    }

    const summary = {
      success: true,
      message: `Processed ${appointmentsToRemind.length} reminders`,
      totalAppointments: appointments.length,
      processedCount: appointmentsToRemind.length,
      successCount,
      errorCount,
      alreadySentToday: appointments.length - appointmentsToRemind.length,
      date: tomorrowStr,
      timestamp: brasiliaTime.toISOString(),
      results: results
    };

    console.log('📊 Final summary:', {
      processed: appointmentsToRemind.length,
      success: successCount,
      errors: errorCount
    });

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('💥 Error in send-reminder function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);