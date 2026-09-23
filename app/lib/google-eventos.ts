import "server-only";

import { google } from "googleapis";
import { DURACION_CITA } from "@/app/lib/horario";
import { getGoogleOAuthClient } from "@/app/lib/google-calendar";
import {
  obtenerSupabasePrivado,
  descifrarToken,
} from "@/app/lib/google-calendar-security";

const ZONA = "Europe/Madrid";

async function obtenerCalendario() {
  const supabase = obtenerSupabasePrivado();

  const { data, error } = await supabase
    .from("google_calendar_config")
    .select("refresh_token_encrypted,calendar_id")
    .eq("id", 1)
    .single();

  if (error || !data?.refresh_token_encrypted) {
    throw new Error("Google Calendar no está conectado.");
  }

  const auth = getGoogleOAuthClient();

  auth.setCredentials({
    refresh_token: descifrarToken(
      data.refresh_token_encrypted
    ),
  });

  return {
    calendar: google.calendar({
      version: "v3",
      auth,
    }),
    calendarId: data.calendar_id || "primary",
  };
}

function sumarMinutos(hora: string, minutos: number) {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;

  if (total >= 1440) {
    throw new Error("La cita termina fuera del día.");
  }

  return [
    String(Math.floor(total / 60)).padStart(2, "0"),
    String(total % 60).padStart(2, "0"),
  ].join(":");
}

export function identificadorEvento(citaId: string) {
  if (!/^[1-9][0-9]*$/.test(citaId)) {
    throw new Error("El identificador de la cita no es válido.");
  }

  // Google admite identificadores hexadecimales.
  // Generamos siempre el mismo ID para cada cita.
  const hexadecimal = BigInt(citaId).toString(16);

  return `c1a1ca${hexadecimal.padStart(16, "0")}`;
}

export async function crearEventoGoogle(cita: {
  id: string;
  fecha: string;
  hora: string;
}) {
  const { calendar, calendarId } =
    await obtenerCalendario();

  const eventId = identificadorEvento(cita.id);

  const fin = sumarMinutos(
    cita.hora.slice(0, 5),
    DURACION_CITA
  );

  const requestBody = {
    id: eventId,
    summary: "Cita reservada - Clínica Alberto Matamoros",
    start: {
      dateTime: `${cita.fecha}T${cita.hora.slice(0, 5)}:00`,
      timeZone: ZONA,
    },
    end: {
      dateTime: `${cita.fecha}T${fin}:00`,
      timeZone: ZONA,
    },
    extendedProperties: {
      private: {
        cita_id: cita.id,
      },
    },
  };

  try {
    await calendar.events.insert({
      calendarId,
      requestBody,
    });
  } catch (error: unknown) {
    const status = (
      error as { code?: number; response?: { status?: number } }
    )?.response?.status ??
      (error as { code?: number })?.code;

    // Si existe el mismo evento, comprobamos que
    // realmente pertenece a esta cita.
    if (status !== 409) {
      throw error;
    }

    const existente = await calendar.events.get({
      calendarId,
      eventId,
    });

    if (
      existente.data.extendedProperties?.private
        ?.cita_id !== cita.id
    ) {
      throw new Error(
        "Existe un conflicto con otro evento."
      );
    }
  }

  return eventId;
}

export async function eliminarEventoGoogle(
  citaId: string
) {
  const { calendar, calendarId } =
    await obtenerCalendario();

  const eventId = identificadorEvento(citaId);

  try {
    const existente = await calendar.events.get({
      calendarId,
      eventId,
    });

    if (
      existente.data.extendedProperties?.private
        ?.cita_id !== citaId
    ) {
      throw new Error(
        "El evento no pertenece a esta cita."
      );
    }

    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error: unknown) {
    const status = (
      error as { code?: number; response?: { status?: number } }
    )?.response?.status ??
      (error as { code?: number })?.code;

    if (status !== 404 && status !== 410) {
      throw error;
    }
  }
}
