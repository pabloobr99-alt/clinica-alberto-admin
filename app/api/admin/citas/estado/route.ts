import { NextResponse } from "next/server";

import {
  verificarAdministrador,
  obtenerSupabasePrivado,
} from "@/app/lib/google-calendar-security";

import {
  eliminarEventoGoogle,
} from "@/app/lib/google-eventos";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Solo el administrador puede modificar las citas.
    if (!(await verificarAdministrador())) {
      return NextResponse.json(
        { error: "Acceso no autorizado." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = Number(body.id);
    const estado = body.estado;

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !["confirmada", "cancelada"].includes(estado)
    ) {
      return NextResponse.json(
        { error: "Datos no válidos." },
        { status: 400 }
      );
    }

    const supabase = obtenerSupabasePrivado();

    const { data: cita, error: consultaError } =
      await supabase
        .from("citas")
        .select(
          "id,estado,google_event_id,google_sync_status"
        )
        .eq("id", id)
        .single();

    if (consultaError || !cita) {
      return NextResponse.json(
        { error: "No se ha encontrado la cita." },
        { status: 404 }
      );
    }

    if (cita.estado === estado) {
      return NextResponse.json({
        ok: true,
        estado,
      });
    }

    if (cita.estado === "cancelada") {
      return NextResponse.json(
        {
          error:
            "La cita ya está cancelada. No se puede confirmar desde aquí.",
        },
        { status: 409 }
      );
    }

    if (estado === "cancelada") {
      // Si una sincronización anterior falló,
      // hay que revisar si Google llegó a crear
      // el evento antes de permitir la cancelación.
      if (
        cita.google_sync_status === "error" ||
        (
          cita.google_sync_status === "pendiente" &&
          cita.google_event_id
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Esta cita necesita una revisión de sincronización antes de cancelarse.",
          },
          { status: 409 }
        );
      }

      if (cita.google_event_id) {
        // Solo eliminamos eventos vinculados
        // expresamente a esta cita.
        await eliminarEventoGoogle(String(id));
      }
    }

    const actualizacion =
      estado === "cancelada"
        ? {
            estado,
            google_sync_status: "cancelado",
          }
        : { estado };

    const { data: actualizada, error: updateError } =
      await supabase
        .from("citas")
        .update(actualizacion)
        .eq("id", id)
        .eq("estado", cita.estado)
        .select("id,estado")
        .maybeSingle();

    if (updateError || !actualizada) {
      return NextResponse.json(
        {
          error:
            "No se ha podido completar la operación. Comprueba el estado de la cita antes de repetirla.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      estado: actualizada.estado,
    });
  } catch (error) {
    console.error(
      "Actualización de cita:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );

    return NextResponse.json(
      {
        error:
          "No se ha podido completar la operación. Revisa la cita antes de intentarlo de nuevo.",
      },
      { status: 503 }
    );
  }
}
