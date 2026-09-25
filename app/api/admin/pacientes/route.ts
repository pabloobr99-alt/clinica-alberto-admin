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
    if (!(await comprobarAdministrador(request))) {
      return noAutorizado();
    }

    const body = await request.json();
    const accion = String(body.accion || "");
    const pacienteId = Number(body.pacienteId);

    if (!pacienteId) {
      return NextResponse.json(
        { error: "Paciente no válido." },
        { status: 400 }
      );
    }

    const supabase = db();

    /* -------------------------
       CREAR BONO
       ------------------------- */

    if (accion === "crear_bono") {
      const nombre =
        String(body.nombre || "").trim() ||
        "Bono de sesiones";

      const sesionesTotales = Number(
        body.sesionesTotales
      );

      const precio = numero(body.precio);

      if (
        !Number.isInteger(sesionesTotales) ||
        sesionesTotales <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Indica un número válido de sesiones.",
          },
          { status: 400 }
        );
      }

      if (precio < 0) {
        return NextResponse.json(
          { error: "El precio no es válido." },
          { status: 400 }
        );
      }

      const { data: bono, error } = await supabase
        .from("bonos")
        .insert({
          paciente_id: pacienteId,
          nombre,
          sesiones_totales: sesionesTotales,
          sesiones_usadas: 0,
          precio,
          estado: "activo",
          notas:
            String(body.notas || "").trim() || null,
        })
        .select("*")
        .single();

      if (error) throw error;

      /*
       * Si el bono tiene precio, generamos automáticamente
       * el cobro pendiente.
       */
      if (precio > 0) {
        const { error: cobroError } = await supabase
          .from("cobros")
          .insert({
            paciente_id: pacienteId,
            bono_id: bono.id,
            concepto: nombre,
            importe: precio,
            importe_pagado: 0,
            estado: "pendiente",
          });

        if (cobroError) {
          console.error(
            "Bono creado pero no se pudo crear cobro:",
            cobroError
          );
        }
      }

      return NextResponse.json({
        ok: true,
        bono,
      });
    }

    /* -------------------------
       CREAR COBRO
       ------------------------- */

    if (accion === "crear_cobro") {
      const concepto = String(
        body.concepto || ""
      ).trim();

      const importe = numero(body.importe);

      const importePagado = numero(
        body.importePagado ??
        body.importe_pagado ??
        0
      );

      if (!concepto) {
        return NextResponse.json(
          { error: "Indica el concepto." },
          { status: 400 }
        );
      }

      if (importe <= 0) {
        return NextResponse.json(
          { error: "Indica un importe válido." },
          { status: 400 }
        );
      }

      if (
        importePagado < 0 ||
        importePagado > importe
      ) {
        return NextResponse.json(
          {
            error:
              "La cantidad pagada debe estar entre 0 € y el importe total.",
          },
          { status: 400 }
        );
      }

      const estado =
        importePagado === 0
          ? "pendiente"
          : importePagado < importe
          ? "parcial"
          : "pagado";

      const metodoPago =
        importePagado > 0
          ? body.metodoPago ??
            body.metodo_pago ??
            "efectivo"
          : null;

      const { data, error } = await supabase
        .from("cobros")
        .insert({
          paciente_id: pacienteId,
          concepto,
          importe,
          importe_pagado: importePagado,
          estado,
          metodo_pago: metodoPago,
          fecha_pago:
            estado === "pagado"
              ? new Date()
                  .toISOString()
                  .slice(0, 10)
              : null,
        })
        .select("*")
        .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        cobro: data,
      });
    }

    /* -------------------------
       CONSUMIR SESIÓN DE BONO
       ------------------------- */

    if (accion === "consumir_bono") {
      const bonoId = Number(body.bonoId);

      const { data: bono, error: bonoError } =
        await supabase
          .from("bonos")
          .select("*")
          .eq("id", bonoId)
          .eq("paciente_id", pacienteId)
          .single();

      if (bonoError || !bono) {
        return NextResponse.json(
          { error: "No se ha encontrado el bono." },
          { status: 404 }
        );
      }

      if (bono.estado !== "activo") {
        return NextResponse.json(
          { error: "Este bono no está activo." },
          { status: 409 }
        );
      }

      if (
        bono.sesiones_usadas >=
        bono.sesiones_totales
      ) {
        return NextResponse.json(
          {
            error:
              "El bono ya tiene todas las sesiones consumidas.",
          },
          { status: 409 }
        );
      }

      const nuevasUsadas =
        bono.sesiones_usadas + 1;

      const nuevoEstado =
        nuevasUsadas >= bono.sesiones_totales
          ? "completado"
          : "activo";

      const { error: actualizarError } =
        await supabase
          .from("bonos")
          .update({
            sesiones_usadas: nuevasUsadas,
            estado: nuevoEstado,
          })
          .eq("id", bono.id);

      if (actualizarError) throw actualizarError;

      const { error: sesionError } = await supabase
        .from("bono_sesiones")
        .insert({
          bono_id: bono.id,
          paciente_id: pacienteId,
          fecha: new Date()
            .toISOString()
            .slice(0, 10),
          observaciones:
            String(body.observaciones || "").trim() ||
            null,
        });

      if (sesionError) throw sesionError;

      return NextResponse.json({
        ok: true,
        sesionesUsadas: nuevasUsadas,
        sesionesRestantes:
          bono.sesiones_totales - nuevasUsadas,
        estado: nuevoEstado,
      });
    }

    /* -------------------------
       MARCAR COBRO COMO PAGADO
       ------------------------- */

    if (accion === "registrar_pago_parcial") {
      const cobroId = Number(body.cobroId);
      const cantidad = numero(body.cantidad);

      if (!cobroId || cantidad <= 0) {
        return NextResponse.json(
          { error: "Indica una cantidad válida." },
          { status: 400 }
        );
      }

      const { data: cobro, error: buscarError } =
        await supabase
          .from("cobros")
          .select("*")
          .eq("id", cobroId)
          .eq("paciente_id", pacienteId)
          .single();

      if (buscarError || !cobro) {
        return NextResponse.json(
          { error: "No se ha encontrado el cobro." },
          { status: 404 }
        );
      }

      if (cobro.estado === "cancelado") {
        return NextResponse.json(
          { error: "Este cobro está cancelado." },
          { status: 409 }
        );
      }

      const total = numero(cobro.importe);
      const yaPagado = numero(cobro.importe_pagado);
      const pendiente = Math.max(0, total - yaPagado);

      if (pendiente <= 0) {
        return NextResponse.json(
          { error: "Este cobro ya está pagado." },
          { status: 409 }
        );
      }

      if (cantidad > pendiente) {
        return NextResponse.json(
          {
            error: `Solo quedan ${pendiente.toFixed(2)} € pendientes.`,
          },
          { status: 400 }
        );
      }

      const nuevoPagado = yaPagado + cantidad;

      const nuevoEstado =
        nuevoPagado >= total
          ? "pagado"
          : "parcial";

      const { data: actualizado, error } =
        await supabase
          .from("cobros")
          .update({
            importe_pagado: nuevoPagado,
            estado: nuevoEstado,
            metodo_pago:
              body.metodoPago ||
              body.metodo_pago ||
              cobro.metodo_pago ||
              "efectivo",
            fecha_pago:
              nuevoEstado === "pagado"
                ? new Date()
                    .toISOString()
                    .slice(0, 10)
                : null,
          })
          .eq("id", cobroId)
          .eq("paciente_id", pacienteId)
          .select("*")
          .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        cobro: actualizado,
        pagado: nuevoPagado,
        pendiente: Math.max(
          0,
          total - nuevoPagado
        ),
        estado: nuevoEstado,
      });
    }

    if (accion === "marcar_pagado") {
      const cobroId = Number(body.cobroId);

      const { data: cobro, error: buscarError } =
        await supabase
          .from("cobros")
          .select("*")
          .eq("id", cobroId)
          .eq("paciente_id", pacienteId)
          .single();

      if (buscarError || !cobro) {
        return NextResponse.json(
          { error: "No se ha encontrado el cobro." },
          { status: 404 }
        );
      }

      const { error } = await supabase
        .from("cobros")
        .update({
          importe_pagado: cobro.importe,
          estado: "pagado",
          metodo_pago:
            body.metodoPago || "efectivo",
          fecha_pago: new Date()
            .toISOString()
            .slice(0, 10),
        })
        .eq("id", cobroId);

      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Acción no válida." },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST economía paciente:", error);

    return NextResponse.json(
      {
        error:
          "No se ha podido realizar la operación.",
      },
      { status: 500 }
    );
  }
}
