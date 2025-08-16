import { useState } from "react";
import LoginCPF from "@/components/agendamento/LoginCPF";
import CadastroCliente from "@/components/agendamento/CadastroCliente";
import AgendamentosCliente from "@/components/agendamento/AgendamentosCliente";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import type { Client } from "@/types/client";

type ViewMode = 'cpf' | 'cadastro' | 'agendamentos' | 'novo-agendamento';

const Agendamento = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('cpf');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pendingCPF, setPendingCPF] = useState<string>('');

  const handleClientFound = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('agendamentos');
  };

  const handleClientNotFound = (cpf: string) => {
    setPendingCPF(cpf);
    setCurrentView('cadastro');
  };

  const handleClientRegistered = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('agendamentos');
  };

  const handleNewAppointment = () => {
    setCurrentView('novo-agendamento');
  };

  const handleAppointmentCreated = () => {
    setCurrentView('agendamentos');
  };

  const handleBack = () => {
    if (currentView === 'cadastro') {
      setCurrentView('cpf');
      setPendingCPF('');
    } else if (currentView === 'novo-agendamento') {
      setCurrentView('agendamentos');
    } else if (currentView === 'agendamentos') {
      setCurrentView('cpf');
      setSelectedClient(null);
    } else {
      setCurrentView('cpf');
    }
  };

  const handleClientUpdate = (updatedClient: Client) => {
    setSelectedClient(updatedClient);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'cpf':
        return (
          <LoginCPF
            onClientFound={handleClientFound}
            onClientNotFound={handleClientNotFound}
            onBack={() => window.history.back()}
          />
        );
      
      case 'cadastro':
        return (
          <CadastroCliente
            cpf={pendingCPF}
            onClientRegistered={handleClientRegistered}
            onBack={handleBack}
          />
        );
      
      case 'agendamentos':
        return selectedClient ? (
          <AgendamentosCliente
            client={selectedClient}
            onNewAppointment={handleNewAppointment}
            onBack={handleBack}
            onClientUpdate={handleClientUpdate}
          />
        ) : null;
      
      case 'novo-agendamento':
        return selectedClient ? (
          <AgendamentoForm
            client={selectedClient}
            onAppointmentCreated={handleAppointmentCreated}
            onBack={handleBack}
          />
        ) : null;
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {renderCurrentView()}
    </div>
  );
};

export default Agendamento;