-- Add payment fields to appointments table
alter table public.appointments
  add column if not exists payment_status text check (payment_status in ('aguardando', 'nao_pago', 'pago_parcialmente', 'pago')),
  add column if not exists payment_method text check (payment_method in ('pix', 'cartao', 'dinheiro')),
  add column if not exists payment_value numeric,
  add column if not exists payment_installments integer check (payment_installments >= 1 and payment_installments <= 12),
  add column if not exists payment_notes text;

-- Create index for payment status queries
create index if not exists idx_appointments_payment_status on public.appointments(payment_status);

comment on column public.appointments.payment_status is 'Status de pagamento: aguardando (sem info), nao_pago, pago_parcialmente, pago';
comment on column public.appointments.payment_method is 'Forma de pagamento: pix, cartao, dinheiro';
comment on column public.appointments.payment_value is 'Valor pago';
comment on column public.appointments.payment_installments is 'Número de parcelas (para cartão)';
comment on column public.appointments.payment_notes is 'Observações sobre o pagamento';
