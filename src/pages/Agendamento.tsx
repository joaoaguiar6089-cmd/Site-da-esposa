import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import LoginCPF from "@/components/agendamento/LoginCPF";
import CadastroCliente from "@/components/agendamento/CadastroCliente";
import AgendamentosCliente from "@/components/agendamento/AgendamentosCliente";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import NewBookingFlow from "@/components/agendamento/NewBookingFlow";
import type { Client } from "@/types/client";

type ViewMode = 'novo-agendamento' | 'cpf' | 'cadastro' | 'agendamentos' | 'agendamento-existente';

const Agendamento = () => {
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<ViewMode>('novo-agendamento');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pendingCPF, setPendingCPF] = useState<string>('');
  const preSelectedProcedureId = searchParams.get('procedimento');

  const handleClientFound = (client: Client) => {
    setSelectedClient(client);
    // Se há procedimento pré-selecionado, vai direto para novo agendamento
    if (preSelectedProcedureId) {
      setCurrentView('novo-agendamento');
    } else {
      setCurrentView('agendamentos');
    }
  };

  const handleClientNotFound = (cpf: string) => {
    setPendingCPF(cpf);
    setCurrentView('cadastro');
  };

  const handleClientRegistered = (client: Client) => {
    setSelectedClient(client);
    // Se há procedimento pré-selecionado, vai direto para novo agendamento
    if (preSelectedProcedureId) {
      setCurrentView('novo-agendamento');
    } else {
      setCurrentView('agendamentos');
    }
  };

  const handleNewAppointment = () => {
    setCurrentView('agendamento-existente');
  };

  const handleAppointmentCreated = () => {
    // Vai para a página inicial ou fecha o modal
    window.history.back();
  };

  const handleNewBookingSuccess = () => {
    // Vai para a página inicial após sucesso no novo fluxo
    window.history.back();
  };

  const handleBack = () => {
    if (currentView === 'cadastro') {
      setCurrentView('cpf');
      setPendingCPF('');
    } else if (currentView === 'agendamento-existente') {
      setCurrentView('agendamentos');
    } else if (currentView === 'agendamentos') {
      setCurrentView('cpf');
      setSelectedClient(null);
    } else if (currentView === 'novo-agendamento') {
      window.history.back();
    } else {
      setCurrentView('cpf');
    }
  };

  const handleAccessExistingAppointments = () => {
    setCurrentView('cpf');
  };

  const handleClientUpdate = (updatedClient: Client) => {
    setSelectedClient(updatedClient);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'novo-agendamento':
        return (
          <NewBookingFlow
            onBack={handleBack}
            onSuccess={handleNewBookingSuccess}
            preSelectedProcedureId={preSelectedProcedureId || undefined}
          />
        );

      case 'cpf':
        return (
          <LoginCPF
            onClientFound={handleClientFound}
            onClientNotFound={handleClientNotFound}
            onBack={handleAccessExistingAppointments}
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
      
      case 'agendamento-existente':
        return selectedClient ? (
          <AgendamentoForm
            client={selectedClient}
            onAppointmentCreated={handleAppointmentCreated}
            onBack={handleBack}
            preSelectedProcedureId={preSelectedProcedureId || undefined}
          />
        ) : null;
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default Agendamento;