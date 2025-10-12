import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, Phone, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPackageInfo, formatSessionProgress } from "@/utils/packageUtils";

interface ClientWithPackage {
  id: string;
  nome: string;
  sobrenome: string;
  celular: string;
  procedureName: string;
  procedureId: string;
  sessionNumber: number;
  totalSessions: number;
  lastAppointmentDate: string;
  lastAppointmentTime: string;
}

interface ActivePackagesTabProps {
  onClientSelect: (clientId: string) => void;
}

const ActivePackagesTab = ({ onClientSelect }: ActivePackagesTabProps) => {
  const [clientsWithPackages, setClientsWithPackages] = useState<ClientWithPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClientsWithActivePackages();
  }, []);

  const loadClientsWithActivePackages = async () => {
    try {
      setLoading(true);

      // Buscar todos os agendamentos com session_number e total_sessions
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_id,
          procedure_id,
          appointment_date,
          appointment_time,
          session_number,
          total_sessions,
          status,
          client:clients(id, nome, sobrenome, celular),
          procedure:procedures(id, name)
        `)
        .not('session_number', 'is', null)
        .not('total_sessions', 'is', null)
        .gt('total_sessions', 1)
        .neq('status', 'cancelado')
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        setClientsWithPackages([]);
        return;
      }

      // Agrupar por cliente + procedimento para encontrar os pacotes em andamento
      const packageMap = new Map<string, any>();

      appointments.forEach((apt: any) => {
        const key = `${apt.client_id}-${apt.procedure_id}`;
        
        if (!packageMap.has(key)) {
          packageMap.set(key, {
            client_id: apt.client_id,
            procedure_id: apt.procedure_id,
            nome: apt.client.nome,
            sobrenome: apt.client.sobrenome,
            celular: apt.client.celular,
            procedureName: apt.procedure.name,
            totalSessions: apt.total_sessions,
            appointments: []
          });
        }
        
        const pkg = packageMap.get(key);
        pkg.appointments.push(apt);
      });

      // Processar cada pacote para calcular sessões realizadas
      const clientsArray: ClientWithPackage[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      packageMap.forEach((pkg) => {
        // Contar apenas sessões realizadas (status = 'realizado')
        const completedSessions = pkg.appointments.filter(
          (apt: any) => apt.status === 'realizado'
        ).length;
        
        // Encontrar a última sessão PASSADA (realizada ou não, mas que já passou)
        const pastAppointments = pkg.appointments.filter((apt: any) => {
          const [year, month, day] = apt.appointment_date.split('-').map(Number);
          const aptDate = new Date(year, month - 1, day);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate <= today;
        }).sort((a: any, b: any) => {
          // Ordenar por data decrescente (mais recente primeiro)
          if (b.appointment_date !== a.appointment_date) {
            return b.appointment_date.localeCompare(a.appointment_date);
          }
          return b.appointment_time.localeCompare(a.appointment_time);
        });
        
        const lastPastAppointment = pastAppointments[0];
        
        // Só incluir se ainda não completou todas as sessões E se tiver pelo menos uma sessão passada
        if (completedSessions < pkg.totalSessions && lastPastAppointment) {
          clientsArray.push({
            id: pkg.client_id,
            nome: pkg.nome,
            sobrenome: pkg.sobrenome,
            celular: pkg.celular,
            procedureName: pkg.procedureName,
            procedureId: pkg.procedure_id,
            sessionNumber: completedSessions,
            totalSessions: pkg.totalSessions,
            lastAppointmentDate: lastPastAppointment.appointment_date,
            lastAppointmentTime: lastPastAppointment.appointment_time
          });
        }
      });

      setClientsWithPackages(clientsArray);
    } catch (error) {
      console.error("Erro ao carregar pacotes em andamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pacotes em andamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const getDaysSince = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - appointmentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'hoje';
    if (diffDays === 1) return 'há 1 dia';
    if (diffDays > 0) return `há ${diffDays} dias`;
    if (diffDays === -1) return 'amanhã';
    return `em ${Math.abs(diffDays)} dias`;
  };

  const openWhatsApp = (phone: string, clientName: string, procedureName: string) => {
    // Remover caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${clientName}! Tudo bem? Estamos entrando em contato sobre o seu pacote de ${procedureName}.`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (clientsWithPackages.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          Nenhum pacote em andamento
        </h3>
        <p className="text-muted-foreground">
          Não há clientes com pacotes de procedimentos em andamento no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientsWithPackages.map((client) => {
          const mockAppointment = {
            session_number: client.sessionNumber,
            total_sessions: client.totalSessions,
            procedures: { name: client.procedureName }
          };
          const packageInfo = getPackageInfo(mockAppointment);
          const progress = (client.sessionNumber / client.totalSessions) * 100;

          return (
            <Card key={`${client.id}-${client.procedureId}`} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {client.nome} {client.sobrenome}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {client.procedureName}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    <Package className="h-3 w-3 mr-1" />
                    Pacote
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progresso */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sessões Realizadas</span>
                    <span className="font-semibold">
                      {client.sessionNumber}/{client.totalSessions}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Última sessão */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Última sessão:</span>
                  <span className="font-medium text-foreground">
                    {formatDate(client.lastAppointmentDate)}
                  </span>
                  <span className="text-xs">
                    ({getDaysSince(client.lastAppointmentDate)})
                  </span>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onClientSelect(client.id)}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Ver Ficha
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openWhatsApp(
                      client.celular,
                      `${client.nome} ${client.sobrenome}`,
                      client.procedureName
                    )}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ActivePackagesTab;
