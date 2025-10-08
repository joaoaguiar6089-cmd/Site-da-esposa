import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  
  // Template filters
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [recipientFilter, setRecipientFilter] = useState<string>('all');
  
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
    { name: "professionalName", description: "Nome do profissional responsável" },
    { name: "notes", description: "Observações adicionais" },
    { name: "specifications", description: "Especificações selecionadas" },
    { name: "cityName", description: "Cidade escolhida no agendamento" },
    { name: "clinicName", description: "Nome da clínica correspondente" },
    { name: "clinicAddress", description: "Endereço completo da clínica" },
    { name: "clinicMapUrl", description: "Link do Google Maps da clínica" },
    { name: "clinicLocation", description: "Bloco com nome, endereço e link da clínica" }
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

  const fixTemplateFormatting = async (templateType: string, originalContent: string) => {
    try {
      const cleanedContent = cleanTemplateContent(originalContent);
      
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ template_content: cleanedContent })
        .eq('template_type', templateType);

      if (error) throw error;

      toast({
        title: "✅ Formatação corrigida!",
        description: "Template atualizado com formatação limpa",
      });

      loadTemplates();
    } catch (error: any) {
      toast({
        title: "❌ Erro ao corrigir",
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
    const templateInfo: Record<string, { name: string; channel: string; recipient: string; description: string; order: number }> = {
      // Templates WhatsApp para Cliente
      'agendamento_cliente': {
        name: 'Novo Agendamento (Cliente)',
        channel: 'WhatsApp',
        recipient: 'Cliente',
        description: 'Enviado quando um novo agendamento é criado ou status muda para confirmado',
        order: 1
      },
      'agendamento_atualizado_cliente': {
        name: 'Agendamento Alterado (Cliente)',
        channel: 'WhatsApp', 
        recipient: 'Cliente',
        description: 'Enviado quando data/hora são alteradas em agendamento existente',
        order: 2
      },
      'cancelamento_cliente': {
        name: 'Agendamento Cancelado (Cliente)',
        channel: 'WhatsApp',
        recipient: 'Cliente', 
        description: 'Enviado quando agendamento é cancelado',
        order: 3
      },
      
      // Templates WhatsApp para Proprietária
      'agendamento_proprietaria': {
        name: 'Novo Agendamento (Proprietária)',
        channel: 'WhatsApp',
        recipient: 'Proprietária',
        description: 'Notifica proprietária sobre novos agendamentos criados',
        order: 4
      },
      'alteracao_proprietaria': {
        name: 'Agendamento Alterado (Proprietária)', 
        channel: 'WhatsApp',
        recipient: 'Proprietária',
        description: 'Notifica proprietária sobre alterações em agendamentos',
        order: 5
      },
      'cancelamento_proprietaria': {
        name: 'Agendamento Cancelado (Proprietária)',
        channel: 'WhatsApp', 
        recipient: 'Proprietária',
        description: 'Notifica proprietária sobre cancelamentos',
        order: 6
      },

      // Templates E-mail (legados)
      'appointment_confirmation': {
        name: 'Confirmação por E-mail (Legado)',
        channel: 'E-mail',
        recipient: 'Cliente',
        description: 'Template de confirmação por e-mail (não utilizado)',
        order: 7
      },
      'confirmacao_cliente': {
        name: 'Confirmação (Legado)',
        channel: 'WhatsApp',
        recipient: 'Cliente',
        description: 'Template legado - usar "Novo Agendamento (Cliente)" em vez deste',
        order: 8
      }
    };

    return templateInfo[type] || {
      name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      channel: 'Desconhecido',
      recipient: 'Desconhecido', 
      description: 'Template não categorizado',
      order: 999
    };
  };

  const getFilteredTemplates = () => {
    let filtered = templates;

    // Filtrar por canal
    if (channelFilter !== 'all') {
      filtered = filtered.filter(t => getTemplateDisplayName(t.template_type).channel === channelFilter);
    }

    // Filtrar por destinatário
    if (recipientFilter !== 'all') {
      filtered = filtered.filter(t => getTemplateDisplayName(t.template_type).recipient === recipientFilter);
    }

    // Ordenar por ordem definida
    return filtered.sort((a, b) => {
      const orderA = getTemplateDisplayName(a.template_type).order;
      const orderB = getTemplateDisplayName(b.template_type).order;
      return orderA - orderB;
    });
  };

  const getChannelBadge = (channel: string) => {
    const styles = {
      'WhatsApp': 'bg-green-100 text-green-800 border-green-200',
      'E-mail': 'bg-blue-100 text-blue-800 border-blue-200',
      'Desconhecido': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[channel] || styles['Desconhecido'];
  };

  const getRecipientBadge = (recipient: string) => {
    const styles = {
      'Cliente': 'bg-purple-100 text-purple-800 border-purple-200',
      'Proprietária': 'bg-orange-100 text-orange-800 border-orange-200',
      'Desconhecido': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[recipient] || styles['Desconhecido'];
  };

  const cleanTemplateContent = (content: string) => {
    // Limpar formatação estranha como \n, \\ etc
    return content
      .replace(/\\n/g, '\n')  // Converter \n em quebra de linha real
      .replace(/\\t/g, '\t')  // Converter \t em tab real
      .replace(/\\\\/g, '\\') // Converter \\ em \ simples
      .trim();
  };

  const hasFormattingIssues = (content: string) => {
    // Detectar se tem formatação estranha
    return content.includes('\\n') || content.includes('\\t') || content.includes('\\\\');
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
        <TabsList className="grid w-full gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                Gerenciar Templates de Notificações
              </CardTitle>
              <CardDescription>
                Configure mensagens automáticas enviadas por WhatsApp e E-mail para clientes e proprietária. 
                Cada template é identificado por canal (WhatsApp/E-mail) e destinatário (Cliente/Proprietária).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Estatísticas dos Templates */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">WhatsApp</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    {templates.filter(t => getTemplateDisplayName(t.template_type).channel === 'WhatsApp').length}
                  </div>
                  <div className="text-xs text-green-600">templates</div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">E-mail</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {templates.filter(t => getTemplateDisplayName(t.template_type).channel === 'E-mail').length}
                  </div>
                  <div className="text-xs text-blue-600">templates</div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Cliente</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-700">
                    {templates.filter(t => getTemplateDisplayName(t.template_type).recipient === 'Cliente').length}
                  </div>
                  <div className="text-xs text-purple-600">templates</div>
                </div>
                
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Com Problemas</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-700">
                    {templates.filter(t => hasFormattingIssues(t.template_content)).length}
                  </div>
                  <div className="text-xs text-orange-600">formatação</div>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="channel-filter" className="text-sm font-medium">Canal:</Label>
                  <Select value={channelFilter} onValueChange={setChannelFilter}>
                    <SelectTrigger id="channel-filter" className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="E-mail">E-mail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="recipient-filter" className="text-sm font-medium">Destinatário:</Label>
                  <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                    <SelectTrigger id="recipient-filter" className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Proprietária">Proprietária</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>
                    {getFilteredTemplates().length} de {templates.length} templates
                  </span>
                </div>
              </div>

              {/* Lista de Templates */}
              {getFilteredTemplates().map((template) => {
                const templateInfo = getTemplateDisplayName(template.template_type);
                return (
                  <div key={template.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-lg">{templateInfo.name}</h4>
                          <Badge className={getChannelBadge(templateInfo.channel)}>
                            {templateInfo.channel}
                          </Badge>
                          <Badge className={getRecipientBadge(templateInfo.recipient)}>
                            {templateInfo.recipient}
                          </Badge>
                          {hasFormattingIssues(template.template_content) && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              ⚠️ Formatação
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{templateInfo.description}</p>
                        <div className="text-xs text-gray-500">
                          ID do template: <code>{template.template_type}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasFormattingIssues(template.template_content) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              fixTemplateFormatting(template.template_type, template.template_content);
                            }}
                            className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <AlertCircle className="h-4 w-4" />
                            Corrigir Formatação
                          </Button>
                        )}
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-gray-700">Visualização do Template:</h5>
                        {hasFormattingIssues(template.template_content) && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            ⚠️ Contém caracteres de formatação como \n
                          </span>
                        )}
                      </div>
                      <div className="bg-muted p-3 rounded text-sm font-mono whitespace-pre-wrap border">
                        {cleanTemplateContent(template.template_content)}
                      </div>
                      {hasFormattingIssues(template.template_content) && (
                        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-200">
                          <strong>💡 Dica:</strong> Este template contém formatação estranha. 
                          Use o botão "Corrigir Formatação" para limpar automaticamente.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
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