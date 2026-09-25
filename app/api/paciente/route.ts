import { NextResponse } from "next/server";
import { obtenerSupabasePrivado } from "@/app/lib/google-calendar-security";

function db() {
  return obtenerSupabasePrivado();
}

async function obtenerUsuario(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice(7).trim();
  if (!token) return null;

  const supabase = db();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

export async function GET(request: Request) {
  try {
    const user = await obtenerUsuario(request);

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const supabase = db();

    const { data: paciente, error: pacienteError } =
      await supabase
        .from("pacientes")
        .select("id,nombre,telefono,email,created_at")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (pacienteError) throw pacienteError;

    if (!paciente) {
      return NextResponse.json(
        {
          error:
            "Tu cuenta todavía no está vinculada a una ficha de paciente.",
        },
        { status: 404 }
      );
    }

    const [citas, bonos, cobros] = await Promise.all([
      supabase
        .from("citas")
        .select("id,fecha,hora,motivo,estado")
        .eq("paciente_id", paciente.id)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false }),

      supabase
        .from("bonos")
        .select(
          "id,nombre,sesiones_totales,sesiones_usadas,precio,fecha_compra,estado"
        )
        .eq("paciente_id", paciente.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("cobros")
        .select(
          "id,concepto,importe,importe_pagado,estado,metodo_pago,fecha,fecha_pago"
        )
        .eq("paciente_id", paciente.id)
        .order("fecha", { ascending: false }),
    ]);

    if (citas.error) throw citas.error;
    if (bonos.error) throw bonos.error;
    if (cobros.error) throw cobros.error;

    return NextResponse.json({
      ok: true,
      paciente,
      citas: citas.data ?? [],
      bonos: bonos.data ?? [],
      cobros: cobros.data ?? [],
    });
  } catch (error) {
    console.error("GET área paciente:", error);

    return NextResponse.json(
      { error: "No se ha podido cargar tu área personal." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await obtenerUsuario(request);

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const nombre = String(body.nombre || "").trim();
    const telefono = String(body.telefono || "").trim();
    const email = String(user.email || "").trim().toLowerCase();

    if (!nombre || !email) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios." },
        { status: 400 }
      );
    }

    const supabase = db();

    const { data: yaVinculado, error: vinculadoError } =
      await supabase
        .from("pacientes")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (vinculadoError) throw vinculadoError;

    if (yaVinculado) {
      return NextResponse.json({
        ok: true,
        pacienteId: yaVinculado.id,
      });
    }

    const { data: existente, error: existenteError } =
      await supabase
        .from("pacientes")
        .select("id,auth_user_id")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

    if (existenteError) throw existenteError;

    if (existente) {
      if (
        existente.auth_user_id &&
        existente.auth_user_id !== user.id
      ) {
        return NextResponse.json(
          { error: "Esta ficha ya está vinculada a otra cuenta." },
          { status: 409 }
        );
      }

      const { error: actualizarError } =
        await supabase
          .from("pacientes")
          .update({
            auth_user_id: user.id,
            telefono: telefono || null,
          })
          .eq("id", existente.id);

      if (actualizarError) throw actualizarError;

      return NextResponse.json({
        ok: true,
        pacienteId: existente.id,
      });
    }

    const { data: nuevo, error: nuevoError } =
      await supabase
        .from("pacientes")
        .insert({
          nombre,
          telefono: telefono || null,
          email,
          auth_user_id: user.id,
        })
        .select("id")
        .single();

    if (nuevoError) throw nuevoError;

    return NextResponse.json({
      ok: true,
      pacienteId: nuevo.id,
    });
  } catch (error) {
    console.error("POST área paciente:", error);

    return NextResponse.json(
      { error: "No se ha podido preparar tu ficha." },
      { status: 500 }
    );
  }
}
