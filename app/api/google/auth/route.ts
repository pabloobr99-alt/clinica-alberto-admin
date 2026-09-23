import { NextResponse } from "next/server";
import crypto from "node:crypto";

import {
  getGoogleOAuthClient,
  GOOGLE_SCOPES,
} from "@/app/lib/google-calendar";

import {
  verificarAdministrador,
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

    const state = crypto.randomBytes(32).toString("hex");

    const oauth = getGoogleOAuthClient();

    const url = oauth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: GOOGLE_SCOPES,
      state,
    });

    const response = NextResponse.redirect(url);

    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/google",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error(
      "Google OAuth:",
      error instanceof Error ? error.message : "Error"
    );

    return NextResponse.json(
      { error: "No se ha podido iniciar la conexión." },
      { status: 500 }
    );
  }
}
