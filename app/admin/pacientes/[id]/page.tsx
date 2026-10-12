"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Paciente = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas_generales: string | null;
  created_at: string;
};

type Historial = {
  id: number;
  paciente_id: number;
  fecha: string;
  motivo: string | null;
  tratamiento: string | null;
  observaciones: string | null;
  proxima_revision: string | null;
  created_at: string;
};

type Cita = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  motivo: string | null;
  fecha: string;
  hora: string;
  estado: string | null;
};

type Bono = {
  id: number;
  paciente_id: number;
  nombre: string;
  sesiones_totales: number;
  sesiones_usadas: number;
  precio: number;
  fecha_compra: string;
  estado: "activo" | "completado" | "cancelado";
  notas: string | null;
};

type Cobro = {
  id: number;
  paciente_id: number;
  bono_id: number | null;
  cita_id: number | null;
  concepto: string;
  importe: number;
  importe_pagado: number;
  estado: "pendiente" | "parcial" | "pagado" | "cancelado";
  metodo_pago: string | null;
  fecha: string;
  fecha_pago: string | null;
  notas: string | null;
};

export default function PacientePage() {
  const [paciente, setPaciente] =
    useState<Paciente | null>(null);

  const [historial, setHistorial] =
    useState<Historial[]>([]);

  const [citas, setCitas] =
    useState<Cita[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [motivo, setMotivo] =
    useState("");

  const [tratamiento, setTratamiento] =
    useState("");

  const [observaciones, setObservaciones] =
    useState("");

  const [proximaRevision, setProximaRevision] =
    useState("");

  const [notasGenerales, setNotasGenerales] =
    useState("");

  const [guardandoNotas, setGuardandoNotas] =
    useState(false);

  // Gestión económica
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [totalCobrado, setTotalCobrado] = useState(0);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [cargandoEconomia, setCargandoEconomia] =
    useState(false);
  const [errorEconomia, setErrorEconomia] =
    useState("");

  const [accionEconomica, setAccionEconomica] =
    useState(false);

  const obtenerId = () => {
    const partes = window.location.pathname.split("/");
    return Number(partes[partes.length - 1]);
  };

  useEffect(() => {
    comprobarAcceso();
  }, []);

  const comprobarAcceso = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    await cargarPaciente();
  };

  const obtenerTokenAdmin = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  };

  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [conceptoCobro, setConceptoCobro] = useState("Consulta");
  const [importeCobro, setImporteCobro] = useState("");
  const [pagadoCobro, setPagadoCobro] = useState("");
  const [metodoCobro, setMetodoCobro] = useState("efectivo");
  const [guardandoCobro, setGuardandoCobro] = useState(false);

  const cargarEconomia = async (pacienteId: number) => {
    setCargandoEconomia(true);
    setErrorEconomia("");

    try {
      const token = await obtenerTokenAdmin();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(
        `/api/admin/pacientes?pacienteId=${pacienteId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error ||
            "No se ha podido cargar la información económica."
        );
      }

      setBonos(resultado.bonos || []);
      setCobros(resultado.cobros || []);
      setTotalCobrado(Number(resultado.totalCobrado || 0));
      setTotalPendiente(Number(resultado.totalPendiente || 0));
    } catch (error) {
      console.error(error);
      setErrorEconomia(
        "No se ha podido cargar la información económica."
      );
    } finally {
      setCargandoEconomia(false);
    }
  };

  const ejecutarAccionEconomica = async (
    datos: Record<string, unknown>
  ) => {
    if (!paciente) return false;

    setAccionEconomica(true);

    try {
      const token = await obtenerTokenAdmin();

      if (!token) {
        window.location.href = "/login";
        return false;
      }

      const response = await fetch("/api/admin/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...datos, solicitud_id: crypto.randomUUID() }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error || "No se ha podido realizar la operación."
        );
      }

      await cargarEconomia(paciente.id);
      return true;
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "No se ha podido realizar la operación."
      );
      return false;
    } finally {
      setAccionEconomica(false);
    }
  };

  const crearBono = async () => {
    if (!paciente) return;

    const nombre =
      window.prompt("Nombre del bono:", "Bono de sesiones")?.trim();

    if (!nombre) return;

    const sesionesTexto = window.prompt(
      "¿Cuántas sesiones incluye?",
      "5"
    );

    if (sesionesTexto === null) return;

    const sesionesTotales = Number(sesionesTexto);

    if (
      !Number.isInteger(sesionesTotales) ||
      sesionesTotales <= 0
    ) {
      alert("Introduce un número válido de sesiones.");
      return;
    }

    const precioTexto = window.prompt(
      "Precio total del bono (€):",
      "175"
    );

    if (precioTexto === null) return;

    const precio = Number(
      precioTexto.replace(",", ".")
    );

    if (!Number.isFinite(precio) || precio < 0) {
      alert("Introduce un precio válido.");
      return;
    }

    await ejecutarAccionEconomica({
      accion: "crear_bono",
      action: "crear_bono",
      pacienteId: paciente.id,
      paciente_id: paciente.id,
      nombre,
      sesionesTotales,
      sesiones_totales: sesionesTotales,
      precio,
    });
  };

  const consumirBono = async (bono: Bono) => {
    if (bono.sesiones_usadas >= bono.sesiones_totales) {
      alert("Este bono ya está completado.");
      return;
    }

    const restantes =
      bono.sesiones_totales - bono.sesiones_usadas;

    const confirmar = window.confirm(
      `¿Consumir una sesión de "${bono.nombre}"?\n\n` +
        `Quedan ${restantes} sesiones antes de registrar esta.`
    );

    if (!confirmar) return;

    await ejecutarAccionEconomica({
      accion: "consumir_bono",
      action: "consumir_bono",
      pacienteId: paciente?.id,
      paciente_id: paciente?.id,
      bonoId: bono.id,
      bono_id: bono.id,
    });
  };

  const marcarCobroPagado = async (cobro: Cobro) => {
    const total = Number(cobro.importe || 0);
    const yaPagado = Number(cobro.importe_pagado || 0);
    const pendiente = Math.max(0, total - yaPagado);

    if (pendiente <= 0) {
      alert("Este cobro ya está pagado.");
      return;
    }

    const cantidadTexto = window.prompt(
      `Total: ${total.toFixed(2)} €\\nYa pagado: ${yaPagado.toFixed(2)} €\\nPendiente: ${pendiente.toFixed(2)} €\\n\\n¿Cuánto paga ahora?`,
      ""
    );

    if (cantidadTexto === null) return;

    const cantidad = Number(
      cantidadTexto.replace(",", ".")
    );

    if (
      !Number.isFinite(cantidad) ||
      cantidad <= 0
    ) {
      alert("Introduce una cantidad válida.");
      return;
    }

    if (cantidad > pendiente) {
      alert(
        `No puede pagar más de lo pendiente (${pendiente.toFixed(2)} €).`
      );
      return;
    }

    const metodo = window.prompt(
      "Método de pago: efectivo, tarjeta, bizum, transferencia u otro",
      cobro.metodo_pago || "efectivo"
    );

    if (metodo === null) return;

    const metodoNormalizado = metodo
      .trim()
      .toLowerCase();

    const permitidos = [
      "efectivo",
      "tarjeta",
      "bizum",
      "transferencia",
      "otro",
    ];

    if (!permitidos.includes(metodoNormalizado)) {
      alert(
        "Método no válido. Usa efectivo, tarjeta, bizum, transferencia u otro."
      );
      return;
    }

    await ejecutarAccionEconomica({
      accion: "registrar_pago_parcial",
      action: "registrar_pago_parcial",
      pacienteId: paciente?.id,
      paciente_id: paciente?.id,
      cobroId: cobro.id,
      cobro_id: cobro.id,
      cantidad,
      metodoPago: metodoNormalizado,
      metodo_pago: metodoNormalizado,
    });
  };

  const crearCobroManual = async () => {
    if (!paciente) return;

    const concepto =
      window.prompt("Concepto del cobro:", "Sesión")?.trim();

    if (!concepto) return;

    const importeTexto = window.prompt(
      "Importe (€):",
      "35"
    );

    if (importeTexto === null) return;

    const importe = Number(
      importeTexto.replace(",", ".")
    );

    if (!Number.isFinite(importe) || importe <= 0) {
      alert("Introduce un importe válido.");
      return;
    }

    const pagado = window.confirm(
      "¿Este cobro ya está pagado?\n\nAceptar = Pagado\nCancelar = Pendiente"
    );

    let metodoPago: string | null = null;

    if (pagado) {
      const metodo = window.prompt(
        "Método de pago:",
        "efectivo"
      );

      if (metodo === null) return;

      metodoPago = metodo.trim().toLowerCase();

      const permitidos = [
        "efectivo",
        "tarjeta",
        "bizum",
        "transferencia",
        "otro",
      ];

      if (!permitidos.includes(metodoPago)) {
        alert(
          "Método no válido. Usa efectivo, tarjeta, bizum, transferencia u otro."
        );
        return;
      }
    }

    await ejecutarAccionEconomica({
      accion: "crear_cobro",
      action: "crear_cobro",
      pacienteId: paciente.id,
      paciente_id: paciente.id,
      concepto,
      importe,
      pagado,
      metodoPago,
      metodo_pago: metodoPago,
    });
  };

  const registrarCobroManual = async () => {
    if (!paciente) return;

    const importe = Number(importeCobro.replace(",", "."));
    const pagado = Number(
      (pagadoCobro || "0").replace(",", ".")
    );

    if (!conceptoCobro.trim()) {
      alert("Indica el concepto.");
      return;
    }

    if (!Number.isFinite(importe) || importe <= 0) {
      alert("Introduce un importe total válido.");
      return;
    }

    if (
      !Number.isFinite(pagado) ||
      pagado < 0 ||
      pagado > importe
    ) {
      alert(
        "La cantidad pagada debe estar entre 0 € y el importe total."
      );
      return;
    }

    setGuardandoCobro(true);

    try {
      const token = await obtenerTokenAdmin();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const estado =
        pagado <= 0
          ? "pendiente"
          : pagado < importe
          ? "parcial"
          : "pagado";

      const response = await fetch(
        "/api/admin/pacientes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            accion: "crear_cobro",
            pacienteId: paciente.id,
            paciente_id: paciente.id,
            concepto: conceptoCobro.trim(),
            importe,
            importePagado: pagado,
            importe_pagado: pagado,
            estado,
            metodoPago:
              pagado > 0 ? metodoCobro : null,
            metodo_pago:
              pagado > 0 ? metodoCobro : null,
          }),
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error ||
            "No se ha podido registrar el cobro."
        );
      }

      await cargarEconomia(paciente.id);

      setMostrarCobro(false);
      setConceptoCobro("Consulta");
      setImporteCobro("");
      setPagadoCobro("");
      setMetodoCobro("efectivo");

    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "No se ha podido registrar el cobro."
      );
    } finally {
      setGuardandoCobro(false);
    }
  };

  const cargarPaciente = async () => {
    setCargando(true);
    setError("");

    const pacienteId = obtenerId();

    if (!pacienteId) {
      setError("Paciente no válido.");
      setCargando(false);
      return;
    }

    const [
      pacienteResponse,
      historialResponse,
      citasResponse,
    ] = await Promise.all([
      supabase
        .from("pacientes")
        .select(
          "id,nombre,telefono,email,notas_generales,created_at"
        )
        .eq("id", pacienteId)
        .single(),

      supabase
        .from("historial_pacientes")
        .select(
          "id,paciente_id,fecha,motivo,tratamiento,observaciones,proxima_revision,created_at"
        )
        .eq("paciente_id", pacienteId)
        .order("fecha", {
          ascending: false,
        }),

      supabase
        .from("citas")
        .select(
          "id,nombre,telefono,email,motivo,fecha,hora,estado"
        )
        .eq("paciente_id", pacienteId)
        .order("fecha", {
          ascending: false,
        })
        .order("hora", {
          ascending: false,
        }),
    ]);

    if (pacienteResponse.error) {
      console.error(pacienteResponse.error);
      setError(
        "No se ha podido cargar el paciente."
      );
      setCargando(false);
      return;
    }

    if (historialResponse.error) {
      console.error(historialResponse.error);
    }

    if (citasResponse.error) {
      console.error(citasResponse.error);
    }

    const pacienteData =
      pacienteResponse.data as Paciente;

    setPaciente(pacienteData);
    setNotasGenerales(
      pacienteData.notas_generales || ""
    );

    setHistorial(
      (historialResponse.data || []) as Historial[]
    );

    setCitas(
      (citasResponse.data || []) as Cita[]
    );

    await cargarEconomia(pacienteId);

    setCargando(false);
  };

  const formatearFecha = (
    fecha: string | null
  ) => {
    if (!fecha) {
      return "—";
    }

    const [year, month, day] =
      fecha.split("-");

    return `${day}/${month}/${year}`;
  };

  const formatearFechaLarga = (
    fecha: string
  ) => {
    const [year, month, day] =
      fecha.split("-");

    const fechaObjeto = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return fechaObjeto.toLocaleDateString(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  const obtenerProximaCita = () => {
    const ahora = new Date();

    const futuras = citas
      .filter(
        (cita) =>
          cita.estado !== "cancelada"
      )
      .map((cita) => {
        const [year, month, day] =
          cita.fecha.split("-");

        const [hora, minutos] =
          cita.hora.split(":");

        const fecha = new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hora),
          Number(minutos)
        );

        return {
          ...cita,
          fechaObjeto: fecha,
        };
      })
      .filter(
        (cita) =>
          cita.fechaObjeto >= ahora
      )
      .sort(
        (a, b) =>
          a.fechaObjeto.getTime() -
          b.fechaObjeto.getTime()
      );

    return futuras[0] || null;
  };

  const guardarSesion = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!paciente) {
      return;
    }

    if (
      !motivo.trim() &&
      !tratamiento.trim() &&
      !observaciones.trim()
    ) {
      alert(
        "Añade al menos información sobre la sesión."
      );
      return;
    }

    setGuardando(true);

    const { data, error: supabaseError } =
      await supabase
        .from("historial_pacientes")
        .insert({
          paciente_id: paciente.id,
          fecha: new Date()
            .toISOString()
            .split("T")[0],
          motivo: motivo.trim() || null,
          tratamiento:
            tratamiento.trim() || null,
          observaciones:
            observaciones.trim() || null,
          proxima_revision:
            proximaRevision || null,
        })
        .select()
        .single();

    if (supabaseError) {
      console.error(supabaseError);

      alert(
        "No se ha podido guardar la sesión."
      );

      setGuardando(false);
      return;
    }

    setHistorial((actual) => [
      data as Historial,
      ...actual,
    ]);

    setMotivo("");
    setTratamiento("");
    setObservaciones("");
    setProximaRevision("");

    setMostrarFormulario(false);
    setGuardando(false);
  };

  const guardarNotas = async () => {
    if (!paciente) {
      return;
    }

    setGuardandoNotas(true);

    const { error: supabaseError } =
      await supabase
        .from("pacientes")
        .update({
          notas_generales:
            notasGenerales.trim() || null,
        })
        .eq("id", paciente.id);

    if (supabaseError) {
      console.error(supabaseError);

      alert(
        "No se han podido guardar las notas."
      );

      setGuardandoNotas(false);
      return;
    }

    setPaciente({
      ...paciente,
      notas_generales:
        notasGenerales.trim() || null,
    });

    setGuardandoNotas(false);
  };

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7F9]">

        <div className="text-center">

          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#0A3653]" />

          <p className="mt-4 text-sm text-slate-500">
            Cargando ficha...
          </p>

        </div>

      </main>
    );
  }

  if (!paciente) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7F9] px-5">

        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

          <p className="text-lg font-bold">
            No hemos encontrado este paciente
          </p>

          <a
            href="/admin/pacientes"
            className="mt-5 inline-block rounded-xl bg-[#0A3653] px-5 py-3 text-sm font-bold text-white"
          >
            ← Volver a pacientes
          </a>

        </div>

      </main>
    );
  }

  const proximaCita =
    obtenerProximaCita();

  const historialCitas = citas
    .filter((cita) => cita.estado !== "cancelada")
    .sort((a, b) => {
      const fechaA = `${a.fecha}T${a.hora}`;
      const fechaB = `${b.fecha}T${b.hora}`;
      return fechaB.localeCompare(fechaA);
    });

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-[#0A3653]">

      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">

        <div className="mx-auto max-w-[1400px]">

          <div className="flex items-center justify-between gap-4">

            <a
              href="/admin/pacientes"
              className="flex items-center gap-3 text-sm font-bold transition hover:text-[#B1263A]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg">
                ←
              </span>

              <span className="hidden sm:block">
                Pacientes
              </span>
            </a>

            <button
              onClick={cargarPaciente}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold transition hover:border-[#0A3653]"
            >
              ↻ Actualizar
            </button>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-8 sm:py-10">

        {/* PERFIL */}

        <section className="overflow-hidden rounded-[2rem] bg-[#0A3653] p-6 text-white shadow-lg sm:p-8">

          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-5">

              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-3xl font-bold">
                {paciente.nombre
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                  Ficha del paciente
                </p>

                <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                  {paciente.nombre}
                </h1>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/60">

                  {paciente.telefono && (
                    <a
                      href={`tel:${paciente.telefono}`}
                      className="hover:text-white"
                    >
                      📞 {paciente.telefono}
                    </a>
                  )}

                  {paciente.email && (
                    <a
                      href={`mailto:${paciente.email}`}
                      className="hover:text-white"
                    >
                      ✉️ {paciente.email}
                    </a>
                  )}

                </div>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/50">
                  Sesiones
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {historial.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/50">
                  Citas
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {citas.length}
                </p>
              </div>

              <div className="col-span-2 rounded-2xl bg-white/10 p-4 sm:col-span-1">
                <p className="text-[10px] uppercase tracking-wider text-white/50">
                  Próxima cita
                </p>

                <p className="mt-1 text-sm font-bold">
                  {proximaCita
                    ? `${formatearFecha(
                        proximaCita.fecha
                      )} · ${proximaCita.hora}`
                    : "Sin cita"}
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* ACCIONES */}

        <section className="mt-5 flex flex-wrap gap-3">

          {paciente.telefono && (
            <a
              href={`tel:${paciente.telefono}`}
              className="rounded-xl bg-white px-5 py-3 text-xs font-bold shadow-sm transition hover:-translate-y-0.5"
            >
              📞 Llamar
            </a>
          )}

          {paciente.email && (
            <a
              href={`mailto:${paciente.email}`}
              className="rounded-xl bg-white px-5 py-3 text-xs font-bold shadow-sm transition hover:-translate-y-0.5"
            >
              ✉️ Email
            </a>
          )}

          <a
            href={`/admin/citas/nueva?pacienteId=${paciente.id}`}
            style={{
              color: "#ffffff",
              WebkitTextFillColor: "#ffffff",
            }}
            className="rounded-xl bg-[#0A3653] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
          >
            + Nueva cita
          </a>

          <button
            onClick={() =>
              setMostrarFormulario(true)
            }
            className="rounded-xl bg-[#B1263A] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
          >
            + Añadir sesión
          </button>

          <button
            type="button"
            onClick={() => setMostrarCobro(true)}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
            style={{
              color: "#ffffff",
              WebkitTextFillColor: "#ffffff",
            }}
          >
            € Registrar cobro
          </button>

        </section>

        {/* CONTENIDO */}

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* HISTORIAL */}

          <section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                  Evolución
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Historial de sesiones
                </h2>

              </div>

              <button
                onClick={() =>
                  setMostrarFormulario(true)
                }
                className="hidden rounded-xl bg-[#0A3653] px-4 py-3 text-xs font-bold text-white sm:block"
              >
                + Nueva sesión
              </button>

            </div>

            {historial.length === 0 ? (

              <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-10 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F7F9] text-xl">
                  📋
                </div>

                <h3 className="mt-4 font-bold">
                  Todavía no hay sesiones
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Añade la primera sesión para comenzar
                  el historial del paciente.
                </p>

                <button
                  onClick={() =>
                    setMostrarFormulario(true)
                  }
                  className="mt-5 rounded-xl bg-[#0A3653] px-5 py-3 text-xs font-bold text-white"
                >
                  + Añadir primera sesión
                </button>

              </div>

            ) : (

              <div className="relative mt-8 space-y-6">

                <div className="absolute bottom-4 left-[15px] top-4 w-px bg-slate-200" />

                {historial.map((sesion) => (

                  <article
                    key={sesion.id}
                    className="relative pl-10"
                  >

                    <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-[#B1263A] shadow-sm" />

                    <div className="rounded-2xl border border-slate-100 bg-[#F9FBFC] p-5">

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                        <p className="text-sm font-bold capitalize">
                          {formatearFechaLarga(
                            sesion.fecha
                          )}
                        </p>

                        {sesion.proxima_revision && (
                          <span className="w-fit rounded-full bg-[#0A3653]/10 px-3 py-1 text-[10px] font-bold text-[#0A3653]">
                            Revisión:{" "}
                            {formatearFecha(
                              sesion.proxima_revision
                            )}
                          </span>
                        )}

                      </div>

                      {sesion.motivo && (
                        <div className="mt-4">

                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Motivo
                          </p>

                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {sesion.motivo}
                          </p>

                        </div>
                      )}

                      {sesion.tratamiento && (
                        <div className="mt-4">

                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Tratamiento
                          </p>

                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {sesion.tratamiento}
                          </p>

                        </div>
                      )}

                      {sesion.observaciones && (
                        <div className="mt-4 border-t border-slate-200 pt-4">

                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Observaciones
                          </p>

                          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                            {sesion.observaciones}
                          </p>

                        </div>
                      )}

                    </div>

                  </article>

                ))}

              </div>

            )}

          </section>

          
            {/* CITAS DEL PACIENTE */}
            <section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                  Historial
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Citas y motivos
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Sesiones reservadas por este paciente.
                </p>
              </div>

              {historialCitas.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-[#F4F7F9] p-6 text-center">
                  <p className="text-sm font-semibold">
                    No hay citas registradas
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {historialCitas.map((cita) => (
                    <article
                      key={cita.id}
                      className="rounded-2xl border border-slate-100 bg-[#F9FBFC] p-5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <strong className="capitalize text-[#0A3653]">
                          {formatearFechaLarga(cita.fecha)}
                        </strong>

                        <span className="w-fit rounded-full bg-[#0A3653]/10 px-3 py-1 text-xs font-bold text-[#0A3653]">
                          {cita.hora.slice(0, 5)}
                        </span>
                      </div>

                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Motivo de la consulta
                        </p>

                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {cita.motivo || "Sin motivo indicado"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* COLUMNA DERECHA */}

          <aside className="space-y-6">


            {/* PANEL ECONOMICO VISIBLE */}
            <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">

              <div className="bg-[#0A3653] p-6 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                  Gestión económica
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <h3 className="text-xl font-bold">
                    Bonos y cobros
                  </h3>

                  <span className="rounded-xl bg-white/10 px-3 py-2 font-bold">
                    €
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                      Cobrado
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {totalCobrado.toFixed(2)} €
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#B1263A] p-4">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                      Pendiente
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {totalPendiente.toFixed(2)} €
                    </p>
                  </div>

                </div>
              </div>

              <div className="p-6">

                {errorEconomia && (
                  <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                    {errorEconomia}
                  </div>
                )}

                {/* BONOS */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B1263A]">
                      Bonos
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      Sesiones contratadas
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={crearBono}
                    disabled={accionEconomica}
                    className="rounded-xl bg-[#0A3653] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    + Bono
                  </button>
                </div>

                {cargandoEconomia ? (
                  <p className="mt-5 text-center text-xs text-slate-400">
                    Cargando...
                  </p>
                ) : bonos.length === 0 ? (

                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                    <p className="text-sm font-bold text-slate-500">
                      Sin bonos activos
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Pulsa + Bono para crear uno.
                    </p>
                  </div>

                ) : (

                  <div className="mt-4 space-y-3">

                    {bonos.map((bono) => {

                      const restantes = Math.max(
                        0,
                        bono.sesiones_totales -
                          bono.sesiones_usadas
                      );

                      return (
                        <div
                          key={bono.id}
                          className="rounded-2xl border border-slate-100 bg-[#F9FBFC] p-4"
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div>
                              <p className="text-sm font-bold">
                                {bono.nombre}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {Number(bono.precio).toFixed(2)} €
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                                bono.estado === "activo"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {bono.estado}
                            </span>

                          </div>

                          {/* CÍRCULOS DE SESIONES */}
                          <div className="mt-4 flex flex-wrap gap-2">

                            {Array.from({
                              length: bono.sesiones_totales,
                            }).map((_, index) => (

                              <div
                                key={index}
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ${
                                  index < bono.sesiones_usadas
                                    ? "bg-[#0A3653] text-white"
                                    : "border border-slate-300 bg-white text-slate-400"
                                }`}
                              >
                                {index + 1}
                              </div>

                            ))}

                          </div>

                          <div className="mt-4 flex items-end justify-between gap-3">

                            <div>
                              <p className="text-2xl font-bold">
                                {restantes}
                              </p>

                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                sesiones restantes
                              </p>
                            </div>

                            {bono.estado === "activo" &&
                              restantes > 0 && (

                                <button
                                  type="button"
                                  onClick={() =>
                                    consumirBono(bono)
                                  }
                                  disabled={accionEconomica}
                                  className="rounded-xl border border-[#0A3653] px-3 py-2 text-[10px] font-bold text-[#0A3653] transition hover:bg-[#0A3653] hover:text-white disabled:opacity-50"
                                >
                                  Consumir sesión
                                </button>

                              )}

                          </div>

                        </div>
                      );
                    })}

                  </div>

                )}

                {/* COBROS */}
                <div className="mt-7 border-t border-slate-100 pt-6">

                  <div className="flex items-center justify-between gap-3">

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B1263A]">
                        Cobros
                      </p>

                      <p className="mt-1 text-sm font-bold">
                        Pagos del paciente
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={crearCobroManual}
                      disabled={accionEconomica}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold disabled:opacity-50"
                    >
                      + Cobro
                    </button>

                  </div>

                  {cobros.length === 0 ? (

                    <div className="mt-4 rounded-xl bg-[#F4F7F9] p-4 text-center">
                      <p className="text-xs text-slate-400">
                        No hay cobros registrados.
                      </p>
                    </div>

                  ) : (

                    <div className="mt-4 space-y-2">

                      {cobros.map((cobro) => (

                        <div
                          key={cobro.id}
                          className="rounded-xl border border-slate-100 p-4"
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">
                              <p className="text-xs font-bold">
                                {cobro.concepto}
                              </p>

                              <p className="mt-1 text-[10px] text-slate-400">
                                {formatearFecha(cobro.fecha)}
                                {cobro.metodo_pago
                                  ? ` · ${cobro.metodo_pago}`
                                  : ""}
                              </p>
                            </div>

                            <div className="text-right">

                              <p className="text-sm font-bold">
                                {Number(cobro.importe).toFixed(2)} €
                              </p>

                              <span
                                className={`mt-1 inline-block rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                                  cobro.estado === "pagado"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : cobro.estado === "parcial"
                                    ? "bg-amber-50 text-amber-700"
                                    : cobro.estado === "cancelado"
                                    ? "bg-slate-100 text-slate-400"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                {cobro.estado}
                              </span>

                            </div>

                          </div>

                          {cobro.estado !== "pagado" &&
                            cobro.estado !== "cancelado" && (

                              <button
                                type="button"
                                onClick={() =>
                                  marcarCobroPagado(cobro)
                                }
                                disabled={accionEconomica}
                                className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-bold text-white disabled:opacity-50"
                              >
                                € Registrar pago
                              </button>

                            )}

                        </div>

                      ))}

                    </div>

                  )}

                </div>

              </div>

            </section>

            {/* PROXIMA CITA */}

            <section className="rounded-[2rem] bg-white p-6 shadow-sm">

              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                Próxima cita
              </p>

              {proximaCita ? (

                <div className="mt-5">

                  <p className="text-2xl font-bold">
                    {proximaCita.hora}
                  </p>

                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {formatearFechaLarga(
                      proximaCita.fecha
                    )}
                  </p>

                  <div className="mt-4 rounded-xl bg-[#F4F7F9] p-4">

                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Motivo
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {proximaCita.motivo ||
                        "Sin motivo indicado"}
                    </p>

                  </div>

                  <a
                    href="/agenda"
                    className="mt-4 block rounded-xl bg-[#0A3653] px-4 py-3 text-center text-xs font-bold text-white"
                  >
                    Ver agenda →
                  </a>

                </div>

              ) : (

                <div className="mt-5 rounded-2xl bg-[#F4F7F9] p-5 text-center">

                  <p className="text-sm font-semibold">
                    No hay citas futuras
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    El paciente no tiene ninguna cita
                    programada.
                  </p>

                </div>

              )}

            </section>

            {/* DATOS */}

            <section className="rounded-[2rem] bg-white p-6 shadow-sm">

              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                Información
              </p>

              <div className="mt-5 space-y-4">

                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Teléfono
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {paciente.telefono ||
                      "No indicado"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold">
                    {paciente.email ||
                      "No indicado"}
                  </p>
                </div>

              </div>

            </section>

            {/* NOTAS GENERALES */}

            <section className="rounded-[2rem] bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between gap-3">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                    Notas
                  </p>

                  <h3 className="mt-2 font-bold">
                    Notas generales
                  </h3>

                </div>

              </div>

              <textarea
                value={notasGenerales}
                onChange={(event) =>
                  setNotasGenerales(
                    event.target.value
                  )
                }
                placeholder="Añade información general del paciente..."
                rows={5}
                className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-[#F9FBFC] p-3 text-sm outline-none transition focus:border-[#0A3653]"
              />

              <button
                onClick={guardarNotas}
                disabled={guardandoNotas}
                className="mt-3 w-full rounded-xl bg-[#0A3653] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {guardandoNotas
                  ? "Guardando..."
                  : "Guardar notas"}
              </button>

            </section>

          </aside>

        </div>

      </div>

      {/* MODAL NUEVA SESIÓN */}

      {mostrarFormulario && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A3653]/40 p-4 backdrop-blur-sm"
          onClick={() =>
            setMostrarFormulario(false)
          }
        >

          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                  Nueva sesión
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Registrar sesión
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {paciente.nombre}
                </p>

              </div>

              <button
                onClick={() =>
                  setMostrarFormulario(false)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={guardarSesion}
              className="mt-7 space-y-5"
            >

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Motivo de la sesión
                </label>

                <textarea
                  value={motivo}
                  onChange={(event) =>
                    setMotivo(event.target.value)
                  }
                  rows={3}
                  placeholder="¿Por qué acude hoy?"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-[#F9FBFC] p-4 text-sm outline-none focus:border-[#0A3653]"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tratamiento realizado
                </label>

                <textarea
                  value={tratamiento}
                  onChange={(event) =>
                    setTratamiento(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Tratamiento o técnicas realizadas..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-[#F9FBFC] p-4 text-sm outline-none focus:border-[#0A3653]"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Observaciones
                </label>

                <textarea
                  value={observaciones}
                  onChange={(event) =>
                    setObservaciones(
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder="Observaciones, evolución, recomendaciones..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-[#F9FBFC] p-4 text-sm outline-none focus:border-[#0A3653]"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Próxima revisión
                </label>

                <input
                  type="date"
                  value={proximaRevision}
                  onChange={(event) =>
                    setProximaRevision(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-[#F9FBFC] px-4 py-3.5 text-sm outline-none focus:border-[#0A3653]"
                />

              </div>

              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setMostrarFormulario(false)
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 rounded-xl bg-[#0A3653] px-4 py-3.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar sesión"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

          {/* MODAL REGISTRAR COBRO */}
      {mostrarCobro && paciente && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setMostrarCobro(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#0A3653] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                    Gestión económica
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Registrar cobro
                  </h2>

                  <p className="mt-1 text-sm text-white/60">
                    {paciente.nombre}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarCobro(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Concepto
                </label>

                <input
                  value={conceptoCobro}
                  onChange={(e) =>
                    setConceptoCobro(e.target.value)
                  }
                  placeholder="Consulta, tratamiento, bono..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0A3653]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Importe total
                  </label>

                  <div className="relative">
                    <input
                      inputMode="decimal"
                      value={importeCobro}
                      onChange={(e) =>
                        setImporteCobro(e.target.value)
                      }
                      placeholder="60"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-9 text-lg font-bold outline-none focus:border-[#0A3653]"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      €
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ha pagado
                  </label>

                  <div className="relative">
                    <input
                      inputMode="decimal"
                      value={pagadoCobro}
                      onChange={(e) =>
                        setPagadoCobro(e.target.value)
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-9 text-lg font-bold outline-none focus:border-[#0A3653]"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      €
                    </span>
                  </div>
                </div>

              </div>

              {importeCobro &&
                Number(importeCobro.replace(",", ".")) > 0 && (
                  <div
                    className={`rounded-2xl p-4 ${
                      Number(
                        (pagadoCobro || "0").replace(",", ".")
                      ) <= 0
                        ? "bg-red-50 text-red-700"
                        : Number(
                            (pagadoCobro || "0").replace(",", ".")
                          ) <
                          Number(
                            importeCobro.replace(",", ".")
                          )
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <p className="font-bold">
                      {Number(
                        (pagadoCobro || "0").replace(",", ".")
                      ) <= 0
                        ? "🔴 Pendiente"
                        : Number(
                            (pagadoCobro || "0").replace(",", ".")
                          ) <
                          Number(
                            importeCobro.replace(",", ".")
                          )
                        ? "🟠 Pago parcial"
                        : "🟢 Pagado"}
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      Faltan{" "}
                      {Math.max(
                        0,
                        Number(
                          importeCobro.replace(",", ".")
                        ) -
                          Number(
                            (pagadoCobro || "0").replace(",", ".")
                          )
                      ).toFixed(2)}{" "}
                      €
                    </p>
                  </div>
                )}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Método de pago
                </label>

                <select
                  value={metodoCobro}
                  onChange={(e) =>
                    setMetodoCobro(e.target.value)
                  }
                  disabled={
                    Number(
                      (pagadoCobro || "0").replace(",", ".")
                    ) <= 0
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none disabled:bg-slate-50"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="bizum">Bizum</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">
                    Transferencia
                  </option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={() => setMostrarCobro(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={guardandoCobro}
                  onClick={registrarCobroManual}
                  className="flex-1 rounded-xl bg-[#0A3653] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  style={{
                    color: "#ffffff",
                    WebkitTextFillColor: "#ffffff",
                  }}
                >
                  {guardandoCobro
                    ? "Guardando..."
                    : "Registrar cobro"}
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

</main>
  );
}