import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginCPF from "@/components/agendamento/LoginCPF";
import CadastroCliente from "@/components/agendamento/CadastroCliente";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import AgendamentosCliente from "@/components/agendamento/AgendamentosCliente";
import { supabase } from "@/integrations/supabase/client";

export interface Client {
  id: string;
  cpf: string;
  nome: string;
  sobrenome: string;
  celular: string;
}

const Agendamento = () => {
  const [step, setStep] = useState<'login' | 'cadastro' | 'agendamentos' | 'novo-agendamento'>('login');
  const [client, setClient] = useState<Client | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleClientFound = (foundClient: Client) => {
    console.log("Cliente encontrado:", foundClient);
    setClient(foundClient);
    setStep('agendamentos');
  };

  const handleClientNotFound = () => {
    setStep('cadastro');
  };

  const handleClientRegistered = (newClient: Client) => {
    setClient(newClient);
    setStep('novo-agendamento');
  };

  const handleNewAppointment = () => {
    console.log("Criando novo agendamento para cliente:", client);
    setStep('novo-agendamento');
  };

  const handleAppointmentCreated = () => {
    setStep('agendamentos');
  };

  const handleBack = () => {
    navigate('/');
  };

  // Carregar dados do agendamento para edição
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setEditingId(editId);
      loadAppointmentForEdit(editId);
    }
  }, [searchParams]);

  const loadAppointmentForEdit = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients!appointments_client_id_fkey(*)
        `)
        .eq('id', appointmentId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.error('Agendamento não encontrado');
        navigate('/agendamento');
        return;
      }

      setClient(data.clients);
      setStep('novo-agendamento');
    } catch (error) {
      console.error('Erro ao carregar agendamento:', error);
      navigate('/agendamento');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-elegant">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Debug info */}
          <div className="mb-4 p-2 bg-gray-100 text-sm">
            <p>Step: {step}</p>
            <p>Client: {client ? `${client.nome} ${client.sobrenome}` : 'null'}</p>
            <p>EditingId: {editingId || 'null'}</p>
          </div>
          
          {step === 'login' && (
            <LoginCPF 
              onClientFound={handleClientFound}
              onClientNotFound={handleClientNotFound}
              onBack={handleBack}
            />
          )}
          
          {step === 'cadastro' && (
            <CadastroCliente 
              onClientRegistered={handleClientRegistered}
              onBack={() => setStep('login')}
            />
          )}
          
          {step === 'agendamentos' && client && (
            <AgendamentosCliente 
              client={client}
              onNewAppointment={handleNewAppointment}
              onBack={() => setStep('login')}
            />
          )}
          
          {step === 'novo-agendamento' && client && (
            <AgendamentoForm 
              client={client}
              editingId={editingId || undefined}
              onAppointmentCreated={handleAppointmentCreated}
              onBack={() => editingId ? navigate('/admin') : setStep('agendamentos')}
            />
          )}
          
          {step === 'novo-agendamento' && !client && (
            <div className="text-center text-red-500">
              <p>Erro: Cliente não encontrado</p>
              <button onClick={() => setStep('login')}>Voltar ao login</button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Agendamento;