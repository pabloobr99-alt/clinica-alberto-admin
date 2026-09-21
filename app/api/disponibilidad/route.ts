import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { obtenerHorarios } from "@/app/lib/horario";

function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
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
      console.error("Disponibilidad:", error);

      return NextResponse.json(
        { error: "No se ha podido consultar la agenda." },
        { status: 500 }
      );
    }

    const ocupadas = new Set(
      (data ?? [])
        .filter((cita) => cita.estado !== "cancelada")
        .map((cita) => String(cita.hora).slice(0, 5))
    );

    const ahora = new Date();

    const disponibles = horarios.filter((hora) => {
      if (ocupadas.has(hora)) {
        return false;
      }

      const momento = new Date(`${fecha}T${hora}:00`);

      return momento.getTime() > ahora.getTime();
    });

    return NextResponse.json({
      fecha,
      horarios: disponibles,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No se ha podido consultar la agenda." },
      { status: 500 }
    );
  }
}
