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

          <button
            onClick={() =>
              setMostrarFormulario(true)
            }
            className="rounded-xl bg-[#B1263A] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
          >
            + Añadir sesión
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

          {/* COLUMNA DERECHA */}

          <aside className="space-y-6">

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

    </main>
  );
}