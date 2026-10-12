import { NextResponse } from "next/server";
import { obtenerSupabasePrivado } from "@/app/lib/google-calendar-security";

function db() {
  return obtenerSupabasePrivado();
}

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

async function comprobarAdministrador(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return false;
  }

  const supabase = db();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return false;
  }

  /*
   * La cuenta administrativa autorizada se define
   * mediante ADMIN_USER_ID en Vercel.
   */
  const adminId = process.env.ADMIN_USER_ID;

  if (!adminId) {
    console.error("Falta ADMIN_USER_ID.");
    return false;
  }

  return user.id === adminId;
}

function noAutorizado() {
  return NextResponse.json(
    { error: "No autorizado." },
    { status: 401 }
  );
}

/* =========================================================
   GET
   /api/admin/pacientes?pacienteId=123
   Devuelve bonos + cobros de un paciente
   ========================================================= */

export async function GET(request: Request) {
  try {
    if (!(await comprobarAdministrador(request))) {
      return noAutorizado();
    }

    const url = new URL(request.url);
    const pacienteId = Number(
      url.searchParams.get("pacienteId")
    );

    const economiaGeneral =
      url.searchParams.get("economia") === "general";

    const supabase = db();

    if (economiaGeneral) {
      const [
        { data: pacientes, error: pacientesError },
        { data: cobros, error: cobrosError },
      ] = await Promise.all([
        supabase
          .from("pacientes")
          .select("id,nombre,telefono,email")
          .order("nombre", { ascending: true }),

        supabase
          .from("cobros")
          .select("*")
          .order("fecha", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (pacientesError) throw pacientesError;
      if (cobrosError) throw cobrosError;

      const listaPacientes = pacientes ?? [];
      const listaCobros = cobros ?? [];

      const cuadrante = listaPacientes.map((paciente) => {
        const cobrosPaciente = listaCobros.filter(
          (cobro) =>
            Number(cobro.paciente_id) === paciente.id &&
            cobro.estado !== "cancelado"
        );

        const total = cobrosPaciente.reduce(
          (suma, cobro) =>
            suma + numero(cobro.importe),
          0
        );

        const pagado = cobrosPaciente.reduce(
          (suma, cobro) =>
            suma + numero(cobro.importe_pagado),
          0
        );

        const pendiente = Math.max(
          0,
          total - pagado
        );

        let estado:
          | "sin_cobros"
          | "pendiente"
          | "parcial"
          | "pagado" = "sin_cobros";

        if (total > 0 && pagado <= 0) {
          estado = "pendiente";
        } else if (
          total > 0 &&
          pagado > 0 &&
          pendiente > 0
        ) {
          estado = "parcial";
        } else if (total > 0 && pendiente <= 0) {
          estado = "pagado";
        }

        return {
          ...paciente,
          total,
          pagado,
          pendiente,
          estado,
          cobros: cobrosPaciente,
        };
      });

      const totalFacturado = cuadrante.reduce(
        (suma, paciente) =>
          suma + paciente.total,
        0
      );

      const totalCobrado = cuadrante.reduce(
        (suma, paciente) =>
          suma + paciente.pagado,
        0
      );

      const totalPendiente = cuadrante.reduce(
        (suma, paciente) =>
          suma + paciente.pendiente,
        0
      );

      return NextResponse.json({
        ok: true,
        pacientes: cuadrante,
        resumen: {
          totalFacturado,
          totalCobrado,
          totalPendiente,
          pacientesPendientes:
            cuadrante.filter(
              (paciente) =>
                paciente.estado === "pendiente" ||
                paciente.estado === "parcial"
            ).length,
        },
      });
    }

    if (!pacienteId) {
      return NextResponse.json(
        { error: "Paciente no válido." },
        { status: 400 }
      );
    }

    const [
      { data: bonos, error: bonosError },
      { data: cobros, error: cobrosError },
    ] = await Promise.all([
      supabase
        .from("bonos")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("created_at", { ascending: false }),

      supabase
        .from("cobros")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (bonosError) throw bonosError;
    if (cobrosError) throw cobrosError;

    const listaCobros = cobros ?? [];

    const totalCobrado = listaCobros.reduce(
      (total, cobro) =>
        total + numero(cobro.importe_pagado),
      0
    );

    const totalPendiente = listaCobros
      .filter(
        (cobro) =>
          cobro.estado !== "cancelado" &&
          cobro.estado !== "pagado"
      )
      .reduce(
        (total, cobro) =>
          total +
          Math.max(
            0,
            numero(cobro.importe) -
              numero(cobro.importe_pagado)
          ),
        0
      );

    return NextResponse.json({
      ok: true,
      bonos: bonos ?? [],
      cobros: listaCobros,
      resumen: {
        totalCobrado,
        totalPendiente,
      },
    });
  } catch (error) {
    console.error("GET economía paciente:", error);

    return NextResponse.json(
      {
        error:
          "No se han podido cargar los datos económicos.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST
   Crear bono o cobro
   ========================================================= */

export async function POST(request: Request) {
  try {
    if (!(await comprobarAdministrador(request))) return noAutorizado();
    const body = await request.json();
    const id = body.solicitud_id;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
      return NextResponse.json({ error: "Actualiza la página antes de guardar." }, { status: 400 });
    const accion = body.accion;
    if (accion === "consumir_bono") return NextResponse.json({ error: "Descuenta la sesión desde Control del día para asociarla a la cita y evitar duplicados." }, { status: 409 });
    const paciente_id = Number(body.pacienteId ?? body.paciente_id);
    if (!Number.isSafeInteger(paciente_id) || paciente_id <= 0) return NextResponse.json({ error: "Ficha no válida" }, { status: 400 });
    let p: Record<string, unknown>;
    if (accion === "crear_bono") p = { accion, paciente_id, concepto: body.nombre, sesiones: body.sesionesTotales ?? body.sesiones_totales, importe: body.precio, cantidad: 0 };
    else if (accion === "crear_cobro") p = { accion, paciente_id, concepto: body.concepto, importe: body.importe, cantidad: body.importe_pagado ?? (body.pagado ? body.importe : 0), metodo: body.metodoPago ?? body.metodo_pago ?? "efectivo" };
    else if (accion === "registrar_pago_parcial" || accion === "marcar_pagado") p = { accion: "pagar", paciente_id, cobro_id: body.cobroId ?? body.cobro_id, cantidad: body.cantidad, completar: accion === "marcar_pagado", metodo: body.metodoPago ?? body.metodo_pago ?? "efectivo" };
    else return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    const { data, error } = await db().rpc("control_diario_accion", { p_id: id, p });
    if (error) return NextResponse.json({ error: error.code === "P0001" ? error.message : "No se pudo guardar el movimiento." }, { status: 409 });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la operación." }, { status: 503 });
  }
}
