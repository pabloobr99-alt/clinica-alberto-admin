import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

import {
  getGoogleOAuthClient,
} from "@/app/lib/google-calendar";

import {
  verificarAdministrador,
  obtenerSupabasePrivado,
  cifrarToken,
} from "@/app/lib/google-calendar-security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const destino = new URL("/admin", request.url);

  try {
    if (!(await verificarAdministrador())) {
      return NextResponse.json(
        { error: "Acceso no autorizado." },
        { status: 403 }
      );
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const savedState = request.cookies.get(
      "google_oauth_state"
    )?.value;

    if (
      !code ||
      !state ||
      !savedState ||
      state.length !== savedState.length ||
      !crypto.timingSafeEqual(
        Buffer.from(state),
        Buffer.from(savedState)
      )
    ) {
      return NextResponse.json(
        { error: "Autorización no válida o caducada." },
        { status: 400 }
      );
    }

    const oauth = getGoogleOAuthClient();

    const { tokens } = await oauth.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error(
        "Google no ha proporcionado un refresh token."
      );
    }

    const supabase = obtenerSupabasePrivado();

    const { error } = await supabase
      .from("google_calendar_config")
      .upsert({
        id: 1,
        refresh_token_encrypted: cifrarToken(
          tokens.refresh_token
        ),
        calendar_id:
          process.env.GOOGLE_CALENDAR_ID || "primary",
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error("No se ha podido guardar la conexión.");
    }

    destino.searchParams.set("google", "conectado");

    const response = NextResponse.redirect(destino);

    response.cookies.delete("google_oauth_state");

    return response;
  } catch (error) {
    console.error(
      "Google callback:",
      error instanceof Error ? error.message : "Error"
    );

    destino.searchParams.set("google", "error");

    const response = NextResponse.redirect(destino);
    response.cookies.delete("google_oauth_state");

    return response;
  }
}
