import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

// Fuso horário padrão (Brasília UTC-3)
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

// Cache do timezone atual
let cachedTimezone: string | null = null;
let timezonePromise: Promise<string> | null = null;

/**
 * Obtém o timezone configurado no sistema (com cache)
 */
async function getSystemTimezone(): Promise<string> {
  // Retornar do cache se já tiver
  if (cachedTimezone) {
    return cachedTimezone;
  }

  // Se já houver uma requisição em andamento, reutilizar
  if (timezonePromise) {
    return timezonePromise;
  }

  // Criar nova requisição
  timezonePromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('setting_value')
        .eq('setting_key', 'timezone')
        .single();

      if (error) {
        console.error('Erro ao carregar timezone:', error);
        cachedTimezone = DEFAULT_TIMEZONE;
        return DEFAULT_TIMEZONE;
      }

      cachedTimezone = (data as any)?.setting_value || DEFAULT_TIMEZONE;
      return cachedTimezone;
    } catch (error) {
      console.error('Erro ao carregar timezone:', error);
      cachedTimezone = DEFAULT_TIMEZONE;
      return DEFAULT_TIMEZONE;
    } finally {
      // Limpar a promise para permitir novas requisições se necessário
      timezonePromise = null;
    }
  })();

  return timezonePromise;
}

/**
 * Limpa o cache do timezone (usar quando o timezone for atualizado)
 */
export function clearTimezoneCache(): void {
  cachedTimezone = null;
  timezonePromise = null;
}

// Manter BRAZIL_TIMEZONE para compatibilidade com código existente
// mas usar função assíncrona internamente
const BRAZIL_TIMEZONE = DEFAULT_TIMEZONE;

/**
 * Convert a date string (YYYY-MM-DD) to Brazil timezone and format as DD/MM/YYYY
 */
export function formatDateToBrazil(dateString: string): string {
  if (!dateString) return '';
  
  try {
    // Create date from string treating it as local date (without timezone conversion)
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    
    // Simply reformat the string components to avoid timezone issues
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Convert a date to Brazil timezone (assíncrona - usa timezone configurado)
 */
export async function toBrazilTimezone(date: Date): Promise<Date> {
  const timezone = await getSystemTimezone();
  return toZonedTime(date, timezone);
}

/**
 * Convert a date from Brazil timezone to UTC (assíncrona - usa timezone configurado)
 */
export async function fromBrazilTimezone(date: Date): Promise<Date> {
  const timezone = await getSystemTimezone();
  return fromZonedTime(date, timezone);
}

/**
 * Convert a date to Brazil timezone (síncrona - usa cache ou padrão)
 * Use esta versão quando não puder usar async/await
 */
export function toBrazilTimezoneSync(date: Date): Date {
  const timezone = cachedTimezone || DEFAULT_TIMEZONE;
  return toZonedTime(date, timezone);
}

/**
 * Convert a date from Brazil timezone to UTC (síncrona - usa cache ou padrão)
 * Use esta versão quando não puder usar async/await
 */
export function fromBrazilTimezoneSync(date: Date): Date {
  const timezone = cachedTimezone || DEFAULT_TIMEZONE;
  return fromZonedTime(date, timezone);
}

/**
 * Format a date string to Brazilian format with timezone consideration
 * Usa a versão síncrona (com cache ou padrão)
 */
export function formatDateTimeToBrazil(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    const brazilDate = toBrazilTimezoneSync(date);
    return format(brazilDate, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return dateString;
  }
}

/**
 * Get current date in Brazil timezone formatted as YYYY-MM-DD
 * Usa a versão síncrona (com cache ou padrão)
 */
export function getCurrentDateBrazil(): string {
  const now = new Date();
  const brazilDate = toBrazilTimezoneSync(now);
  return format(brazilDate, 'yyyy-MM-dd');
}

/**
 * Get current datetime in Brazil timezone
 * Usa a versão síncrona (com cache ou padrão)
 */
export function getCurrentDateTimeBrazil(): Date {
  return toBrazilTimezoneSync(new Date());
}

/**
 * Get tomorrow's date in Brazil timezone formatted as YYYY-MM-DD
 * Usa a versão síncrona (com cache ou padrão)
 */
export function getTomorrowDateBrazil(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const brazilDate = toBrazilTimezoneSync(tomorrow);
  return format(brazilDate, 'yyyy-MM-dd');
}

/**
 * Ensure a date string is treated as Brazil date and formatted correctly
 */
export function ensureBrazilDateFormat(dateString: string): string {
  if (!dateString) return '';
  
  // If already in DD/MM/YYYY format, return as is
  if (dateString.includes('/')) {
    return dateString;
  }
  
  // If in YYYY-MM-DD format, convert to DD/MM/YYYY
  if (dateString.includes('-') && dateString.length === 10) {
    return formatDateToBrazil(dateString);
  }
  
  return dateString;
}