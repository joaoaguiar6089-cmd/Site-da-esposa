import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  professionalName: string;
  clientName: string;
  procedureName: string;
  appointmentDate: string;
  appointmentTime: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);
    const { to, professionalName, clientName, procedureName, appointmentDate, appointmentTime }: EmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Dra. Karoline <noreply@drakaroline.com>",
      to: [to],
      subject: "Novo Agendamento - Dra. Karoline Ferreira",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #8B0000; text-align: center; margin-bottom: 30px;">
              Dra. Karoline Ferreira - Estética e Saúde
            </h1>
            
            <h2 style="color: #722F37; margin-bottom: 20px;">
              Olá, ${professionalName}!
            </h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Você tem um novo agendamento confirmado:
            </p>
            
            <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B0000;">
              <h3 style="color: #8B0000; margin-top: 0;">Detalhes do Agendamento:</h3>
              <p><strong>Cliente:</strong> ${clientName}</p>
              <p><strong>Procedimento:</strong> ${procedureName}</p>
              <p><strong>Data:</strong> ${appointmentDate}</p>
              <p><strong>Horário:</strong> ${appointmentTime}</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Por favor, confirme sua disponibilidade e prepare-se para atender o cliente no horário marcado.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                Este é um email automático. Para dúvidas, entre em contato conosco.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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