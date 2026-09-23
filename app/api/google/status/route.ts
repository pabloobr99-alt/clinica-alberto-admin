import { NextResponse } from "next/server";
import { google } from "googleapis";

import {
  getGoogleOAuthClient,
} from "@/app/lib/google-calendar";

import {
  verificarAdministrador,
  obtenerSupabasePrivado,
  descifrarToken,
} from "@/app/lib/google-calendar-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await verificarAdministrador())) {
      return NextResponse.json(
        { error: "Acceso no autorizado." },
        { status: 403 }
      );
    }

    const supabase = obtenerSupabasePrivado();

    const { data, error } = await supabase
      .from("google_calendar_config")
      .select("refresh_token_encrypted,calendar_id")
      .eq("id", 1)
      .single();

    if (error || !data?.refresh_token_encrypted) {
      return NextResponse.json({
        conectado: false,
      });
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

    const inicio = new Date();
    const fin = new Date(
      inicio.getTime() + 24 * 60 * 60 * 1000
    );

    await calendar.freebusy.query({
      requestBody: {
        timeMin: inicio.toISOString(),
        timeMax: fin.toISOString(),
        items: [
          {
            id: data.calendar_id || "primary",
          },
        ],
      },
    });

    return NextResponse.json({
      conectado: true,
      calendarioAccesible: true,
    });
  } catch (error) {
    console.error(
      "Google status:",
      error instanceof Error ? error.message : "Error"
    );

    return NextResponse.json(
      {
        conectado: false,
        calendarioAccesible: false,
        error: "No se ha podido verificar Google Calendar.",
      },
      { status: 503 }
    );
  }
}
