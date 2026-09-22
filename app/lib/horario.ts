/*
=========================================================
 HORARIO — CLÍNICA ALBERTO MATAMOROS
=========================================================

Este es el ÚNICO archivo que tendrás que modificar
cuando Alberto te diga su horario real.

IMPORTANTE:
El horario actual es PROVISIONAL.

0 = Domingo
1 = Lunes
2 = Martes
3 = Miércoles
4 = Jueves
5 = Viernes
6 = Sábado
=========================================================
*/

export const DURACION_CITA = 60;

export type TramoHorario = {
  inicio: string;
  fin: string;
};

export type HorarioSemanal = Record<number, TramoHorario[]>;

/*
---------------------------------------------------------
 HORARIO PROVISIONAL
---------------------------------------------------------
*/

export const HORARIO_SEMANAL: HorarioSemanal = {
  0: [],

  1: [
    { inicio: "09:00", fin: "14:00" },
    { inicio: "16:00", fin: "20:00" },
  ],

  2: [
    { inicio: "09:00", fin: "14:00" },
    { inicio: "16:00", fin: "20:00" },
  ],

  3: [
    { inicio: "09:00", fin: "14:00" },
    { inicio: "16:00", fin: "20:00" },
  ],

  4: [
    { inicio: "09:00", fin: "14:00" },
    { inicio: "16:00", fin: "20:00" },
  ],

  5: [
    { inicio: "09:00", fin: "14:00" },
    { inicio: "16:00", fin: "20:00" },
  ],

  6: [],
};

/*
---------------------------------------------------------
 DÍAS COMPLETOS SIN CITAS
---------------------------------------------------------

Formato:

"AAAA-MM-DD"

Ejemplo:

export const DIAS_BLOQUEADOS = [
  "2026-12-24",
  "2026-12-25",
];

*/

export const DIAS_BLOQUEADOS: string[] = [];

/*
---------------------------------------------------------
 GENERACIÓN AUTOMÁTICA DE HORAS
---------------------------------------------------------
*/

function horaAMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);

  return h * 60 + m;
}

function minutosAHora(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generarHorasTramo(
  inicio: string,
  fin: string
) {
  const resultado: string[] = [];

  let actual = horaAMinutos(inicio);
  const limite = horaAMinutos(fin);

  while (actual + DURACION_CITA <= limite) {
    resultado.push(minutosAHora(actual));
    actual += DURACION_CITA;
  }

  return resultado;
}

/*
---------------------------------------------------------
 OBTENER HORARIO DE UNA FECHA
---------------------------------------------------------
*/

export function obtenerHorarios(fecha: string) {
  if (!fecha) return [];

  if (DIAS_BLOQUEADOS.includes(fecha)) {
    return [];
  }

  /*
    Añadimos T12:00:00 para evitar que una fecha pura
    pueda desplazarse de día por cuestiones de zona
    horaria.
  */

  const fechaLocal = new Date(`${fecha}T12:00:00`);

  if (Number.isNaN(fechaLocal.getTime())) {
    return [];
  }

  const diaSemana = fechaLocal.getDay();

  const tramos = HORARIO_SEMANAL[diaSemana] ?? [];

  return tramos.flatMap((tramo) =>
    generarHorasTramo(tramo.inicio, tramo.fin)
  );
}

/*
---------------------------------------------------------
 COMPROBAR SI UNA HORA PERTENECE AL HORARIO
---------------------------------------------------------
*/

export function horaPermitida(
  fecha: string,
  hora: string
) {
  return obtenerHorarios(fecha).includes(hora);
}
