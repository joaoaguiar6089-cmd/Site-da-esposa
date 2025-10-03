const BROKEN_SEQUENCE = /[\u00C2-\u00F4][\u0080-\u00BF]/;
const REPLACEMENT_CHAR = /\uFFFD/;

const hasEncodingAnomalies = (value: string): boolean => {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  return BROKEN_SEQUENCE.test(value) || REPLACEMENT_CHAR.test(value);
};

export const fixTextEncoding = (value: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    return value;
  }

  if (!hasEncodingAnomalies(value)) {
    return value;
  }

  const bytes = Uint8Array.from(
    Array.from(value, (char) => char.charCodeAt(0) & 0xff),
  );

  const tryTextDecoder = () => {
    if (typeof TextDecoder === "undefined") {
      return null;
    }
    try {
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return decoded;
    } catch {
      return null;
    }
  };

  const decoded = tryTextDecoder();
  if (decoded && !hasEncodingAnomalies(decoded)) {
    return decoded;
  }

  try {
    const percentEncoded = Array.from(bytes, (byte) => `%${byte.toString(16).padStart(2, "0")}`).join("");
    const fallbackDecoded = decodeURIComponent(percentEncoded);
    if (!hasEncodingAnomalies(fallbackDecoded)) {
      return fallbackDecoded;
    }
  } catch {
    // ignore and fall through
  }

  return decoded ?? value;
};

export const sanitizeSupabaseData = <T>(input: T): T => {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    return fixTextEncoding(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeSupabaseData(item)) as unknown as T;
  }

  if (typeof input === "object") {
    if (input instanceof Date || input instanceof Uint8Array) {
      return input;
    }

    const entries = Object.entries(input as Record<string, unknown>).map(([key, value]) => [
      key,
      sanitizeSupabaseData(value),
    ]);

    return Object.fromEntries(entries) as unknown as T;
  }

  return input;
};
