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
 * Cada sessão tem seu próprio valor de pagamento
 */
export function getPackageValue(appointment: any): number {
  // Retorna o valor registrado no pagamento ou o preço do procedimento
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
