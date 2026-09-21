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

function limpiar(valor: unknown, max = 500) {
  if (typeof valor !== "string") return "";

  return valor
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nombre = limpiar(body.nombre, 120);
    const telefono = limpiar(body.telefono, 30);
    const email = limpiar(body.email, 180).toLowerCase();
    const motivo = limpiar(body.motivo, 1200);
    const fecha = limpiar(body.fecha, 10);
    const hora = limpiar(body.hora, 5);

    if (
      !nombre ||
      !telefono ||
      !email ||
      !motivo ||
      !fecha ||
      !hora
    ) {
      return NextResponse.json(
        { error: "Completa todos los campos." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json(
        { error: "La fecha no es válida." },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(hora)) {
      return NextResponse.json(
        { error: "La hora no es válida." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Introduce un email válido." },
        { status: 400 }
      );
    }

    const horariosPermitidos = obtenerHorarios(fecha);

    if (!horariosPermitidos.includes(hora)) {
      return NextResponse.json(
        { error: "Ese horario no está disponible." },
        { status: 409 }
      );
    }

    const momento = new Date(`${fecha}T${hora}:00`);

    if (momento.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "No puedes reservar una hora pasada." },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    /*
      Comprobación previa.

      La protección definitiva contra dos reservas simultáneas
      debe seguir estando también en la base de datos mediante
      el índice UNIQUE que ya configuramos para fecha/hora.
    */

    const { data: existentes, error: consultaError } =
      await supabase
        .from("citas")
        .select("id,estado")
        .eq("fecha", fecha)
        .eq("hora", hora);

    if (consultaError) {
      console.error(consultaError);

      return NextResponse.json(
        { error: "No se ha podido comprobar la disponibilidad." },
        { status: 500 }
      );
    }

    const ocupada = (existentes ?? []).some(
      (cita) => cita.estado !== "cancelada"
    );

    if (ocupada) {
      return NextResponse.json(
        {
          error:
            "Ese hueco acaba de ocuparse. Elige otra hora.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("citas")
      .insert({
        nombre,
        telefono,
        email,
        motivo,
        fecha,
        hora,
        estado: "pendiente",
      })
      .select("id,fecha,hora")
      .single();

    if (error) {
      console.error("Reserva:", error);

      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("duplicate")
      ) {
        return NextResponse.json(
          {
            error:
              "Ese hueco acaba de reservarse. Elige otra hora.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error:
            "No se ha podido registrar la cita.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      cita: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error al registrar la cita.",
      },
      { status: 500 }
    );
  }
}
