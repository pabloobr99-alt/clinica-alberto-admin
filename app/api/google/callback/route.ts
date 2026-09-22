import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import {
  getGoogleOAuthClient,
} from "@/app/lib/google-calendar";

export const dynamic = "force-dynamic";

function validarState(state: string) {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;

  if (!secret) {
    return false;
  }

  const partes = state.split(".");

  if (partes.length !== 2) {
    return false;
  }

  const [nonce, receivedSignature] = partes;

  if (!nonce || !receivedSignature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(nonce)
    .digest("hex");

  try {
    const received = Buffer.from(
      receivedSignature,
      "utf8"
    );

    const expected = Buffer.from(
      expectedSignature,
      "utf8"
    );

    if (received.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      received,
      expected
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const code =
      request.nextUrl.searchParams.get("code");

    const state =
      request.nextUrl.searchParams.get("state");

    const googleError =
      request.nextUrl.searchParams.get("error");

    if (googleError) {
      return NextResponse.redirect(
        new URL(
          "/admin?google=cancelado",
          request.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan datos de autorización.",
        },
        { status: 400 }
      );
    }

    if (!validarState(state)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Estado OAuth no válido.",
        },
        { status: 400 }
      );
    }

    const oauth2Client =
      getGoogleOAuthClient();

    const { tokens } =
      await oauth2Client.getToken(code);

    /*
      IMPORTANTE:

      En esta primera prueba NO mostramos,
      imprimimos ni enviamos el refresh_token
      al navegador.

      Solo comprobamos que Google lo haya
      proporcionado correctamente.
    */

    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Google no ha proporcionado acceso offline. Vuelve a realizar la autorización.",
        },
        { status: 400 }
      );
    }

    return NextResponse.redirect(
      new URL(
        "/admin?google=autorizado",
        request.url
      )
    );
  } catch (error) {
    console.error(
      "Error completando Google OAuth:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido completar la conexión con Google Calendar.",
      },
      { status: 500 }
    );
  }
}
