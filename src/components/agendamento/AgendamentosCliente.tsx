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
  onClientUpdate?: (updatedClient: Client) => void; // Nova prop para atualizar cliente pai
}

const AgendamentosCliente = ({ 
  client, 
  onNewAppointment, 
  onBack,
  onClientUpdate 
}: AgendamentosClienteProps) => {
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
    if (!phone) return '';
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
      // Primeiro, busque o user_id associado ao cliente
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('cpf', client.cpf)
        .single();

      if (profileError) throw profileError;

      // Transação para atualizar em duas tabelas
      const { data, error } = await supabase.rpc('update_client_phone', {
        p_client_id: client.id,
        p_user_id: profileData.user_id,
        p_phone: phoneNumbers
      });

      if (error) throw error;

      // Atualizar o objeto cliente local
      const updatedClient = {
        ...client,
        celular: phoneNumbers
      };

      // Chamar a função de atualização do componente pai, se existir
      if (onClientUpdate) {
        onClientUpdate(updatedClient);
      }

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

  // Resto do código permanece igual...

  return (
    // Código anterior permanece o mesmo
  );
};

export default AgendamentosCliente;