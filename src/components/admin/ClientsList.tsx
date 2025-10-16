import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Phone, MapPin, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateToBrazil } from "@/utils/dateUtils";
import { formatCPF } from "@/utils/cpfValidator";

interface Client {
  id: string;
  cpf: string;
  nome: string;
  sobrenome: string;
  celular: string;
  data_nascimento?: string;
  cidade?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  client: {
    id: string;
    nome: string;
    sobrenome: string;
  };
  status: string;
  appointment_date: string;
}

interface ClientsListProps {
  clients: Client[];
  appointments: Appointment[];
  onClientSelect: (client: Client) => void;
  loading: boolean;
}

const ClientsList = ({ clients, appointments, onClientSelect, loading }: ClientsListProps) => {
  const getClientStats = (clientId: string) => {
    const clientAppointments = appointments.filter(apt => apt.client.id === clientId);
    const totalAppointments = clientAppointments.length;
    const realizados = clientAppointments.filter(apt => apt.status === 'realizado').length;
    const agendados = clientAppointments.filter(apt => apt.status === 'agendado' || apt.status === 'confirmado').length;
    
    return { totalAppointments, realizados, agendados };
  };

  const getLastAppointment = (clientId: string) => {
    const clientAppointments = appointments
      .filter(apt => apt.client.id === clientId)
      .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
    
    return clientAppointments[0];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Carregando clientes...</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          Nenhum cliente encontrado
        </h3>
        <p className="text-muted-foreground">
          Tente ajustar os filtros ou cadastre um novo cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => {
        const stats = getClientStats(client.id);
        const lastAppointment = getLastAppointment(client.id);
        
        return (
          <Card 
            key={client.id}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-0 shadow-sm"
            onClick={() => onClientSelect(client)}
          >
            <CardContent className="p-5">
              <div className="space-y-4">
                {/* Header com nome e avatar */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground truncate">
                      {client.nome} {client.sobrenome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {client.celular}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informações básicas */}
                <div className="space-y-2">
                  {client.cpf && !client.cpf.startsWith('temp_') && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-3 w-3" />
                      <span>{formatCPF(client.cpf)}</span>
                    </div>
                  )}
                  
                  {client.data_nascimento && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateToBrazil(client.data_nascimento)}</span>
                    </div>
                  )}
                  
                  {client.cidade && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{client.cidade}</span>
                    </div>
                  )}
                </div>

                {/* Estatísticas */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {stats.totalAppointments} {stats.totalAppointments === 1 ? 'procedimento' : 'procedimentos'}
                  </Badge>
                  
                  {stats.realizados > 0 && (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                      {stats.realizados} realizado{stats.realizados !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  
                  {stats.agendados > 0 && (
                    <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {stats.agendados} agendado{stats.agendados !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Último agendamento */}
                {lastAppointment && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Último: {format(new Date(lastAppointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ClientsList;