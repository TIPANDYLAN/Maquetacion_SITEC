import type { HumanaDataByPeriod, HumanaEmployeeData } from './humanaStorage';

interface PeriodSummary {
  anio: number;
  mes: string;
  archivo: string;
  fechaCarga: number;
}

const leerErrorRespuesta = async (response: Response, accion: string) => {
  const body = (await response.text()).trim();
  const detalle = body || `HTTP ${response.status} ${response.statusText}`;
  throw new Error(`${accion}: ${detalle}`);
};

export const humanaApi = {
  saveData: async (anio: number, mes: string, empleados: HumanaEmployeeData[], archivo: string) => {
    try {
      const response = await fetch(`/api/humana/periods/${anio}/${encodeURIComponent(mes)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archivo, empleados }),
      });

      if (!response.ok) {
        await leerErrorRespuesta(response, 'No se pudo guardar en BD');
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('No se pudo guardar en BD: no hay conexion con el backend de Humana');
    }
  },

  getData: async (anio: number, mes: string): Promise<HumanaDataByPeriod | null> => {
    try {
      const response = await fetch(`/api/humana/periods/${anio}/${encodeURIComponent(mes)}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        await leerErrorRespuesta(response, 'No se pudo consultar periodo');
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('No se pudo consultar periodo: no hay conexion con el backend de Humana');
    }
  },

  getAvailablePeriods: async (): Promise<PeriodSummary[]> => {
    try {
      const response = await fetch('/api/humana/periods');

      if (!response.ok) {
        await leerErrorRespuesta(response, 'No se pudieron consultar periodos');
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('No se pudieron consultar periodos: no hay conexion con el backend de Humana');
    }
  },
};
