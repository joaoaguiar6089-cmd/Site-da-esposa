import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthContext";
import { TimezoneProvider } from "@/hooks/useTimezone";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Agendamento from "./pages/Agendamento";
import AreaClientePage from "./pages/AreaCliente";
import Admin from "./pages/Admin";
import AdminFormsTest from "./pages/AdminFormsTest";
import AdminFormEditor from "./pages/AdminFormEditor";
import AuthPage from "./components/auth/AuthPage";
import CategoryProcedures from "./pages/CategoryProcedures";
import ClientFormsList from "./components/cliente/forms/ClientFormsList";
import FormFiller from "./components/cliente/forms/FormFiller";
import FormViewer from "./components/cliente/forms/FormViewer";

const queryClient = new QueryClient();

const App = () => {
  console.log('🔍 App.tsx loaded - Routes registered');
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TimezoneProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/agendamento" element={<Agendamento />} />
            <Route path="/area-cliente" element={<AreaClientePage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/forms" element={<AdminFormsTest />} />
            <Route path="/admin/forms/:id" element={<AdminFormEditor />} />
            <Route path="/area-cliente/forms" element={<ClientFormsList />} />
            <Route path="/area-cliente/forms/fill/:id" element={<FormFiller />} />
            <Route path="/area-cliente/forms/view/:id" element={<FormViewer />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/categoria/:categoryId" element={<CategoryProcedures />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TimezoneProvider>
  </AuthProvider>
</QueryClientProvider>
  );
};

export default App;
