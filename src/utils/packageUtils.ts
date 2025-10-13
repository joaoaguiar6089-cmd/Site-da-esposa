/**
 * Utilitários para lidar com pacotes de sessões de procedimentos
 */

interface PackageSession {
  isPackage: boolean;
  isFirstSession: boolean;
  sessionNumber: number;
  totalSessions: number;
  displayName: string;
  shouldCountValue: boolean;
}

/**
 * Determina se um agendamento faz parte de um pacote e retorna informações sobre a sessão
 */
export function getPackageInfo(appointment: any): PackageSession {
  const totalSessions = appointment.total_sessions || appointment.procedures?.sessions || 1;
  const sessionNumber = appointment.session_number || 1;
  const isPackage = totalSessions > 1;
  const isFirstSession = sessionNumber === 1;
  const procedureName = appointment.procedures?.name || '';

  let displayName = procedureName;
  if (isPackage && !isFirstSession) {
    displayName = `${procedureName} - Retorno - ${sessionNumber}/${totalSessions}`;
  }

  return {
    isPackage,
    isFirstSession,
    sessionNumber,
    totalSessions,
    displayName,
    shouldCountValue: isFirstSession, // Apenas a primeira sessão conta o valor
  };
}

/**
 * Calcula o valor que deve ser considerado para um agendamento de pacote
 * Apenas a primeira sessão tem valor, retornos são zerados
 */
export function getPackageValue(appointment: any): number {
  // Se for marcado como retorno, valor é 0
  if (appointment.return_of_appointment_id) {
    return 0;
  }
  
  const packageInfo = getPackageInfo(appointment);
  
  // Se for pacote e NÃO for a primeira sessão, valor é 0
  if (packageInfo.isPackage && !packageInfo.isFirstSession) {
    return 0;
  }
  
  // Caso contrário, retorna o valor normal
  return appointment.payment_value || appointment.procedures?.price || 0;
}

/**
 * Obtém o status de pagamento considerando o espelhamento de pacotes
 * Para sessões de retorno, busca o status da primeira sessão
 */
export async function getPackagePaymentStatus(appointment: any, supabase: any): Promise<string> {
  // Se não for um pacote ou for a primeira sessão, retorna o status normal
  if (!appointment.package_parent_id) {
    return appointment.payment_status || 'aguardando';
  }

  // Se for uma sessão de retorno, buscar o status da primeira sessão
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('payment_status')
      .eq('id', appointment.package_parent_id)
      .single();

    if (error) throw error;
    return data?.payment_status || 'aguardando';
  } catch (error) {
    console.error('Erro ao buscar status de pagamento do pacote pai:', error);
    return appointment.payment_status || 'aguardando';
  }
}

/**
 * Formata o progresso da sessão para exibição
 */
export function formatSessionProgress(appointment: any): string {
  const packageInfo = getPackageInfo(appointment);
  
  if (!packageInfo.isPackage) {
    return '';
  }
  
  return `${packageInfo.sessionNumber}/${packageInfo.totalSessions} sessões`;
}

/**
 * Reordena as sessões de um pacote após inserções ou exclusões manuais.
 */
export async function recalculatePackageSessions(
  supabaseClient: any,
  clientId: string,
  procedureId: string,
  totalSessions: number
): Promise<void> {
  if (!totalSessions || totalSessions <= 1) {
    return;
  }

  const { data: appointments, error } = await supabaseClient
    .from('appointments')
    .select('id, appointment_date, appointment_time, created_at')
    .eq('client_id', clientId)
    .eq('procedure_id', procedureId)
    .neq('status', 'cancelado');

  if (error) throw error;
  if (!appointments || appointments.length === 0) return;

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time || '00:00'}`);

    if (dateA.getTime() === dateB.getTime()) {
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdA - createdB;
    }

    return dateA.getTime() - dateB.getTime();
  });

  const packageParentId = sortedAppointments[0].id;

  for (let index = 0; index < sortedAppointments.length; index++) {
    const appointment = sortedAppointments[index];

    const updates = {
      session_number: index + 1,
      total_sessions: totalSessions,
      package_parent_id: index === 0 ? null : packageParentId,
    };

    const { error: updateError } = await supabaseClient
      .from('appointments')
      .update(updates)
      .eq('id', appointment.id);

    if (updateError) throw updateError;
  }
}
