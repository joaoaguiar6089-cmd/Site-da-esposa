import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Phone, CheckCircle, XCircle, MessageSquare, Edit } from "lucide-react";

const NotificationDebug = () => {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Teste de notificação WhatsApp");
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('template_type');
    
    if (error) {
      console.error('Erro ao carregar templates:', error);
    } else {
      setTemplates(data || []);
    }
  };

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

  const saveTemplate = async (templateType: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ template_content: editContent })
        .eq('template_type', templateType);

      if (error) throw error;

      toast({
        title: "✅ Template salvo!",
        description: "Modelo de mensagem atualizado com sucesso",
      });

      setEditingTemplate(null);
      setEditContent("");
      loadTemplates();
    } catch (error: any) {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = (template: any) => {
    setEditingTemplate(template.template_type);
    setEditContent(template.template_content);
  };

  const getTemplateDisplayName = (type: string) => {
    const names: Record<string, string> = {
      'agendamento_cliente': 'Confirmação para Cliente',
      'agendamento_atualizado_cliente': 'Atualização para Cliente',
      'agendamento_proprietaria': 'Novo Agendamento (Proprietária)',
      'alteracao_proprietaria': 'Alteração (Proprietária)',
      'cancelamento_proprietaria': 'Cancelamento (Proprietária)'
    };
    return names[type] || type;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test">Teste de Mensagens</TabsTrigger>
          <TabsTrigger value="templates">Editar Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Teste de Notificações WhatsApp
              </CardTitle>
              <CardDescription>
                Teste o envio de notificações WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="testPhone">Número de Teste</Label>
                  <Input
                    id="testPhone"
                    placeholder="(51) 99999-9999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="testMessage">Mensagem de Teste</Label>
                  <Textarea
                    id="testMessage"
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
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Templates de Mensagens WhatsApp
              </CardTitle>
              <CardDescription>
                Personalize as mensagens enviadas automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{getTemplateDisplayName(template.template_type)}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(template)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  </div>
                  
                  {editingTemplate === template.template_type ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <div className="text-xs text-muted-foreground">
                        Variáveis disponíveis: {"{clientName}"}, {"{appointmentDate}"}, {"{appointmentTime}"}, {"{procedureName}"}, {"{notes}"}, {"{clientPhone}"}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => saveTemplate(template.template_type)}
                          size="sm"
                        >
                          Salvar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingTemplate(null)}
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted p-3 rounded text-sm font-mono whitespace-pre-wrap">
                      {template.template_content}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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