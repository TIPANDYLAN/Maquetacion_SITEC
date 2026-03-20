export interface HumanaEmployeeData {
  apellidos: string;
  nombres: string;
  cedula: string;
  centroCosto: string;
  fechaNacimiento: string;
  estadoCivil: string;
  tarifa: string;
  parentesco: string;
  genero: string;
  fechaSolicitud: string;
  fechaInclusion: string;
  fechaExclusion: string;
  plan: string;
  cobertura: number;
  prima: number;
  ajuste: number;
  humanaAssist: number;
  seguroCampesino: number;
  urbapark: number;
  sssCampesino: number;
  totalUrbapark: number;
  trabajador: number;
  total: number;
  diferencia: number;
}

export interface HumanaDataByPeriod {
  anio: number;
  mes: string;
  empleados: HumanaEmployeeData[];
  archivo: string;
  fechaCarga: number;
}