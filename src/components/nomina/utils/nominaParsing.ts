export const normalizeHeaderToken = (value: string): string =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.\s\-_]/g, '');

export const parseMoneyValue = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  const raw = value.trim();
  if (!raw) return 0;

  const normalized = raw.includes(',') && raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseCedulaValue = (value: unknown): string => {
  if (typeof value === 'number') {
    const asInt = Math.trunc(value);
    const text = String(asInt);
    return /^\d{10}$/.test(text) ? text : '';
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (/^\d{10}$/.test(text)) return text;

    const decimalMatch = text.match(/^(\d{10})\.0+$/);
    if (decimalMatch) return decimalMatch[1];
  }

  return '';
};

export const normalizeTarifaValue = (value: string, emptyFallback = ''): string => {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return emptyFallback;

  if (raw === 'T' || raw === 'TS') return 'T';
  if (raw === 'T1' || raw === 'T+1' || raw === 'TD') return 'T+1';
  if (raw === 'TF' || raw === 'T+F' || raw === 'T+FAMILIA' || raw === 'T+FAMILIAR') return 'T+FAMILIAR';

  if (raw.includes('FAMILIAR') || raw.includes('FAMILIA')) return 'T+FAMILIAR';
  if (raw.includes('+1')) return 'T+1';

  return String(value || '').trim().toUpperCase();
};
