"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Cita = {
  id: number;
  created_at: string;
  motivo: string | null;
  fecha: string;
  hora: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  estado: string | null;
  paciente_id: number | null;
};

export default function SolicitudesPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [filtro, setFiltro] = useState<
    "todas" | "pendiente" | "confirmada" | "cancelada"
  >("todas");

  const [seleccionada, setSeleccionada] =
    useState<Cita | null>(null);

  const [procesando, setProcesando] = useState(false);

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

    cargarCitas();
  };

  const cargarCitas = async () => {
    setCargando(true);
    setError("");

    const { data, error: supabaseError } =
      await supabase
        .from("citas")
        .select(
          "id,created_at,motivo,fecha,hora,nombre,telefono,email,estado,paciente_id"
        )
        .order("fecha", {
          ascending: true,
        })
        .order("hora", {
          ascending: true,
        });

    if (supabaseError) {
      console.error(supabaseError);
      setError(
        "No se han podido cargar las solicitudes."
      );
      setCargando(false);
      return;
    }

    setCitas((data || []) as Cita[]);
    setCargando(false);
  };

  const cambiarEstado = async (
    cita: Cita,
    nuevoEstado: "confirmada" | "cancelada"
  ) => {
    setProcesando(true);

    let respuesta: Response;

    try {
      respuesta = await fetch(
        "/api/admin/citas/estado",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: cita.id,
            estado: nuevoEstado,
          }),
        }
      );
    } catch {
      alert(
        "No se ha podido contactar con el servidor."
      );
      setProcesando(false);
      return;
    }

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      alert(
        resultado.error ||
        "No se ha podido actualizar la cita."
      );
      setProcesando(false);
      return;
    }

    setCitas((actuales) =>
      actuales.map((item) =>
        item.id === cita.id
          ? {
              ...item,
              estado: nuevoEstado,
            }
          : item
      )
    );

    setSeleccionada(null);
    setProcesando(false);
  };

  const formatearFecha = (fecha: string) => {
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
      }
    );
  };

  const esPasada = (cita: Cita) => {
    const [year, month, day] =
      cita.fecha.split("-");

    const [hora, minutos] =
      cita.hora.split(":");

    const fechaCita = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hora),
      Number(minutos)
    );

    return fechaCita < new Date();
  };

  const solicitudesFiltradas = useMemo(() => {
    if (filtro === "todas") {
      return citas;
    }

    return citas.filter(
      (cita) => cita.estado === filtro
    );
  }, [citas, filtro]);

  const pendientes = citas.filter(
    (cita) => cita.estado === "pendiente"
  ).length;

  const confirmadas = citas.filter(
    (cita) => cita.estado === "confirmada"
  ).length;

  const canceladas = citas.filter(
    (cita) => cita.estado === "cancelada"
  ).length;

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7F9]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#0A3653]" />

          <p className="mt-4 text-sm text-slate-500">
            Cargando solicitudes...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-[#0A3653]">

      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">

        <div className="mx-auto max-w-[1400px]">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                Gestión de clínica
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                Solicitudes
              </h1>
            </div>

            <button
              onClick={cargarCitas}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold transition hover:border-[#0A3653]"
            >
              ↻ Actualizar
            </button>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-8 sm:py-10">

        {/* CABECERA */}

        <section className="mb-7">

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

            <div>

              <h2 className="text-3xl font-bold sm:text-4xl">
                Citas
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                Gestiona las solicitudes realizadas desde
                la web y confirma las citas de tus pacientes.
              </p>

            </div>

          </div>

        </section>

        {/* ESTADÍSTICAS */}

        <section className="grid gap-4 sm:grid-cols-3">

          <button
            onClick={() => setFiltro("pendiente")}
            className={`rounded-2xl border p-5 text-left transition ${
              filtro === "pendiente"
                ? "border-[#B1263A] bg-[#B1263A] text-white shadow-lg"
                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >

            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                filtro === "pendiente"
                  ? "text-white/60"
                  : "text-slate-400"
              }`}
            >
              Pendientes
            </p>

            <p className="mt-2 text-3xl font-bold">
              {pendientes}
            </p>

            <p
              className={`mt-1 text-xs ${
                filtro === "pendiente"
                  ? "text-white/60"
                  : "text-slate-400"
              }`}
            >
              Necesitan revisión
            </p>

          </button>

          <button
            onClick={() => setFiltro("confirmada")}
            className={`rounded-2xl border p-5 text-left transition ${
              filtro === "confirmada"
                ? "border-[#0A3653] bg-[#0A3653] text-white shadow-lg"
                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >

            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                filtro === "confirmada"
                  ? "text-white/60"
                  : "text-slate-400"
              }`}
            >
              Confirmadas
            </p>

            <p className="mt-2 text-3xl font-bold">
              {confirmadas}
            </p>

            <p
              className={`mt-1 text-xs ${
                filtro === "confirmada"
                  ? "text-white/60"
                  : "text-slate-400"
              }`}
            >
              Citas programadas
            </p>

          </button>

          <button
            onClick={() => setFiltro("cancelada")}
            className={`rounded-2xl border p-5 text-left transition ${
              filtro === "cancelada"
                ? "border-slate-600 bg-slate-600 text-white shadow-lg"
                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >

            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                filtro === "cancelada"
                  ? "text-white/60"
                  : "text-slate-400"
              }`}
            >
              Canceladas
            </p>

            <p className="mt-2 text-3xl font-bold">
              {canceladas}
            </p>

            <p
              className={`mt-1 text-xs ${
                filtro === "cancelada"
                  ? "text-white/60"
                  : "text-slate-400"
              }`}
            >
              Solicitudes canceladas
            </p>

          </button>

        </section>

        {/* FILTROS */}

        <section className="mt-7 flex flex-wrap items-center gap-2">

          {[
            {
              key: "todas",
              label: "Todas",
            },
            {
              key: "pendiente",
              label: "Pendientes",
            },
            {
              key: "confirmada",
              label: "Confirmadas",
            },
            {
              key: "cancelada",
              label: "Canceladas",
            },
          ].map((item) => (

            <button
              key={item.key}
              onClick={() =>
                setFiltro(
                  item.key as
                    | "todas"
                    | "pendiente"
                    | "confirmada"
                    | "cancelada"
                )
              }
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                filtro === item.key
                  ? "bg-[#0A3653] text-white"
                  : "bg-white text-slate-500 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>

          ))}

        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* LISTADO */}

        <section className="mt-6">

          {solicitudesFiltradas.length === 0 ? (

            <div className="rounded-[2rem] bg-white p-12 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F4F7F9] text-2xl">
                📭
              </div>

              <h3 className="mt-5 text-lg font-bold">
                No hay citas aquí
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                Cuando haya solicitudes que coincidan
                con este filtro aparecerán aquí.
              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {solicitudesFiltradas.map((cita) => {

                const pendiente =
                  cita.estado === "pendiente";

                const confirmada =
                  cita.estado === "confirmada";

                return (
                  <article
                    key={cita.id}
                    className={`rounded-[1.5rem] border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${
                      pendiente
                        ? "border-[#B1263A]/20"
                        : "border-slate-100"
                    }`}
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* FECHA */}

                      <div className="flex items-center gap-4">

                        <div
                          className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ${
                            pendiente
                              ? "bg-[#B1263A]/10 text-[#B1263A]"
                              : "bg-[#0A3653]/10 text-[#0A3653]"
                          }`}
                        >

                          <span className="text-[9px] font-bold uppercase">
                            {new Date(
                              cita.fecha
                            ).toLocaleDateString(
                              "es-ES",
                              {
                                month: "short",
                              }
                            )}
                          </span>

                          <span className="text-2xl font-bold">
                            {cita.fecha.split("-")[2]}
                          </span>

                        </div>

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {formatearFechaLarga(
                              cita.fecha
                            )}
                          </p>

                          <p className="mt-1 text-2xl font-bold">
                            {cita.hora}
                          </p>

                        </div>

                      </div>

                      {/* PACIENTE */}

                      <div className="min-w-0 flex-1 lg:max-w-sm">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Paciente
                        </p>

                        <p className="mt-1 truncate text-lg font-bold">
                          {cita.nombre ||
                            "Paciente sin nombre"}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">

                          {cita.telefono && (
                            <span>
                              📞 {cita.telefono}
                            </span>
                          )}

                          {cita.email && (
                            <span className="truncate">
                              ✉️ {cita.email}
                            </span>
                          )}

                        </div>

                      </div>

                      {/* MOTIVO */}

                      <div className="min-w-0 flex-1 lg:max-w-md">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Motivo de consulta
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
                          {cita.motivo ||
                            "El paciente no ha indicado el motivo."}
                        </p>

                      </div>

                      {/* ESTADO */}

                      <div className="flex items-center gap-3">

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                            pendiente
                              ? "bg-amber-100 text-amber-700"
                              : confirmada
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {pendiente
                            ? "Pendiente"
                            : confirmada
                            ? "Confirmada"
                            : "Cancelada"}
                        </span>

                        <button
                          onClick={() =>
                            setSeleccionada(cita)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm transition hover:border-[#0A3653]"
                        >
                          →
                        </button>

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>

      </div>

      {/* MODAL */}

      {seleccionada && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A3653]/40 p-4 backdrop-blur-sm"
          onClick={() =>
            setSeleccionada(null)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* CABECERA MODAL */}

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                  Detalle de cita
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {seleccionada.nombre ||
                    "Paciente"}
                </h2>

              </div>

              <button
                onClick={() =>
                  setSeleccionada(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg"
              >
                ×
              </button>

            </div>

            {/* FECHA */}

            <div className="mt-7 rounded-2xl bg-[#F4F7F9] p-5">

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cita solicitada
              </p>

              <p className="mt-2 text-xl font-bold capitalize">
                {formatearFechaLarga(
                  seleccionada.fecha
                )}
              </p>

              <p className="mt-1 text-lg font-bold text-[#B1263A]">
                {seleccionada.hora}
              </p>

            </div>

            {/* DATOS */}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              <div className="rounded-xl border border-slate-100 p-4">

                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Teléfono
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {seleccionada.telefono ||
                    "No indicado"}
                </p>

              </div>

              <div className="rounded-xl border border-slate-100 p-4">

                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Email
                </p>

                <p className="mt-1 break-all text-sm font-semibold">
                  {seleccionada.email ||
                    "No indicado"}
                </p>

              </div>

            </div>

            {/* MOTIVO */}

            <div className="mt-6">

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Motivo de consulta
              </p>

              <div className="mt-2 rounded-2xl bg-[#F9FBFC] p-5">

                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {seleccionada.motivo ||
                    "No se ha indicado ningún motivo."}
                </p>

              </div>

            </div>

            {/* PACIENTE */}

            {seleccionada.paciente_id && (
              <a
                href={`/admin/pacientes/${seleccionada.paciente_id}`}
                className="mt-5 block rounded-xl border border-slate-200 px-4 py-3 text-center text-xs font-bold transition hover:border-[#0A3653]"
              >
                Ver ficha completa del paciente →
              </a>
            )}

            {/* ACCIONES */}

            {seleccionada.estado === "pendiente" && (

              <div className="mt-7 grid gap-3 sm:grid-cols-2">

                <button
                  disabled={procesando}
                  onClick={() =>
                    cambiarEstado(
                      seleccionada,
                      "cancelada"
                    )
                  }
                  className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  ✕ Cancelar cita
                </button>

                <button
                  disabled={procesando}
                  onClick={() =>
                    cambiarEstado(
                      seleccionada,
                      "confirmada"
                    )
                  }
                  className="rounded-xl bg-[#0A3653] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#082c45] disabled:opacity-50"
                >
                  {procesando
                    ? "Procesando..."
                    : "✓ Confirmar cita"}
                </button>

              </div>

            )}

            {seleccionada.estado ===
              "confirmada" && (

              <div className="mt-7 rounded-2xl bg-emerald-50 p-5 text-center">

                <p className="font-bold text-emerald-700">
                  ✓ Esta cita está confirmada
                </p>

                <button
                  disabled={procesando}
                  onClick={() =>
                    cambiarEstado(
                      seleccionada,
                      "cancelada"
                    )
                  }
                  className="mt-3 text-xs font-bold text-red-600 underline"
                >
                  Cancelar cita
                </button>

              </div>
            )}

            {seleccionada.estado ===
              "cancelada" && (

              <div className="mt-7 rounded-2xl bg-slate-100 p-5 text-center">

                <p className="font-bold text-slate-500">
                  Esta cita está cancelada
                </p>

                <button
                  disabled={procesando}
                  onClick={() =>
                    cambiarEstado(
                      seleccionada,
                      "confirmada"
                    )
                  }
                  className="mt-3 text-xs font-bold text-[#0A3653] underline"
                >
                  Volver a confirmar
                </button>

              </div>
            )}

          </div>

        </div>

      )}

    </main>
  );
}