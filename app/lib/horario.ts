export type DiaSemana =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

export const DURACION_CITA = 60;

/*
  HORARIO PROVISIONAL.

  Cuando Alberto te dé el horario real,
  SOLO tendremos que modificar este objeto.

  Ejemplo:
  lunes: ["09:00", "10:00", "11:00"]
*/

export const HORARIO: Record<DiaSemana, string[]> = {
  lunes: [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ],

  martes: [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ],

  miercoles: [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ],

  jueves: [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ],

  viernes: [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ],

  sabado: [],

  domingo: [],
};

const DIAS: DiaSemana[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export function obtenerHorarios(fecha: string) {
  const date = new Date(`${fecha}T12:00:00`);
  const dia = DIAS[date.getDay()];

  return HORARIO[dia] ?? [];
}
