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

export const humanaStorage = {
    saveData: (anio: number, mes: string, empleados: HumanaEmployeeData[], archivo: string) => {
        const key = `humana_data_${anio}_${mes}`;
        const data: HumanaDataByPeriod = {
            anio,
            mes,
            empleados,
            archivo,
            fechaCarga: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(data));
    },

    getData: (anio: number, mes: string): HumanaDataByPeriod | null => {
        const key = `humana_data_${anio}_${mes}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    getAvailablePeriods: (): Array<{ anio: number; mes: string; archivo: string; fechaCarga: number }> => {
        const periods: Array<{ anio: number; mes: string; archivo: string; fechaCarga: number }> = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('humana_data_')) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed: HumanaDataByPeriod = JSON.parse(data);
                        periods.push({
                            anio: parsed.anio,
                            mes: parsed.mes,
                            archivo: parsed.archivo,
                            fechaCarga: parsed.fechaCarga,
                        });
                    } catch (e) {
                        console.error('Error parsing stored data', e);
                    }
                }
            }
        }
        return periods.sort((a, b) => b.fechaCarga - a.fechaCarga);
    },

    deleteData: (anio: number, mes: string) => {
        const key = `humana_data_${anio}_${mes}`;
        localStorage.removeItem(key);
    },

    clearAll: () => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('humana_data_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    },
};
