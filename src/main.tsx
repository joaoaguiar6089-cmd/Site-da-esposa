import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AuthProvider } from "./components/auth/AuthContext.tsx";
import { TimezoneProvider } from "./hooks/useTimezone";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import Resumo from "./pages/Resumo.tsx";
import Agendamento from "./pages/Agendamento.tsx";
import AreaClientePage from "./pages/AreaCliente.tsx";
import NotFound from "./pages/NotFound.tsx";
import CategoryProcedures from "./pages/CategoryProcedures.tsx";
import SubcategoryProcedures from "./pages/SubcategoryProcedures.tsx";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
  {
    path: "/resumo",
    element: <Resumo />,
  },
  {
    path: "/agendamento",
    element: <Agendamento />,
  },
  {
    path: "/area-cliente",
    element: <AreaClientePage />,
  },
  {
    path: "/categoria/:categoryId",
    element: <CategoryProcedures />,
  },
  {
    path: "/subcategoria/:subcategoryId",
    element: <SubcategoryProcedures />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TimezoneProvider>
          <RouterProvider router={router} />
        </TimezoneProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
