import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Phone, CheckCircle, XCircle, MessageSquare, Edit, Copy, Info, Settings, Clock, AlertCircle } from "lucide-react";

const NotificationDebug = () => {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Teste de notificação WhatsApp");
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showVariables, setShowVariables] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  // Owner notification settings
  const [ownerPhone, setOwnerPhone] = useState("97984387295");
  const [ownerTemplate, setOwnerTemplate] = useState("");
  const [isLoadingOwnerSettings, setIsLoadingOwnerSettings] = useState(false);

  // Reminder settings
  const [reminderTime, setReminderTime] = useState("18:00");
  const [reminderActive, setReminderActive] = useState(true);
  const [reminderTemplate, setReminderTemplate] = useState("");
  const [isLoadingReminderSettings, setIsLoadingReminderSettings] = useState(false);

  // Variáveis disponíveis para os templates
  const availableVariables = [
    { name: "clientName", description: "Nome do cliente" },
    { name: "clientPhone", description: "Telefone do cliente" },
    { name: "appointmentDate", description: "Data do agendamento" },
    { name: "appointmentTime", description: "Hora do agendamento" },
    { name: "procedureName", description: "Nome do procedimento" },
    { name: "notes", description: "Observações do agendamento" }
  ];

  useEffect(() => {
    loadTemplates();
    loadOwnerSettings();
    loadReminderSettings();
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

  const loadOwnerSettings = async () => {
    try {
      // Load owner notification template
      const { data: templateData } = await supabase
        .from('whatsapp_templates')
        .select('template_content')
        .eq('template_type', 'agendamento_proprietaria')
        .single();
      
      if (templateData) {
        setOwnerTemplate(templateData.template_content);
      }

      // Load owner phone from site settings if exists
      const { data: phoneData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'owner_phone')
        .single();
      
      if (phoneData) {
        setOwnerPhone(phoneData.setting_value);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da proprietária:', error);
    }
  };

  const loadReminderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configurações de lembrete:', error);
        return;
      }

      if (data) {
        setReminderTime(data.reminder_time?.substring(0, 5) || '18:00');
        setReminderActive(data.is_active ?? true);
        setReminderTemplate(data.template_content || '');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de lembrete:', error);
    }
  };

  const saveReminderSettings = async () => {
    setIsLoadingReminderSettings(true);
    try {
      // First check if any settings exist
      const { data: existingData } = await supabase
        .from('reminder_settings')
        .select('id')
        .limit(1)
        .single();

      const settingsData = {
        reminder_time: reminderTime + ':00',
        is_active: reminderActive,
        template_content: reminderTemplate
      };

      let error;
      if (existingData) {
        // Update existing settings
        const updateResult = await supabase
          .from('reminder_settings')
          .update(settingsData)
          .eq('id', existingData.id);
        error = updateResult.error;
      } else {
        // Create new settings
        const insertResult = await supabase
          .from('reminder_settings')
          .insert(settingsData);
        error = insertResult.error;
      }

      if (error) throw error;

      toast({
        title: "✅ Configurações salvas!",
        description: "Configurações de lembrete automático atualizadas com sucesso",
      });

    } catch (error: any) {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingReminderSettings(false);
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
    setShowVariables(false);
  };

  const insertVariable = (variableName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const before = editContent.substring(0, cursorPosition);
    const after = editContent.substring(cursorPosition);
    const newContent = before + `{${variableName}}` + after;
    
    setEditContent(newContent);
    setShowVariables(false);
    
    // Reposicionar cursor
    setTimeout(() => {
      const newPosition = cursorPosition + variableName.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setEditContent(value);
    setCursorPosition(position);
    
    // Verificar se digitou "{"
    if (value[position - 1] === '{') {
      setShowVariables(true);
    } else if (value[position - 1] === '}' || value[position - 1] === ' ') {
      setShowVariables(false);
    }
  };

  const copyVariable = (variableName: string) => {
    navigator.clipboard.writeText(`{${variableName}}`);
    toast({
      title: "Copiado!",
      description: `Variável {${variableName}} copiada para a área de transferência`,
    });
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

  const saveOwnerSettings = async () => {
    setIsLoadingOwnerSettings(true);
    try {
      // Save owner notification template
      const { error: templateError } = await supabase
        .from('whatsapp_templates')
        .update({ template_content: ownerTemplate })
        .eq('template_type', 'agendamento_proprietaria');

      if (templateError) throw templateError;

      // Save or update owner phone setting
      const { error: phoneError } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'owner_phone',
          setting_value: ownerPhone
        });

      if (phoneError) throw phoneError;

      toast({
        title: "✅ Configurações salvas!",
        description: "Template e telefone da proprietária atualizados com sucesso",
      });

    } catch (error: any) {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingOwnerSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test">Teste de Mensagens</TabsTrigger>
          <TabsTrigger value="templates">Editar Templates</TabsTrigger>
          <TabsTrigger value="owner">Notificações Proprietária</TabsTrigger>
          <TabsTrigger value="reminders">Lembretes Automáticos</TabsTrigger>
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
                    <div className="space-y-4">
                      {/* Painel de Variáveis */}
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-600" />
                            Variáveis Disponíveis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {availableVariables.map((variable) => (
                              <div
                                key={variable.name}
                                className="flex items-center justify-between p-2 bg-white rounded border hover:bg-blue-50 transition-colors group cursor-pointer"
                                onClick={() => insertVariable(variable.name)}
                              >
                                <div className="flex-1 min-w-0">
                                  <code className="text-sm font-mono text-blue-700">
                                    {`{${variable.name}}`}
                                  </code>
                                  <p className="text-xs text-gray-600 truncate">
                                    {variable.description}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyVariable(variable.name);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                            💡 <strong>Dica:</strong> Clique em uma variável para inserir ou digite &#123; para ver sugestões
                          </div>
                        </CardContent>
                      </Card>

                      {/* Editor de Template */}
                      <div className="relative">
                        <Textarea
                          ref={textareaRef}
                          value={editContent}
                          onChange={handleTextareaChange}
                          onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                          rows={8}
                          className="font-mono text-sm"
                          placeholder="Digite sua mensagem aqui... Use '{' para ver as variáveis disponíveis"
                        />
                        
                        {/* Dropdown de Sugestões */}
                        {showVariables && (
                          <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto min-w-64 mt-1">
                            <div className="p-2 border-b bg-gray-50">
                              <p className="text-xs font-medium text-gray-700">Selecione uma variável:</p>
                            </div>
                            {availableVariables.map((variable) => (
                              <div
                                key={variable.name}
                                className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => insertVariable(variable.name)}
                              >
                                <code className="text-sm font-mono text-blue-700">
                                  {`{${variable.name}}`}
                                </code>
                                <p className="text-xs text-gray-600">{variable.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
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
                          onClick={() => {
                            setEditingTemplate(null);
                            setShowVariables(false);
                          }}
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

        <TabsContent value="owner">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações de Notificação para Proprietária
              </CardTitle>
              <CardDescription>
                Configure o template e número que receberá notificações de novos agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Template Editor */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ownerTemplate">Template para Novos Agendamentos</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Personalize a mensagem que será enviada quando um novo agendamento for criado
                  </p>
                </div>
                
                {/* Variables Panel */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      Variáveis Disponíveis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {availableVariables.map((variable) => (
                        <div
                          key={variable.name}
                          className="flex items-center justify-between p-2 bg-white rounded border hover:bg-blue-50 transition-colors group cursor-pointer"
                          onClick={() => {
                            const cursorPos = ownerTemplate.length;
                            setOwnerTemplate(prev => prev + `{${variable.name}}`);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <code className="text-sm font-mono text-blue-700">
                              {`{${variable.name}}`}
                            </code>
                            <p className="text-xs text-gray-600 truncate">
                              {variable.description}
                            </p>
                          </div>
                          <Button
                            variant="ghost" 
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyVariable(variable.name);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                      💡 <strong>Dica:</strong> Clique em uma variável para adicionar ao template
                    </div>
                  </CardContent>
                </Card>

                <Textarea
                  id="ownerTemplate"
                  value={ownerTemplate}
                  onChange={(e) => setOwnerTemplate(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder="Digite o template da mensagem para a proprietária...

Exemplo:
🔔 *Novo Agendamento Recebido*

👤 *Cliente:* {clientName}
📱 *Telefone:* {clientPhone}
📅 *Data:* {appointmentDate}
🕐 *Horário:* {appointmentTime}
💉 *Procedimento:* {procedureName}
{notes}"
                />
              </div>

              {/* Phone Number Configuration */}
              <div className="space-y-2">
                <Label htmlFor="ownerPhone">Telefone da Proprietária</Label>
                <p className="text-sm text-muted-foreground">
                  Número que receberá as notificações de novos agendamentos (apenas números)
                </p>
                <Input
                  id="ownerPhone"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="97984387295"
                  maxLength={11}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: {ownerPhone ? formatPhone(ownerPhone) : "Digite o número"}
                </p>
              </div>

              <Button 
                onClick={saveOwnerSettings}
                disabled={isLoadingOwnerSettings}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                {isLoadingOwnerSettings ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Configuração de Lembretes Automáticos
              </CardTitle>
              <CardDescription>
                Configure o horário e template para envio automático de lembretes no dia anterior aos agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Status e Horário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reminderActive">Status do Sistema</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="reminderActive"
                      checked={reminderActive}
                      onChange={(e) => setReminderActive(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="reminderActive" className="font-normal">
                      {reminderActive ? "Lembretes Ativados" : "Lembretes Desativados"}
                    </Label>
                    {reminderActive ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminderTime">Horário de Envio</Label>
                  <p className="text-sm text-muted-foreground">
                    Hora em que os lembretes serão enviados no dia anterior
                  </p>
                  <Input
                    type="time"
                    id="reminderTime"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Alerta de Informação */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 mb-1">Como funciona o sistema de lembretes:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Os lembretes são enviados automaticamente no dia anterior aos agendamentos</li>
                      <li>• Todos os clientes com agendamento no dia seguinte recebem o lembrete</li>
                      <li>• O horário configurado é usado para determinar quando enviar as mensagens</li>
                      <li>• O sistema evita duplicatas enviando apenas uma mensagem por cliente/dia</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Template Editor */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reminderTemplate">Template da Mensagem de Lembrete</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Personalize a mensagem que será enviada como lembrete aos clientes
                  </p>
                </div>
                
                {/* Variables Panel */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      Variáveis Disponíveis para Lembretes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {availableVariables.map((variable) => (
                        <div
                          key={variable.name}
                          className="flex items-center justify-between p-2 bg-white rounded border hover:bg-blue-50 transition-colors group cursor-pointer"
                          onClick={() => {
                            setReminderTemplate(prev => prev + `{${variable.name}}`);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <code className="text-sm font-mono text-blue-700">
                              {`{${variable.name}}`}
                            </code>
                            <p className="text-xs text-gray-600 truncate">
                              {variable.description}
                            </p>
                          </div>
                          <Button
                            variant="ghost" 
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyVariable(variable.name);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                      💡 <strong>Dica:</strong> Clique em uma variável para adicionar ao template
                    </div>
                  </CardContent>
                </Card>

                <Textarea
                  id="reminderTemplate"
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder="Digite o template da mensagem de lembrete...

Exemplo:
🔔 *Lembrete de Consulta* 

Olá {clientName}! 

Este é um lembrete de que você tem um agendamento AMANHÃ:

📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}

📍 Local: Clínica Dra. Karoline - Tefé/AM

Para confirmar, alterar ou cancelar seu agendamento, acesse nossa área do cliente.

Obrigado! 🙏"
                />
              </div>

              <Button 
                onClick={saveReminderSettings}
                disabled={isLoadingReminderSettings}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                {isLoadingReminderSettings ? "Salvando..." : "Salvar Configurações de Lembrete"}
              </Button>
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