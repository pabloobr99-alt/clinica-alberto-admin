import { NextResponse } from "next/server";
import { obtenerSupabasePrivado } from "@/app/lib/google-calendar-security";
import { crearEventoGoogle } from "@/app/lib/google-eventos";
import { consultarHorasOcupadas } from "@/app/lib/google-disponibilidad";
import { obtenerHorarios } from "@/app/lib/horario";

function db() {
  return obtenerSupabasePrivado();
}

async function comprobarAdministrador(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) return false;

  const token = authorization.slice(7).trim();
  if (!token) return false;

  const supabase = db();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return false;

  const adminId = process.env.ADMIN_USER_ID;

  if (!adminId) {
    console.error("Falta ADMIN_USER_ID.");
    return false;
  }

  return user.id === adminId;
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
    if (!(await comprobarAdministrador(request))) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const pacienteId = Number(body.pacienteId);
    const fecha = limpiar(body.fecha, 10);
    const hora = limpiar(body.hora, 5);
    const motivo = limpiar(body.motivo, 1200);

    if (!pacienteId || !fecha || !hora || !motivo) {
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
        { error: "No puedes crear una cita en una hora pasada." },
        { status: 400 }
      );
    }

    const supabase = db();

    const { data: paciente, error: pacienteError } =
      await supabase
        .from("pacientes")
        .select("id,nombre,telefono,email")
        .eq("id", pacienteId)
        .single();

    if (pacienteError || !paciente) {
      return NextResponse.json(
        { error: "No se ha encontrado el paciente." },
        { status: 404 }
      );
    }

    if (!paciente.telefono || !paciente.email) {
      return NextResponse.json(
        {
          error:
            "El paciente necesita teléfono y email antes de crear la cita.",
        },
        { status: 400 }
      );
    }

    try {
      const ocupadasGoogle =
        await consultarHorasOcupadas(fecha, [hora]);

      if (ocupadasGoogle.has(hora)) {
        return NextResponse.json(
          {
            error:
              "Ese horario ya está ocupado en Google Calendar.",
          },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error("Google Calendar:", error);

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar Google Calendar.",
        },
        { status: 503 }
      );
    }

    const { data: existentes, error: consultaError } =
      await supabase
        .from("citas")
        .select("id,estado")
        .eq("fecha", fecha)
        .eq("hora", hora);

    if (consultaError) throw consultaError;

    const ocupada = (existentes ?? []).some(
      (cita) => cita.estado !== "cancelada"
    );

    if (ocupada) {
      return NextResponse.json(
        { error: "Ese horario ya está ocupado." },
        { status: 409 }
      );
    }

    const { data: cita, error: citaError } =
      await supabase
        .from("citas")
        .insert({
          paciente_id: paciente.id,
          nombre: paciente.nombre,
          telefono: paciente.telefono,
          email: paciente.email,
          fecha,
          hora,
          motivo,
          estado: "confirmada",
        })
        .select("id,fecha,hora")
        .single();

    if (citaError) {
      if (
        citaError.code === "23505" ||
        citaError.message?.toLowerCase().includes("duplicate")
      ) {
        return NextResponse.json(
          {
            error:
              "Ese horario acaba de ocuparse. Elige otro.",
          },
          { status: 409 }
        );
      }

      throw citaError;
    }

    try {
      const eventId = await crearEventoGoogle({
        id: String(cita.id),
        fecha: cita.fecha,
        hora: cita.hora,
        nombre: paciente.nombre,
        motivo,
        telefono: paciente.telefono,
        email: paciente.email,
      });

      const { error: syncError } =
        await supabase
          .from("citas")
          .update({
            google_event_id: eventId,
            google_sync_status: "sincronizado",
          })
          .eq("id", cita.id);

      if (syncError) throw syncError;
    } catch (error) {
      console.error("Sincronización Google:", error);

      await supabase
        .from("citas")
        .update({
          google_sync_status: "error",
        })
        .eq("id", cita.id);

      return NextResponse.json(
        {
          error:
            "La cita se ha guardado, pero necesita revisar la sincronización con Google Calendar.",
          citaCreada: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      cita,
    });
  } catch (error) {
    console.error("Crear cita admin:", error);

    return NextResponse.json(
      {
        error:
          "No se ha podido crear la cita.",
      },
      { status: 500 }
    );
  }
}
