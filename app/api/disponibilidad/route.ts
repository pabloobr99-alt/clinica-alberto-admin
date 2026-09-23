import { obtenerSupabasePrivado } from "@/app/lib/google-calendar-security";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { obtenerHorarios } from "@/app/lib/horario";
import {
  consultarHorasOcupadas,
} from "@/app/lib/google-disponibilidad";

export const dynamic = "force-dynamic";

function supabaseServer() {
  return obtenerSupabasePrivado();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");

    if (
      !fecha ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      Number.isNaN(
        new Date(`${fecha}T12:00:00Z`).getTime()
      )
    ) {
      return NextResponse.json(
        { error: "Fecha no válida." },
        { status: 400 }
      );
    }

    const horarios = obtenerHorarios(fecha);

    if (!horarios.length) {
      return NextResponse.json({
        fecha,
        horarios: [],
      });
    }

    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from("citas")
      .select("hora,estado")
      .eq("fecha", fecha);

    if (error) {
      console.error("ERROR_SUPABASE:", {
        code: error.code,
        message: error.message,
        hint: error.hint,
      });

      throw new Error(
        "No se ha podido consultar la agenda de Supabase."
      );
    }

    const ocupadasSupabase = new Set(
      (data ?? [])
        .filter((cita) => cita.estado !== "cancelada")
        .map((cita) => String(cita.hora).slice(0, 5))
    );

    const ocupadasGoogle =
      await consultarHorasOcupadas(fecha, horarios);

    const ahora = Date.now();

    const disponibles = horarios.filter((hora) => {
      if (
        ocupadasSupabase.has(hora) ||
        ocupadasGoogle.has(hora)
      ) {
        return false;
      }

      const fechaHora = new Date(
        `${fecha}T${hora}:00${
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Madrid",
            timeZoneName: "shortOffset",
          })
            .formatToParts(
              new Date(`${fecha}T12:00:00Z`)
            )
            .find((p) => p.type === "timeZoneName")
            ?.value === "GMT+2"
            ? "+02:00"
            : "+01:00"
        }`
      );

      return fechaHora.getTime() > ahora;
    });

    return NextResponse.json({
      fecha,
      horarios: disponibles,
    });
  } catch (error) {
    console.error(
      "Disponibilidad:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );

    return NextResponse.json(
      {
        error:
          "No se puede comprobar la disponibilidad en este momento.",
      },
      { status: 503 }
    );
  }
}
