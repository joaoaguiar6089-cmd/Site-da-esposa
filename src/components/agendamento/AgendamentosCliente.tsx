import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Plus, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import type { Client } from "@/pages/Agendamento";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  procedures: {
    name: string;
    duration: number;
    price: number;
  };
}

interface AgendamentosClienteProps {
  client: Client;
  onNewAppointment: () => void;
  onBack: () => void;
}

const AgendamentosCliente = ({ client, onNewAppointment, onBack }: AgendamentosClienteProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadAppointments();
  }, [client.id]);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          procedures!appointments_procedure_id_fkey(name, duration, price)
        `)
        .eq('client_id', client.id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar agendamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'agendado': { label: 'Agendado', variant: 'default' as const },
      'confirmado': { label: 'Confirmado', variant: 'default' as const },
      'realizado': { label: 'Realizado', variant: 'secondary' as const },
      'cancelado': { label: 'Cancelado', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const handlePhoneUpdate = async () => {
    const phoneNumbers = newPhone.replace(/\D/g, '');
    
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      toast({
        title: "Telefone inválido",
        description: "Digite um número válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ celular: phoneNumbers })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Telefone atualizado",
        description: "Seu número foi atualizado com sucesso.",
      });

      setEditingPhone(false);
      setNewPhone("");
    } catch (error) {
      console.error('Erro ao atualizar telefone:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar telefone.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <p>Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-medium">{client.nome} {client.sobrenome}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">CPF</p>
            <p className="font-medium">{formatCPF(client.cpf)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Celular</p>
            {editingPhone ? (
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                  className="flex-1"
                />
                <Button size="sm" onClick={handlePhoneUpdate}>
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingPhone(false);
                    setNewPhone("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-medium">{formatPhone(client.celular)}</p>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setEditingPhone(true);
                    setNewPhone(formatPhone(client.celular));
                  }}
                >
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Agendamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Agendamentos</CardTitle>
          <Button size="sm" onClick={onNewAppointment}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum agendamento encontrado</p>
              <p className="text-sm">Clique em "Novo" para agendar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{appointment.procedures.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(appointment.appointment_date)} às {formatTime(appointment.appointment_time)}
                      </p>
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão Voltar */}
      <Button
        variant="outline"
        onClick={onBack}
        className="w-full flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>
    </div>
  );
};

export default AgendamentosCliente;