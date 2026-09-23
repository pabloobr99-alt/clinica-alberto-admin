import { crearEventoGoogle } from "@/app/lib/google-eventos";
import { obtenerSupabasePrivado } from "@/app/lib/google-calendar-security";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { obtenerHorarios } from "@/app/lib/horario";
import {
  consultarHorasOcupadas,
} from "@/app/lib/google-disponibilidad";


function supabaseServer() {
  return obtenerSupabasePrivado();
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


    // Comprobar Google Calendar antes de aceptar la reserva.
    try {
      const ocupadasGoogle = await consultarHorasOcupadas(
        fecha,
        [hora]
      );

      if (ocupadasGoogle.has(hora)) {
        return NextResponse.json(
          {
            error:
              "Este horario está ocupado en la agenda. Elige otro.",
          },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error(
        "No se ha podido comprobar Google Calendar:",
        error instanceof Error ? error.message : "Error"
      );

      return NextResponse.json(
        {
          error:
            "No podemos comprobar la disponibilidad ahora mismo. Inténtalo más tarde.",
        },
        { status: 503 }
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

    // Crear el evento de Google para la cita registrada.
    try {
      const eventId = await crearEventoGoogle({
        id: String(data.id),
        fecha: data.fecha,
        hora: data.hora,
      });

      const privado = obtenerSupabasePrivado();

      const { error: syncError } = await privado
        .from("citas")
        .update({
          google_event_id: eventId,
          google_sync_status: "sincronizado",
        })
        .eq("id", data.id);

      if (syncError) {
        throw new Error(
          "El evento existe, pero falta actualizar Supabase."
        );
      }

      return NextResponse.json({
        ok: true,
        cita: data,
      });
    } catch (error) {
      console.error(
        "Sincronización con Google:",
        error instanceof Error ? error.message : "Error"
      );

      // Conservamos la reserva por si Google creó
      // el evento antes de producirse el error.
      const privado = obtenerSupabasePrivado();

      const { error: estadoError } = await privado
        .from("citas")
        .update({
          google_sync_status: "error",
        })
        .eq("id", data.id);

      if (estadoError) {
        console.error(
          "No se pudo registrar el error de sincronización."
        );
      }

      return NextResponse.json(
        {
          error:
            "La cita se ha registrado, pero necesita verificación. Contacta con la clínica antes de repetir la reserva.",
        },
        { status: 503 }
      );
    }
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
