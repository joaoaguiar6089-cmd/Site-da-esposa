export interface Client {
  id: string;
  cpf: string;
  nome: string;
  sobrenome: string;
  celular: string;
}

export interface Appointment {
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

export interface Procedure {
  id: string;
  name: string;
  duration: number;
  price: number;
}
