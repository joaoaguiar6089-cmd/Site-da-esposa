import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  event_type: string;
  event_details: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

const SecurityAuditLog = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(data || []);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar logs de auditoria.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('unauthorized')) {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    if (eventType.includes('login') || eventType.includes('success')) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    if (eventType.includes('admin') || eventType.includes('created')) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
    return <Shield className="w-4 h-4 text-primary" />;
  };

  const getEventTypeBadgeVariant = (eventType: string): "default" | "destructive" | "secondary" => {
    if (eventType.includes('failed') || eventType.includes('unauthorized')) {
      return "destructive";
    }
    if (eventType.includes('admin')) {
      return "default";
    }
    return "secondary";
  };

  const filteredLogs = logs.filter(log => {
    if (filter === "all") return true;
    if (filter === "admin") return log.event_type.includes('admin');
    if (filter === "auth") return log.event_type.includes('login') || log.event_type.includes('logout');
    if (filter === "failed") return log.event_type.includes('failed');
    return true;
  });

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatEventDetails = (details: any) => {
    if (!details || typeof details !== 'object') return '';
    
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  if (loading) {
    return <div className="text-center py-8">Carregando logs de segurança...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Logs de Auditoria de Segurança</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar eventos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              <SelectItem value="admin">Eventos administrativos</SelectItem>
              <SelectItem value="auth">Autenticação</SelectItem>
              <SelectItem value="failed">Falhas de segurança</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadLogs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter === "all" ? "Nenhum evento encontrado." : "Nenhum evento encontrado para este filtro."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getEventTypeIcon(log.event_type)}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getEventTypeBadgeVariant(log.event_type)}>
                          {formatEventType(log.event_type)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      {log.event_details && Object.keys(log.event_details).length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {formatEventDetails(log.event_details)}
                        </p>
                      )}
                      
                      {log.user_id && (
                        <p className="text-xs text-muted-foreground">
                          User ID: {log.user_id}
                        </p>
                      )}
                      
                      {log.ip_address && (
                        <p className="text-xs text-muted-foreground">
                          IP: {String(log.ip_address)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredLogs.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Mostrando {filteredLogs.length} evento(s) de segurança
        </div>
      )}
    </div>
  );
};

export default SecurityAuditLog;