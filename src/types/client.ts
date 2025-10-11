export interface Client {
  id: string;
  cpf: string;
  nome: string;
  sobrenome: string;
  celular: string;
  data_nascimento?: string;
  cidade?: string;
}

export interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  package_parent_id?: string | null;
  session_number?: number;
  total_sessions?: number;
  procedures: {
    name: string;
    duration: number;
    price: number;
    sessions?: number;
  };
}

export interface Procedure {
  id: string;
  name: string;
  duration: number;
  price: number;
  sessions?: number;
}

export interface ProcedureResult {
  id: string;
  appointment_id: string;
  image_url: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
