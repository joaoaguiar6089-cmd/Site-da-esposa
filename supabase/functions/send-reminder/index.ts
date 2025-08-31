import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('=== FUNÇÃO INICIADA ===', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log de inicialização básica
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Service key exists:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created successfully');

    // Teste de conexão básica
    const { data: testData, error: testError } = await supabase
      .from('reminder_settings')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Database connection test failed:', testError);
      throw new Error(`Database error: ${testError.message}`);
    }

    console.log('Database connection test passed');

    // Buscar configurações de lembrete
    console.log('Fetching reminder settings...');
    const { data: reminderSettings, error: settingsError } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('Settings query result:', { 
      hasData: !!reminderSettings, 
      error: settingsError?.message 
    });

    if (settingsError) {
      if (settingsError.code === 'PGRST116') {
        console.log('No reminder settings found (table empty or no active settings)');
        return new Response(JSON.stringify({ 
          success: false,
          message: 'No active reminder settings found - please configure in admin panel',
          debug: {
            error_code: settingsError.code,
            error_message: settingsError.message
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error(`Settings error: ${settingsError.message}`);
      }
    }

    if (!reminderSettings) {
      console.log('Reminder settings is null');
      return new Response(JSON.stringify({ 
        success: false,
        message: 'No reminder settings returned from database'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Reminder settings found:', {
      reminder_time: reminderSettings.reminder_time,
      is_active: reminderSettings.is_active,
      template_length: reminderSettings.template_content?.length || 0
    });

    // Verificação de horário com logs detalhados
    const now = new Date();
    console.log('Current UTC time:', now.toISOString());
    
    // Tentar diferentes abordagens para fuso horário
    const brasiliaTime1 = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const brasiliaTime2 = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // UTC-3 manual
    
    console.log('Brasilia time (Intl):', brasiliaTime1.toISOString());
    console.log('Brasilia time (manual):', brasiliaTime2.toISOString());
    
    // Usar a abordagem manual que é mais confiável
    const brasiliaTime = brasiliaTime2;
    
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();
    
    console.log('Current Brasilia time:', `${currentHour}:${String(currentMinute).padStart(2, '0')}`);
    
    const [reminderHour, reminderMinute] = reminderSettings.reminder_time.split(':').map(Number);
    console.log('Configured time:', `${reminderHour}:${String(reminderMinute).padStart(2, '0')}`);

    // Verificação de horário mais permissiva para debug
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const reminderTotalMinutes = reminderHour * 60 + reminderMinute;
    const timeDifference = Math.abs(currentTotalMinutes - reminderTotalMinutes);

    console.log('Time difference in minutes:', timeDifference);

    // Para debug, vamos ser mais permissivos (15 minutos de tolerância)
    if (timeDifference > 15) {
      console.log('Not time yet - but continuing for debug purposes');
      // Em produção, descomente a linha abaixo para parar aqui
      // return new Response(...);
    }

    // Calcular data de amanhã
    const tomorrow = new Date(brasiliaTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log('Tomorrow date:', tomorrowStr);

    // Buscar agendamentos
    console.log('Fetching appointments...');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        notes,
        clients!appointments_client_id_fkey(nome, sobrenome, celular, cpf),
        procedures!appointments_procedure_id_fkey(name, duration)
      `)
      .eq('appointment_date', tomorrowStr)
      .in('status', ['agendado', 'confirmado']);

    console.log('Appointments query result:', {
      hasData: !!appointments,
      count: appointments?.length || 0,
      error: appointmentsError?.message
    });

    if (appointmentsError) {
      throw new Error(`Appointments error: ${appointmentsError.message}`);
    }

    if (!appointments || appointments.length === 0) {
      console.log('No appointments found for tomorrow');
      
      // Vamos também buscar agendamentos de hoje para debug
      const todayStr = brasiliaTime.toISOString().split('T')[0];
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('id, appointment_date, status')
        .eq('appointment_date', todayStr);

      console.log('Appointments today (for comparison):', todayAppointments?.length || 0);

      return new Response(JSON.stringify({ 
        success: true,
        message: 'No appointments found for tomorrow',
        debug: {
          tomorrowDate: tomorrowStr,
          todayDate: todayStr,
          appointmentsToday: todayAppointments?.length || 0,
          currentTime: `${currentHour}:${String(currentMinute).padStart(2, '0')}`,
          configuredTime: `${reminderHour}:${String(reminderMinute).padStart(2, '0')}`
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${appointments.length} appointments for tomorrow`);
    
    // Log detalhes dos agendamentos
    appointments.forEach((apt, index) => {
      console.log(`Appointment ${index + 1}:`, {
        id: apt.id,
        client: apt.clients?.nome,
        phone: apt.clients?.celular,
        time: apt.appointment_time,
        procedure: apt.procedures?.name
      });
    });

    // Verificar credenciais Z-API
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    console.log('Z-API credentials:', {
      instanceId: !!ZAPI_INSTANCE_ID,
      token: !!ZAPI_TOKEN
    });

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      throw new Error('Z-API credentials not configured');
    }

    // Para debug, vamos processar apenas o primeiro agendamento
    const testAppointment = appointments[0];
    const client = testAppointment.clients;
    const procedure = testAppointment.procedures;

    console.log('Processing test appointment for:', client?.nome);

    // Preparar mensagem
    const cleanPhone = client.celular.replace(/\D/g, '');
    const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    console.log('Phone processing:', {
      original: client.celular,
      clean: cleanPhone,
      final: phoneNumber
    });

    const appointmentDate = new Date(testAppointment.appointment_date + 'T12:00:00');
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
    
    let message = reminderSettings.template_content;
    message = message.replace(/{clientName}/g, client.nome);
    message = message.replace(/{clientPhone}/g, client.celular);
    message = message.replace(/{appointmentDate}/g, formattedDate);
    message = message.replace(/{appointmentTime}/g, testAppointment.appointment_time);
    message = message.replace(/{procedureName}/g, procedure.name);
    message = message.replace(/{notes}/g, testAppointment.notes || '');

    console.log('Message preview:', message.substring(0, 100) + '...');
    console.log('Full message length:', message.length);

    // Teste de envio
    console.log('Sending test message...');
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

    const responseData = await response.json();
    
    console.log('Z-API Response:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Debug execution completed',
      debug: {
        currentTime: `${currentHour}:${String(currentMinute).padStart(2, '0')}`,
        configuredTime: `${reminderHour}:${String(reminderMinute).padStart(2, '0')}`,
        timeDifference,
        appointmentsFound: appointments.length,
        testPhone: phoneNumber,
        messageLength: message.length,
        zapiResponse: responseData,
        zapiStatus: response.status
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('ERRO NA FUNÇÃO:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack,
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