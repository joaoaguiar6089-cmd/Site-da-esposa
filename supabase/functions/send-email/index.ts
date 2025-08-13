import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  clientName: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  procedureName: string;
  professionalName?: string;
  action: 'agendamento' | 'alteracao' | 'cancelamento';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, clientName, clientPhone, appointmentDate, appointmentTime, procedureName, professionalName, action }: EmailRequest = await req.json();

    console.log('=== Owner Email Notification Function Called ===');
    console.log('Action type:', action);
    console.log('Client details:', { clientName, clientPhone });

    let actionText = '';
    let actionIcon = '';
    
    switch (action) {
      case 'agendamento':
        actionText = 'NOVO AGENDAMENTO';
        actionIcon = '📅';
        break;
      case 'alteracao':
        actionText = 'AGENDAMENTO ALTERADO';
        actionIcon = '📝';
        break;
      case 'cancelamento':
        actionText = 'AGENDAMENTO CANCELADO';
        actionIcon = '❌';
        break;
    }

    const formattedDate = new Date(appointmentDate).toLocaleDateString('pt-BR');
    const professionalInfo = professionalName ? `<p><strong>👩‍⚕️ Profissional:</strong> ${professionalName}</p>` : '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">
            ${actionIcon} ${actionText}
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

    const emailResponse = await resend.emails.send({
      from: "Clínica Dra. Karoline <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      messageId: emailResponse.data?.id,
      action: action,
      client: clientName
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in send-email function:', error);
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