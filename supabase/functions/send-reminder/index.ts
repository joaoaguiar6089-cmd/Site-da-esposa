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

    // Usar fuso horário correto do Brasil usando date-fns-tz
    const now = new Date();
    const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
    
    // Converter para horário do Brasil usando date-fns-tz
    const brazilTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: BRAZIL_TIMEZONE,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(now);
    
    const currentHour = parseInt(brazilTime.find(part => part.type === 'hour')?.value || '0');
    const currentMinute = parseInt(brazilTime.find(part => part.type === 'minute')?.value || '0');

    const [reminderHour, reminderMinute] = reminderSettings.reminder_time.split(':').map(Number);

    console.log(`⏰ Time check - Current: ${currentHour}:${String(currentMinute).padStart(2, '0')}, Configured: ${reminderHour}:${String(reminderMinute).padStart(2, '0')}`);

    // Verificação de horário com tolerância de 5 minutos
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const reminderTotalMinutes = reminderHour * 60 + reminderMinute;
    const timeDifference = Math.abs(currentTotalMinutes - reminderTotalMinutes);

    if (timeDifference > 5) {
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

    // Calcular data de amanhã no fuso do Brasil
    const brazilDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: BRAZIL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const tomorrow = new Date(brazilDate + 'T12:00:00');
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log('📅 Checking appointments for date:', tomorrowStr);

    // Verificar lembretes já enviados hoje (data do Brasil)
    const todayStr = brazilDate;
    
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

    console.log(`📲 Will send reminders to ${appointmentsToRemind.length} clients`);

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

    // === CONFIGURAÇÃO Z-API IGUAL AO CÓDIGO FUNCIONANDO ===
    let ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    console.log('Environment check:', {
      hasInstanceId: !!ZAPI_INSTANCE_ID,
      hasToken: !!ZAPI_TOKEN,
      instanceIdLength: ZAPI_INSTANCE_ID?.length || 0,
      tokenLength: ZAPI_TOKEN?.length || 0
    });

    // Extract instance ID if full URL was provided (igual ao código funcionando)
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

    console.log('📡 Z-API configured, starting to send messages...');

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Enviar mensagens
    for (const appointment of appointmentsToRemind) {
      try {
        const client = appointment.clients;
        const procedure = appointment.procedures;
        
        console.log(`📞 Processing reminder for ${client.nome} (${client.celular})`);

        // === FORMATAÇÃO DE TELEFONE IGUAL AO CÓDIGO FUNCIONANDO ===
        const cleanPhone = client.celular.replace(/\D/g, '');
        console.log('Cleaned phone number:', cleanPhone);

        // Ensure phone number has Brazilian country code (55)
        let phoneNumber = cleanPhone;
        if (!cleanPhone.startsWith('55')) {
          phoneNumber = `55${cleanPhone}`;
        }

        // Validate phone number format (must be 12 or 13 digits for Brazilian numbers)
        if (phoneNumber.length < 12 || phoneNumber.length > 13) {
          console.error('Invalid phone number format:', {
            original: client.celular,
            cleaned: cleanPhone,
            formatted: phoneNumber
          });
          throw new Error(`Formato de telefone inválido: ${client.celular}. Use o formato (XX) XXXXX-XXXX`);
        }

        console.log('Final formatted phone number:', phoneNumber);

        // Formatando data
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

        // === ESTRUTURA DE REQUISIÇÃO IGUAL AO CÓDIGO FUNCIONANDO ===
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

        // === REQUISIÇÃO COM HEADER Client-Token OBRIGATÓRIO ===
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': 'Fa3cbd2c46f99489eb361d6ccd87960efS' // MESMO VALOR DO CÓDIGO FUNCIONANDO
          },
          body: JSON.stringify(requestBody)
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
        
        console.log('✅ WhatsApp message sent successfully via Z-API:', {
          messageId,
          zaapId,
          originalNumber: client.celular,
          formattedNumber: phoneNumber,
          deliveryStatus: 'sent'
        });

        successCount++;
        
        // Registrar envio no log
        const logResult = await supabase
          .from('reminder_logs')
          .insert({
            appointment_id: appointment.id,
            client_phone: cleanPhone,
            sent_date: todayStr,
            appointment_date: tomorrowStr,
            message_id: messageId,
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
          message_id: messageId,
          zaap_id: zaapId
        });

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
      timestamp: now.toISOString(),
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