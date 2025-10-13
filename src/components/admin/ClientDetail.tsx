import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, User, Phone, CreditCard, Calendar, MapPin, FileText, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCPF } from "@/utils/cpfValidator";
import ClientHeader from "./ClientHeader";
import ProcedureHistory from "./ProcedureHistory";
import PhotoGallery from "./PhotoGallery";
import DocumentsManager from "./DocumentsManager";
import ClientFormsManager from "./ClientFormsManager";

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
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  procedure: {
    name: string;
    duration: number;
    price: number;
  };
  client: {
    id: string;
    nome: string;
    sobrenome: string;
  };
}

interface ProcedureResult {
  id: string;
  appointment_id: string;
  image_url: string;
  description?: string;
  created_at: string;
  procedure_name?: string;
}

interface ClientDetailProps {
  client: Client;
  appointments: Appointment[];
  results: ProcedureResult[];
  onBack: () => void;
  onClientUpdated: () => void;
  onAppointmentUpdated: () => void;
  onResultUploaded: () => void;
}

const ClientDetail = ({ 
  client, 
  appointments, 
  results, 
  onBack, 
  onClientUpdated,
  onAppointmentUpdated,
  onResultUploaded
}: ClientDetailProps) => {
  const [activeTab, setActiveTab] = useState("historico");

  const totalProcedures = appointments.length;
  const completedProcedures = appointments.filter(apt => apt.status === 'realizado').length;
  const scheduledProcedures = appointments.filter(apt => apt.status === 'agendado' || apt.status === 'confirmado').length;
  const totalPhotos = results.length;

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <Button 
        onClick={onBack}
        variant="ghost"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para lista de clientes
      </Button>

      {/* Cabeçalho do Cliente */}
      <ClientHeader 
        client={client}
        totalProcedures={totalProcedures}
        completedProcedures={completedProcedures}
        scheduledProcedures={scheduledProcedures}
        totalPhotos={totalPhotos}
        onClientUpdated={onClientUpdated}
      />

      {/* Abas de Conteúdo */}
      <Card className="border-0 shadow-md">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Histórico de Procedimentos
            </TabsTrigger>
            <TabsTrigger value="fotos" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Galeria de Fotos
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="fichas" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Fichas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="historico" className="mt-6">
            <ProcedureHistory
              appointments={appointments}
              results={results}
              clientId={client.id}
              client={client}
              onAppointmentUpdated={onAppointmentUpdated}
              onResultUploaded={onResultUploaded}
            />
          </TabsContent>
          
          <TabsContent value="fotos" className="mt-6">
            <PhotoGallery
              results={results}
              clientId={client.id}
              onResultUploaded={onResultUploaded}
            />
          </TabsContent>
          
          <TabsContent value="documentos" className="mt-6">
            <DocumentsManager
              clientId={client.id}
              clientName={`${client.nome} ${client.sobrenome}`}
              onDocumentUpdated={onClientUpdated}
            />
          </TabsContent>

          <TabsContent value="fichas" className="mt-6">
            <ClientFormsManager
              clientId={client.id}
              clientName={`${client.nome} ${client.sobrenome}`}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ClientDetail;