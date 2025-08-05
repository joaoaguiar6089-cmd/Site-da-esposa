import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Phone, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const NotificationDebug = () => {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Teste de notificação WhatsApp");
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const testWhatsAppSend = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o telefone e a mensagem de teste",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Testing WhatsApp with:', { phone: testPhone, message: testMessage });
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: testPhone,
          message: testMessage
        }
      });

      console.log('WhatsApp test result:', { data, error });

      if (error) {
        throw error;
      }

      setLastResult({
        success: true,
        timestamp: new Date().toISOString(),
        phone: testPhone,
        data: data
      });

      toast({
        title: "✅ Teste enviado com sucesso!",
        description: `Mensagem enviada para ${formatPhone(testPhone)}`,
      });

    } catch (error: any) {
      console.error('WhatsApp test error:', error);
      
      setLastResult({
        success: false,
        timestamp: new Date().toISOString(),
        phone: testPhone,
        error: error.message || error.toString()
      });

      toast({
        title: "❌ Erro no teste",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkWhatsAppConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: "test",
          message: "config-check"
        }
      });

      console.log('Config check result:', { data, error });
      
      if (error?.message?.includes('credentials not configured')) {
        toast({
          title: "⚠️ Configuração incompleta",
          description: "Credenciais do WhatsApp não configuradas",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Configuração OK",
          description: "Credenciais do WhatsApp estão configuradas",
        });
      }
    } catch (error: any) {
      console.error('Config check error:', error);
      toast({
        title: "❌ Erro na verificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Debug de Notificações WhatsApp
          </CardTitle>
          <CardDescription>
            Teste e monitore o envio de notificações WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={checkWhatsAppConfig}
              variant="outline"
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Verificar Configuração
            </Button>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Número de Teste</label>
              <Input
                placeholder="(51) 99999-9999"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Mensagem de Teste</label>
              <Textarea
                placeholder="Digite a mensagem de teste..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={testWhatsAppSend}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isLoading ? "Enviando..." : "Enviar Teste"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Último Resultado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={lastResult.success ? "default" : "destructive"}>
                {lastResult.success ? "Sucesso" : "Erro"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(lastResult.timestamp).toLocaleString()}
              </span>
            </div>

            <div>
              <strong>Telefone:</strong> {formatPhone(lastResult.phone)}
            </div>

            {lastResult.success && lastResult.data && (
              <div className="space-y-2">
                <div>
                  <strong>Debug Info:</strong>
                </div>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto">
{JSON.stringify(lastResult.data.debug || lastResult.data, null, 2)}
                </pre>
              </div>
            )}

            {!lastResult.success && (
              <div>
                <strong>Erro:</strong>
                <div className="bg-red-50 border border-red-200 p-3 rounded mt-1">
                  <code className="text-sm text-red-700">{lastResult.error}</code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationDebug;