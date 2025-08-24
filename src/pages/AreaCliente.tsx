import { useState } from "react";
import LoginCliente from "@/components/cliente/LoginCliente";
import CadastroClientePhone from "@/components/cliente/CadastroClientePhone";
import AreaCliente from "@/components/cliente/AreaCliente";
import type { Client } from "@/types/client";

type ViewMode = 'login' | 'cadastro' | 'area-cliente';

const AreaClientePage = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string>("");

  const handleClientFound = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('area-cliente');
  };

  const handleClientNotFound = (phone: string) => {
    setPendingPhone(phone);
    setCurrentView('cadastro');
  };

  const handleClientRegistered = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('area-cliente');
  };

  const handleBack = () => {
    if (currentView === 'cadastro') {
      setCurrentView('login');
      setPendingPhone("");
    } else {
      window.location.href = '/';
    }
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
    setSelectedClient(null);
    setPendingPhone("");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginCliente
            onClientFound={handleClientFound}
            onClientNotFound={handleClientNotFound}
            onBack={handleBack}
          />
        );
      case 'cadastro':
        return (
          <CadastroClientePhone
            phone={pendingPhone}
            onClientRegistered={handleClientRegistered}
            onBack={handleBack}
          />
        );
      case 'area-cliente':
        return selectedClient ? (
          <AreaCliente
            client={selectedClient}
            onNewAppointment={() => {}}
            onBack={handleBackToLogin}
            onClientUpdate={setSelectedClient}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default AreaClientePage;