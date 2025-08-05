import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginCPF from "@/components/agendamento/LoginCPF";
import CadastroCliente from "@/components/agendamento/CadastroCliente";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import AgendamentosCliente from "@/components/agendamento/AgendamentosCliente";

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
  const navigate = useNavigate();

  const handleClientFound = (foundClient: Client) => {
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
    setStep('novo-agendamento');
  };

  const handleAppointmentCreated = () => {
    setStep('agendamentos');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-elegant">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
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
              onAppointmentCreated={handleAppointmentCreated}
              onBack={() => setStep('agendamentos')}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Agendamento;