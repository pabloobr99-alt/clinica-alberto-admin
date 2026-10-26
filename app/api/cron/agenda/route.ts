import { NextResponse } from "next/server";
import { enviarAgenda, horaLocal } from "@/app/lib/notificaciones-agenda";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { fecha, hora } = horaLocal();
  if (hora !== 7 && hora !== 8) return NextResponse.json({ skipped: true });

  try {
    await enviarAgenda(fecha, "Resumen diario");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error enviando agenda diaria", error);
    return NextResponse.json({ error: "No se ha podido enviar" }, { status: 500 });
  }
}
