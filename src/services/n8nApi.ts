export const N8N_API_CATALOG = {
  movimientosHumanaEmpleados: '/api/n8n/webhook/lista/empleados/nomina/entsal/test',
  empleadosActivos: '/api/n8n/webhook/empleados/activos',
  listaCentroCosto: '/api/n8n/webhook/centrocostos/empleados/test',
  detalleEmpleadoCentroCostos: '/api/n8n/webhook/centrocostos/empleados',
  familiaresEmpleados: '/api/n8n/webhook/detalle/familiares/nomina/test',
} as const;

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

export const getNominaEmployees = async <T = unknown>(): Promise<T> => {
  const response = await fetch(N8N_API_CATALOG.movimientosHumanaEmpleados, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await response.json() as T;
};

export const getNominaEmployeesActive = async <T = unknown>(): Promise<T> => {
  const response = await fetch(N8N_API_CATALOG.empleadosActivos, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await response.json() as T;
};

export const getNominaCostCentersRaw = async <T = N8nCostCenterRawItem[]>(): Promise<T> => {
  const response = await fetch(N8N_API_CATALOG.listaCentroCosto, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return await response.json() as T;
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

  return await response.json() as T;
};
