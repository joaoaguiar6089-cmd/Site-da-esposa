import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Phone, MessageSquare, Bell } from "lucide-react";

interface NotificationSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
}

const NotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de notificação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingKey: string, value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({ setting_value: value })
        .eq('setting_key', settingKey);

      if (error) throw error;

      setSettings(prev => 
        prev.map(setting => 
          setting.setting_key === settingKey 
            ? { ...setting, setting_value: value }
            : setting
        )
      );

      toast({
        title: "Sucesso",
        description: "Configuração atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.setting_key === key)?.setting_value || '';
  };

  const getSettingDescription = (key: string) => {
    return settings.find(s => s.setting_key === key)?.description || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Configurações de Notificação</h2>
      </div>

      <Tabs defaultValue="phone" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Telefone
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número da Proprietária
              </CardTitle>
              <CardDescription>
                Número que receberá as notificações de novos agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="owner_phone">Número (com código do país)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="owner_phone"
                    type="tel"
                    value={getSetting('owner_phone')}
                    onChange={(e) => {
                      const setting = settings.find(s => s.setting_key === 'owner_phone');
                      if (setting) {
                        setSettings(prev => 
                          prev.map(s => 
                            s.setting_key === 'owner_phone' 
                              ? { ...s, setting_value: e.target.value }
                              : s
                          )
                        );
                      }
                    }}
                    placeholder="5597984387295"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => updateSetting('owner_phone', getSetting('owner_phone'))}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Formato: código do país + DDD + número (ex: 5597984387295)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {/* Template Novo Agendamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">Novo Agendamento</Badge>
                </CardTitle>
                <CardDescription>
                  {getSettingDescription('new_appointment_template')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new_appointment_template">Template da mensagem</Label>
                  <Textarea
                    id="new_appointment_template"
                    value={getSetting('new_appointment_template')}
                    onChange={(e) => {
                      setSettings(prev => 
                        prev.map(s => 
                          s.setting_key === 'new_appointment_template' 
                            ? { ...s, setting_value: e.target.value }
                            : s
                        )
                      );
                    }}
                    placeholder="Template da mensagem..."
                    rows={6}
                    className="resize-none"
                  />
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">Variáveis disponíveis:</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">{'{clientName}'}</Badge>
                      <Badge variant="outline" className="text-xs">{'{clientPhone}'}</Badge>
                      <Badge variant="outline" className="text-xs">{'{appointmentDate}'}</Badge>
                      <Badge variant="outline" className="text-xs">{'{appointmentTime}'}</Badge>
                      <Badge variant="outline" className="text-xs">{'{procedureName}'}</Badge>
                      <Badge variant="outline" className="text-xs">{'{notes}'}</Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => updateSetting('new_appointment_template', getSetting('new_appointment_template'))}
                    disabled={saving}
                    className="mt-4"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Template Alteração */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">Alteração de Agendamento</Badge>
                </CardTitle>
                <CardDescription>
                  {getSettingDescription('appointment_change_template')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="appointment_change_template">Template da mensagem</Label>
                  <Textarea
                    id="appointment_change_template"
                    value={getSetting('appointment_change_template')}
                    onChange={(e) => {
                      setSettings(prev => 
                        prev.map(s => 
                          s.setting_key === 'appointment_change_template' 
                            ? { ...s, setting_value: e.target.value }
                            : s
                        )
                      );
                    }}
                    placeholder="Template da mensagem..."
                    rows={6}
                    className="resize-none"
                  />
                  <Button
                    onClick={() => updateSetting('appointment_change_template', getSetting('appointment_change_template'))}
                    disabled={saving}
                    className="mt-4"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Template Cancelamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">Cancelamento</Badge>
                </CardTitle>
                <CardDescription>
                  {getSettingDescription('appointment_cancel_template')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="appointment_cancel_template">Template da mensagem</Label>
                  <Textarea
                    id="appointment_cancel_template"
                    value={getSetting('appointment_cancel_template')}
                    onChange={(e) => {
                      setSettings(prev => 
                        prev.map(s => 
                          s.setting_key === 'appointment_cancel_template' 
                            ? { ...s, setting_value: e.target.value }
                            : s
                        )
                      );
                    }}
                    placeholder="Template da mensagem..."
                    rows={6}
                    className="resize-none"
                  />
                  <Button
                    onClick={() => updateSetting('appointment_cancel_template', getSetting('appointment_cancel_template'))}
                    disabled={saving}
                    className="mt-4"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationSettings;