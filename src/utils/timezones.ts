/**
 * Fusos Horários do Brasil
 * Baseado na divisão oficial de fusos horários brasileiros
 */

export interface BrazilianTimezone {
  value: string; // IANA timezone identifier
  label: string; // Nome amigável
  offset: string; // Offset UTC
  states: string[]; // Estados que usam este fuso
}

export const BRAZILIAN_TIMEZONES: BrazilianTimezone[] = [
  {
    value: 'America/Noronha',
    label: 'Fernando de Noronha (UTC-2)',
    offset: 'UTC-2',
    states: ['Fernando de Noronha']
  },
  {
    value: 'America/Sao_Paulo',
    label: 'Brasília (UTC-3)',
    offset: 'UTC-3',
    states: [
      'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Espírito Santo',
      'Bahia', 'Sergipe', 'Alagoas', 'Pernambuco', 'Paraíba',
      'Rio Grande do Norte', 'Ceará', 'Piauí', 'Maranhão',
      'Tocantins', 'Goiás', 'Distrito Federal',
      'Paraná', 'Santa Catarina', 'Rio Grande do Sul'
    ]
  },
  {
    value: 'America/Manaus',
    label: 'Manaus (UTC-4)',
    offset: 'UTC-4',
    states: [
      'Amazonas', 'Roraima', 'Rondônia', 'Mato Grosso', 'Mato Grosso do Sul'
    ]
  },
  {
    value: 'America/Rio_Branco',
    label: 'Acre (UTC-5)',
    offset: 'UTC-5',
    states: ['Acre']
  }
];

/**
 * Retorna o timezone padrão (Brasília)
 */
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna o nome amigável de um timezone
 */
export function getTimezoneName(timezoneValue: string): string {
  const tz = BRAZILIAN_TIMEZONES.find(t => t.value === timezoneValue);
  return tz?.label || 'Brasília (UTC-3)';
}

/**
 * Retorna o offset UTC de um timezone
 */
export function getTimezoneOffset(timezoneValue: string): string {
  const tz = BRAZILIAN_TIMEZONES.find(t => t.value === timezoneValue);
  return tz?.offset || 'UTC-3';
}
