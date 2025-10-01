export interface TemplateLocationVariables {
  clinicLocation?: string;
  cityName?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicMapUrl?: string;
}

export interface CitySettingsInfo {
  city_name?: string | null;
  clinic_name?: string | null;
  address?: string | null;
  map_url?: string | null;
}

const sanitize = (value?: string | null): string => (typeof value === 'string' ? value.trim() : '');

const formatFromBlock = (rawBlock: string, iconPrefix = '📍 '): string | null => {
  const lines = rawBlock
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const [first, ...rest] = lines;
  return [iconPrefix + first, ...rest].join('\n');
};

export const formatLocationBlock = (
  templateVariables?: TemplateLocationVariables | null,
  citySettings?: CitySettingsInfo | null,
  options?: {
    defaultClinicName?: string;
    defaultCityName?: string;
    iconPrefix?: string;
  }
): string => {
  const iconPrefix = options?.iconPrefix ?? '📍 ';
  const defaultClinicName = sanitize(options?.defaultClinicName) || 'Clínica Dra. Karoline Ferreira';

  const templateBlock = sanitize(templateVariables?.clinicLocation);
  if (templateBlock) {
    const formatted = formatFromBlock(templateBlock, iconPrefix);
    if (formatted) {
      return formatted;
    }
  }

  const templateCity = sanitize(templateVariables?.cityName);
  const templateClinic = sanitize(templateVariables?.clinicName);
  const templateAddress = sanitize(templateVariables?.clinicAddress);
  const templateMapUrl = sanitize(templateVariables?.clinicMapUrl);

  const cityName = templateCity || sanitize(citySettings?.city_name) || sanitize(options?.defaultCityName);
  const clinicName = templateClinic || sanitize(citySettings?.clinic_name) || defaultClinicName;
  const address = templateAddress || sanitize(citySettings?.address);
  const mapUrl = templateMapUrl || sanitize(citySettings?.map_url);

  const lines: string[] = [];
  const firstLine = cityName ? `${clinicName} - ${cityName}` : clinicName;
  if (firstLine) {
    lines.push(iconPrefix + firstLine);
  }

  if (address) {
    lines.push(address);
  }

  if (mapUrl) {
    lines.push(mapUrl);
  }

  return lines.join('\n');
};
