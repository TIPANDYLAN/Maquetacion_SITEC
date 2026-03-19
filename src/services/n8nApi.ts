export const N8N_API_CATALOG = {
  nominaEmployees: '/api/n8n/webhook/lista/empleados/nomina/entsal/test',
  nominaCostCenters: '/api/n8n/webhook/centro/costo/nomina',
  humanaDatos: '/api/n8n/webhook/datos/humana',
  getWithBodyProxy: '/api/n8n/get-with-body',
} as const;

const N8N_DEFAULT_API_KEY = 'u37KhX9gYj2Ns5rPAWq4EtZcLVtMoF16';

interface N8nNominaCostCenterRawItem {
  json?: {
    IDCENTROCOSTO?: string;
    CENTROCOSTO?: string;
  };
  IDCENTROCOSTO?: string;
  CENTROCOSTO?: string;
  pairedItem?: unknown;
}

export interface NominaCostCenter {
  IDCENTROCOSTO: string;
  CENTROCOSTO: string;
}

const defaultJsonHeaders = {
  'Content-Type': 'application/json',
};

const buildHeaders = (apiKey?: string): Record<string, string> => {
  const key = String(apiKey ?? N8N_DEFAULT_API_KEY).trim();
  return key
    ? { ...defaultJsonHeaders, 'x-api-key': key }
    : { ...defaultJsonHeaders };
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  const fallback = response.statusText || `HTTP ${response.status}`;
  try {
    const payload = await response.json() as { error?: string; details?: string };
    return payload?.error || payload?.details || fallback;
  } catch {
    return fallback;
  }
};

export const getNominaEmployees = async <T = unknown>(): Promise<T> => {
  const response = await fetch(N8N_API_CATALOG.nominaEmployees, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await response.json() as T;
};

export const getNominaCostCentersRaw = async <T = N8nNominaCostCenterRawItem[]>(): Promise<T> => {
  const response = await fetch(N8N_API_CATALOG.nominaCostCenters, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await response.json() as T;
};

export const getNominaCostCenters = async (): Promise<NominaCostCenter[]> => {
  const data = await getNominaCostCentersRaw<N8nNominaCostCenterRawItem[]>();
  const rows = Array.isArray(data) ? data : [];

  return rows
    .map((item) => {
      const source = (item?.json ?? item ?? {}) as { IDCENTROCOSTO?: string; CENTROCOSTO?: string };
      return {
        IDCENTROCOSTO: String(source.IDCENTROCOSTO || '').trim(),
        CENTROCOSTO: String(source.CENTROCOSTO || '').trim(),
      };
    })
    .filter((item) => item.IDCENTROCOSTO || item.CENTROCOSTO);
};

interface N8nGetWithBodyInput {
  endpoint: string;
  payload?: unknown;
  apiKey?: string;
}

export const n8nGetWithBody = async <T = unknown>(input: N8nGetWithBodyInput): Promise<T> => {
  const response = await fetch(N8N_API_CATALOG.getWithBodyProxy, {
    method: 'POST',
    headers: buildHeaders(input.apiKey),
    body: JSON.stringify({
      endpoint: input.endpoint,
      payload: input.payload ?? {},
      apiKey: String(input.apiKey ?? N8N_DEFAULT_API_KEY).trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await response.json() as T;
};
