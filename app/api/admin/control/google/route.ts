import { fechaValida } from "@/app/lib/control-admin";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/app/lib/google-calendar";
import { obtenerSupabasePrivado, descifrarToken } from "@/app/lib/google-calendar-security";

export const dynamic = "force-dynamic";
const zona = "Europe/Madrid";

function fechaMadrid(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(fecha);
  const parte = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}
function horaMadrid(fecha: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zona, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(fecha);
}

export async function GET(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !process.env.ADMIN_USER_ID) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const db = obtenerSupabasePrivado();
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || auth.user?.id !== process.env.ADMIN_USER_ID) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const fecha = new URL(request.url).searchParams.get("fecha") ?? "";
  if (!fechaValida(fecha)) {
    return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
  }

  try {
    const { data: config, error: configError } = await db.from("google_calendar_config")
      .select("refresh_token_encrypted,calendar_id").eq("id", 1).single();
    if (configError || !config?.refresh_token_encrypted) {
      return NextResponse.json({ eventos: [], aviso: "Google Calendar no está conectado." });
    }
    const authGoogle = getGoogleOAuthClient();
    authGoogle.setCredentials({ refresh_token: descifrarToken(config.refresh_token_encrypted) });
    const calendar = google.calendar({ version: "v3", auth: authGoogle });
    const dia = new Date(`${fecha}T12:00:00Z`);
    const desde = new Date(dia.getTime() - 36 * 3600000).toISOString();
    const hasta = new Date(dia.getTime() + 36 * 3600000).toISOString();
    const { data: citas, error: citasError } = await db.from("citas")
      .select("id,google_event_id").eq("fecha", fecha);
    if (citasError) throw citasError;
    const ids = new Set((citas ?? []).flatMap(c => [c.google_event_id, c.id != null ? `c1a1ca${BigInt(c.id).toString(16).padStart(16, "0")}` : null].filter((x): x is string => typeof x === "string")));
    const eventos: { id: string; hora: string; fin: string; diaCompleto: boolean; nombre: string }[] = [];
    let pageToken: string | undefined;
    do {
      const { data } = await calendar.events.list({
        calendarId: config.calendar_id || "primary", timeMin: desde, timeMax: hasta,
        singleEvents: true, orderBy: "startTime", maxResults: 250,
        ...(pageToken ? { pageToken } : {}),
      });
      for (const e of data.items ?? []) {
        if (!e.id || e.status === "cancelled" || ids.has(e.id)) continue;
        const inicio = e.start?.dateTime ? new Date(e.start.dateTime) : null;
        const fin = e.end?.dateTime ? new Date(e.end.dateTime) : null;
        const diaCompleto = !inicio && !!e.start?.date;
        if (inicio && fechaMadrid(inicio) !== fecha) continue;
        if (diaCompleto && !(e.start?.date && e.end?.date && e.start.date <= fecha && fecha < e.end.date)) continue;
        if (!inicio && !diaCompleto) continue;
        eventos.push({ id: e.id, hora: inicio ? horaMadrid(inicio) : "Todo el día", fin: fin ? horaMadrid(fin) : "", diaCompleto, nombre: e.summary?.trim() || "Evento sin título" });
      }
      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);
    return NextResponse.json({ eventos }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Google en control diario:", error instanceof Error ? error.message : "Error desconocido");
    return NextResponse.json({ eventos: [], aviso: "No se pudieron consultar los eventos de Google Calendar." }, { headers: { "Cache-Control": "no-store" } });
  }
}
