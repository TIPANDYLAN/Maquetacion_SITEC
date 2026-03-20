export interface EmpleadoNominaApiPayload {
  CEDULA?: string;
  NOMBRES?: string;
  APELLIDOS?: string;
  PLAN?: string;
  TIPO_PLAN?: string;
  PLAN_CONTRATADO?: string;
  PLAN_CONTRATADO_SALUD?: string;
  TARIFA?: string;
  INGRESO?: string | null;
  SALIDA?: string | null;
  FechaIngreso?: string | null;
  FechaSalida?: string | null;
}

export interface EmpleadoNominaApiItem extends EmpleadoNominaApiPayload {
  json?: EmpleadoNominaApiPayload;
}

export interface NominaCentroCosto {
  IDCENTROCOSTO: string;
  CENTROCOSTO: string;
}

export interface NominaApiResponseBase {
  ok: boolean;
  error?: string;
  details?: string;
}

export type NominaApiRecordResponse<T, RecordKey extends string = 'registro'> =
  NominaApiResponseBase &
  Partial<Record<RecordKey, T>>;

export type NominaApiListResponse<T, ListKey extends string = 'registros'> =
  NominaApiResponseBase &
  Partial<Record<ListKey, T[]>>;

export type NominaApiRecordAndListResponse<
  T,
  RecordKey extends string = 'registro',
  ListKey extends string = 'registros',
> = NominaApiResponseBase &
  Partial<Record<RecordKey, T>> &
  Partial<Record<ListKey, T[]>>;
