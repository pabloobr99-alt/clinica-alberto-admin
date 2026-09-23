import "server-only";
import { google } from "googleapis";
import { DURACION_CITA } from "@/app/lib/horario";
import { getGoogleOAuthClient } from "@/app/lib/google-calendar";
import {
  obtenerSupabasePrivado,
  descifrarToken,
} from "@/app/lib/google-calendar-security";

const ZONA = "Europe/Madrid";

function offsetMadrid(fecha: string) {
  const mediodia = new Date(`${fecha}T12:00:00Z`);

  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    timeZoneName: "shortOffset",
  }).formatToParts(mediodia);

  const zona = partes.find(
    (parte) => parte.type === "timeZoneName"
  )?.value;

  if (zona === "GMT+2") return "+02:00";
  if (zona === "GMT+1") return "+01:00";

  throw new Error("No se ha podido determinar la zona horaria.");
}

function inicioUTC(fecha: string, hora: string) {
  return new Date(
    `${fecha}T${hora}:00${offsetMadrid(fecha)}`
  ).getTime();
}

export async function consultarHorasOcupadas(
  fecha: string,
  horarios: string[]
): Promise<Set<string>> {
  const supabase = obtenerSupabasePrivado();

  const { data, error } = await supabase
    .from("google_calendar_config")
    .select("refresh_token_encrypted,calendar_id")
    .eq("id", 1)
    .single();

  if (error || !data?.refresh_token_encrypted) {
    throw new Error("Google Calendar no está conectado.");
  }

  const oauth = getGoogleOAuthClient();

  oauth.setCredentials({
    refresh_token: descifrarToken(
      data.refresh_token_encrypted
    ),
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauth,
  });

  const comienzo = inicioUTC(fecha, "00:00");
  const final = comienzo + 48 * 60 * 60 * 1000;

  const calendarId = data.calendar_id || "primary";

  const respuesta = await calendar.freebusy.query({
    requestBody: {
      timeMin: new Date(
        comienzo - 24 * 60 * 60 * 1000
      ).toISOString(),
      timeMax: new Date(final).toISOString(),
      items: [{ id: calendarId }],
    },
  });

  const calendario = respuesta.data.calendars?.[calendarId];

  if (!calendario || calendario.errors?.length) {
    throw new Error(
      "Google no ha podido consultar la disponibilidad."
    );
  }

  const eventos = calendario.busy;

  if (!eventos) {
    throw new Error("Google no ha devuelto la disponibilidad.");
  }

  const ocupadas = new Set<string>();

  for (const hora of horarios) {
    const inicio = inicioUTC(fecha, hora);
    const fin = inicio + DURACION_CITA * 60 * 1000;

    const existeSolapamiento = eventos.some((evento) => {
      if (!evento.start || !evento.end) return false;

      const eventoInicio = new Date(evento.start).getTime();
      const eventoFin = new Date(evento.end).getTime();

      return inicio < eventoFin && fin > eventoInicio;
    });

    if (existeSolapamiento) {
      ocupadas.add(hora);
    }
  }

  return ocupadas;
}
