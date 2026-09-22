import { NextResponse } from "next/server";
import crypto from "crypto";

import {
  getGoogleOAuthClient,
  GOOGLE_SCOPES,
} from "@/app/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;

    if (!secret) {
      throw new Error(
        "GOOGLE_OAUTH_STATE_SECRET no está configurado"
      );
    }

    const oauth2Client = getGoogleOAuthClient();

    const nonce = crypto.randomBytes(24).toString("hex");

    const signature = crypto
      .createHmac("sha256", secret)
      .update(nonce)
      .digest("hex");

    const state = `${nonce}.${signature}`;

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: GOOGLE_SCOPES,
      state,
    });

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error(
      "Error iniciando Google OAuth:",
      error instanceof Error ? error.message : "Error desconocido"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "No se ha podido iniciar Google Calendar.",
      },
      { status: 500 }
    );
  }
}
