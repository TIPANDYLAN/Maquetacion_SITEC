export const N8N_API_CATALOG = {
  movimientosHumanaEmpleados: '/api/n8n/webhook/lista/empleados/nomina/entsal',
  empleadosActivos: '/api/n8n/webhook/empleados/activos',
  listaCentroCosto: '/api/n8n/webhook/centrocostos/empleados',
  listaCentroCostoFallback: '/api/n8n/webhook/centrocostos/empleados/test',
  detalleEmpleadoCentroCostos: '/api/n8n/webhook/centrocostos/empleados',
  familiaresEmpleados: '/api/n8n/webhook/detalle/familiares/nomina',
  empleadosDistribucion: '/api/n8n/webhook/empleados/distribucion',
} as const;
export interface EmpleadoDistribucionApiItem {
  COD_MFEMP: number|string;
  DOCI_MFEMP: string;
  NOMBRES: string;
  APELLIDOS: string;
  COD_MFCC: string;
  DSC_MFCC: string;
  DSC_MFDPT: string;
  COD_DISTRIBUCION: string;
}

export const getEmpleadosDistribucion = async <T = EmpleadoDistribucionApiItem[]>(): Promise<T> => {
  const response = await fetch(N8N_API_CATALOG.empleadosDistribucion, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return await parseJsonResponse<T>(response, [] as unknown as T);
};

const N8N_DEFAULT_API_KEY = 'u37KhX9gYj2Ns5rPAWq4EtZcLVtMoF16';

interface N8nCostCenterRawItem {
  COD_CCOSTO?: string;
  NOMBRE?: string;
  estado?: string;
  Acuerdo_Horas?: string;
  Acuerdo_Movilizacion?: string;
  Tipo?: string;
}

export interface NominaCostCenter {
  IDCENTROCOSTO: string;
  CENTROCOSTO: string;
  estado?: string;
  Acuerdo_Horas?: string;
  Acuerdo_Movilizacion?: string;
  Tipo?: string;
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

const parseJsonResponse = async <T>(response: Response, fallback: T): Promise<T> => {
  if (response.status === 204 || response.status === 205) {
    return fallback;
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return fallback;
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('Respuesta JSON invalida del servicio n8n');
  }
};

const fetchGetWithRetry = async (url: string, retries = 1): Promise<Response> => {
  let lastResponse: Response | null = null;

  for (let intento = 0; intento <= retries; intento += 1) {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });

    lastResponse = response;
    if (response.ok) {
      return response;
    }

    const status = Number(response.status || 0);
    const esErrorServidor = status >= 500 && status <= 599;
    if (!esErrorServidor || intento === retries) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return lastResponse as Response;
};

export const getNominaEmployees = async <T = unknown>(): Promise<T> => {
  const response = await fetchGetWithRetry(N8N_API_CATALOG.movimientosHumanaEmpleados);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await parseJsonResponse<T>(response, [] as unknown as T);
};

export const getNominaEmployeesActive = async <T = unknown>(): Promise<T> => {
  const response = await fetchGetWithRetry(N8N_API_CATALOG.empleadosActivos);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await parseJsonResponse<T>(response, [] as unknown as T);
};

export const getNominaCostCentersRaw = async <T = N8nCostCenterRawItem[]>(): Promise<T> => {
  const response = await fetchGetWithRetry(N8N_API_CATALOG.listaCentroCosto);

  if (!response.ok) {
    const responseFallback = await fetchGetWithRetry(N8N_API_CATALOG.listaCentroCostoFallback);
    if (!responseFallback.ok) {
      throw new Error(await parseErrorMessage(responseFallback));
    }
    return await parseJsonResponse<T>(responseFallback, [] as unknown as T);
  }

  const data = await parseJsonResponse<T>(response, [] as unknown as T);
  if (Array.isArray(data) && data.length === 0) {
    const responseFallback = await fetchGetWithRetry(N8N_API_CATALOG.listaCentroCostoFallback);
    if (responseFallback.ok) {
      return await parseJsonResponse<T>(responseFallback, [] as unknown as T);
    }
  }

  return data;
};

export const getNominaCostCenters = async (): Promise<NominaCostCenter[]> => {
  const data = await getNominaCostCentersRaw<N8nCostCenterRawItem[]>();
  const rows = Array.isArray(data) ? data : [];

  return rows
    .map((item) => ({
      IDCENTROCOSTO: String(item?.COD_CCOSTO || '').trim(),
      CENTROCOSTO: String(item?.NOMBRE || '').trim(),
      estado: String(item?.estado || '').trim(),
      Acuerdo_Horas: String(item?.Acuerdo_Horas || '').trim(),
      Acuerdo_Movilizacion: String(item?.Acuerdo_Movilizacion || '').trim(),
      Tipo: String(item?.Tipo || '').trim(),
    }))
    .filter((item) => item.IDCENTROCOSTO || item.CENTROCOSTO);
};

interface N8nDirectPostInput {
  url: string;
  payload?: unknown;
  apiKey?: string;
}

export const n8nPostDirect = async <T = unknown>(input: N8nDirectPostInput): Promise<T> => {
  const response = await fetch(input.url, {
    method: 'POST',
    headers: buildHeaders(input.apiKey),
    body: JSON.stringify(input.payload ?? {}),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await parseJsonResponse<T>(response, {} as T);
};
