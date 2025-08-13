import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    console.log('=== Admin Notification Function Called ===');
    console.log('Notification type:', type);
    console.log('Client details:', { clientName, clientPhone });

    // Inicializar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Buscar administradores que querem receber notificações por email
    const { data: admins, error: adminError } = await supabase
      .from('admin_users')
      .select('email, email_notifications')
      .eq('is_active', true)
      .eq('email_notifications', true)
      .not('email', 'is', null);

    console.log('=== Administradores encontrados ===');
    console.log('Admins data:', admins);
    console.log('Admin error:', adminError);

    if (adminError) {
      console.error('Erro ao buscar administradores:', adminError);
    }

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
    const professionalInfo = professionalName ? `<p><strong>👩‍⚕️ Profissional:</strong> ${professionalName}</p>` : '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">
            ${messageIcon} ${actionText}
          </h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db;">
            <h2 style="color: #2c3e50; margin-top: 0;">Detalhes do Cliente</h2>
            <p><strong>👤 Cliente:</strong> ${clientName}</p>
            <p><strong>📱 Telefone:</strong> ${clientPhone}</p>
            <p><strong>📅 Data:</strong> ${formattedDate}</p>
            <p><strong>⏰ Horário:</strong> ${appointmentTime}</p>
            <p><strong>💉 Procedimento:</strong> ${procedureName}</p>
            ${professionalInfo}
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #e8f4f8; border-radius: 8px; text-align: center;">
            <h3 style="color: #2c3e50; margin-top: 0;">📍 Clínica Dra. Karoline Ferreira</h3>
            <p style="color: #7f8c8d; margin: 5px 0;">Tefé-AM</p>
            <p style="color: #7f8c8d; margin: 5px 0;">Sistema de Agendamentos</p>
          </div>
          
          <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #95a5a6;">
            <p>Esta é uma notificação automática do sistema de agendamentos.</p>
          </div>
        </div>
      </div>
    `;

    const emailPromises = [];

    // Enviar email para todos os admins configurados
    if (admins && admins.length > 0) {
      for (const admin of admins) {
        if (admin.email) {
          console.log(`Enviando email para admin: ${admin.email}`);
          
          const emailPromise = resend.emails.send({
            from: "Clínica Dra. Karoline <onboarding@resend.dev>",
            to: [admin.email],
            subject: `${actionText} - ${procedureName}`,
            html: emailHtml,
          });
          
          emailPromises.push(emailPromise);
        }
      }
    }

    // Sempre enviar para o email padrão da proprietária
    const defaultEmailPromise = resend.emails.send({
      from: "Clínica Dra. Karoline <onboarding@resend.dev>",
      to: ["enfesteta.karoline@gmail.com"],
      subject: `${actionText} - ${procedureName}`,
      html: emailHtml,
    });
    
    emailPromises.push(defaultEmailPromise);

    // Aguardar envio de todos os emails
    const results = await Promise.allSettled(emailPromises);
    
    console.log('Emails enviados:', results);

    return new Response(JSON.stringify({
      success: true,
      emailsSent: results.filter(r => r.status === 'fulfilled').length,
      action: type,
      client: clientName
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in notify-admins function:', error);
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