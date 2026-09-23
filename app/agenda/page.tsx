"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Estado = "pendiente" | "confirmada" | "cancelada";

type Cita = {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  fecha: string;
  hora: string;
  motivo: string;
  estado: Estado;
};

const HORAS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

const fechaLocal = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const convertirFecha = (fecha: string) => {
  const [year, month, day] = fecha.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const sumarDias = (fecha: Date, dias: number) => {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + dias);

  return nueva;
};

const obtenerLunes = (fecha: Date) => {
  const nueva = new Date(fecha);
  const dia = nueva.getDay();

  const diferencia = dia === 0 ? -6 : 1 - dia;

  nueva.setDate(nueva.getDate() + diferencia);

  return nueva;
};

const formatearDia = (fecha: Date) => {
  return fecha.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
  });
};

const formatearMes = (fecha: Date) => {
  return fecha.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
};

export default function Agenda() {
  const [semana, setSemana] = useState(
    obtenerLunes(new Date())
  );

  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [citaSeleccionada, setCitaSeleccionada] =
    useState<Cita | null>(null);

  const [actualizando, setActualizando] =
    useState<number | null>(null);

  const dias = useMemo(() => {
    return Array.from({ length: 5 }, (_, indice) =>
      sumarDias(semana, indice)
    );
  }, [semana]);

  const cargarCitas = async () => {
    setCargando(true);
    setError("");

    const primerDia = fechaLocal(dias[0]);
    const ultimoDia = fechaLocal(dias[4]);

    const { data, error: supabaseError } = await supabase
      .from("citas")
      .select(
        "id,nombre,telefono,email,fecha,hora,motivo,estado"
      )
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (supabaseError) {
      console.error(
        "Error cargando agenda:",
        supabaseError
      );

      setError(supabaseError.message);
      setCargando(false);
      return;
    }

    setCitas((data || []) as Cita[]);
    setCargando(false);
  };

  useEffect(() => {
    cargarCitas();
  }, [semana]);

  const citasDe = (fecha: Date, hora: string) => {
    const fechaTexto = fechaLocal(fecha);

    return citas.filter(
      (cita) =>
        cita.fecha === fechaTexto &&
        cita.hora === hora
    );
  };

  const cambiarEstado = async (
    cita: Cita,
    nuevoEstado: "confirmada" | "cancelada"
  ) => {
    setActualizando(cita.id);

    try {
      const respuesta = await fetch(
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

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        alert(
          resultado.error ||
          "No se ha podido actualizar la cita."
        );
        setActualizando(null);
        return;
      }
    } catch {
      alert(
        "No se ha podido contactar con el servidor."
      );
      setActualizando(null);
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

    setCitaSeleccionada((actual) =>
      actual && actual.id === cita.id
        ? {
            ...actual,
            estado: nuevoEstado,
          }
        : actual
    );

    setActualizando(null);
  };

  const irHoy = () => {
    setSemana(obtenerLunes(new Date()));
  };

  const semanaAnterior = () => {
    setSemana((actual) =>
      sumarDias(actual, -7)
    );
  };

  const semanaSiguiente = () => {
    setSemana((actual) =>
      sumarDias(actual, 7)
    );
  };

  const citasSemana = citas.length;

  const confirmadas = citas.filter(
    (cita) => cita.estado === "confirmada"
  ).length;

  const pendientes = citas.filter(
    (cita) => cita.estado === "pendiente"
  ).length;

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-[#0A3653]">

      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">

        <div className="mx-auto max-w-[1500px]">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="flex items-center gap-3">

                <a
                  href="/admin"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg transition hover:border-[#0A3653]"
                >
                  ←
                </a>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                    Clínica de Osteopatía
                  </p>

                  <h1 className="mt-1 text-xl font-bold">
                    Agenda
                  </h1>
                </div>

              </div>

            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button
                onClick={semanaAnterior}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white font-bold transition hover:border-[#0A3653]"
              >
                ←
              </button>

              <button
                onClick={irHoy}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold transition hover:border-[#0A3653]"
              >
                Hoy
              </button>

              <button
                onClick={semanaSiguiente}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white font-bold transition hover:border-[#0A3653]"
              >
                →
              </button>

              <button
                onClick={cargarCitas}
                disabled={cargando}
                className="ml-1 flex items-center gap-2 rounded-xl bg-[#0A3653] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#082b43] disabled:opacity-50"
              >
                <span
                  className={
                    cargando ? "animate-spin" : ""
                  }
                >
                  ↻
                </span>

                Actualizar
              </button>

            </div>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8">

        {/* RESUMEN */}

        <section className="mb-6 grid gap-3 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-400">
              Esta semana
            </p>

            <p className="mt-2 text-3xl font-bold">
              {citasSemana}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              citas registradas
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-400">
              Confirmadas
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {confirmadas}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              citas confirmadas
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-400">
              Pendientes
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-500">
              {pendientes}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              necesitan respuesta
            </p>
          </div>

        </section>

        {/* CABECERA SEMANA */}

        <section className="mb-5">

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#B1263A]">
            Semana
          </p>

          <h2 className="mt-1 text-2xl font-bold capitalize">
            {formatearMes(semana)}
          </h2>

        </section>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* AGENDA */}

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <div className="min-w-[950px]">

              {/* DIAS */}

              <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-slate-200">

                <div className="bg-[#F9FBFC]" />

                {dias.map((dia) => {

                  const esHoy =
                    fechaLocal(dia) === fechaLocal(new Date());

                  return (
                    <div
                      key={fechaLocal(dia)}
                      className={`border-l border-slate-200 px-4 py-5 text-center ${
                        esHoy
                          ? "bg-[#0A3653] text-white"
                          : "bg-white"
                      }`}
                    >

                      <p
                        className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                          esHoy
                            ? "text-white/60"
                            : "text-slate-400"
                        }`}
                      >
                        {dia.toLocaleDateString(
                          "es-ES",
                          {
                            weekday: "long",
                          }
                        )}
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {dia.getDate()}
                      </p>

                    </div>
                  );
                })}

              </div>

              {/* HORAS */}

              {HORAS.map((hora) => (

                <div
                  key={hora}
                  className="grid grid-cols-[80px_repeat(5,1fr)]"
                >

                  <div className="flex min-h-[115px] items-start justify-center border-b border-slate-100 bg-[#F9FBFC] px-2 pt-5">

                    <span className="text-xs font-bold text-slate-400">
                      {hora}
                    </span>

                  </div>

                  {dias.map((dia) => {

                    const citas = citasDe(dia, hora);

                    return (
                      <div
                        key={`${fechaLocal(dia)}-${hora}`}
                        className="min-h-[115px] border-b border-l border-slate-100 bg-white p-2"
                      >

                        {citas.length === 0 ? (

                          <div className="flex h-full items-center justify-center opacity-0 transition hover:opacity-100">
                            <span className="text-[10px] text-slate-300">
                              Disponible
                            </span>
                          </div>

                        ) : (

                          <div className="space-y-2">

                            {citas.map((cita) => (

                              <button
                                key={cita.id}
                                onClick={() =>
                                  setCitaSeleccionada(cita)
                                }
                                className={`w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                                  cita.estado ===
                                  "confirmada"
                                    ? "border-green-200 bg-green-50"
                                    : cita.estado ===
                                      "cancelada"
                                    ? "border-red-200 bg-red-50"
                                    : "border-amber-200 bg-amber-50"
                                }`}
                              >

                                <div className="flex items-center justify-between gap-2">

                                  <p className="truncate text-xs font-bold">
                                    {cita.nombre}
                                  </p>

                                  <span
                                    className={`h-2 w-2 shrink-0 rounded-full ${
                                      cita.estado ===
                                      "confirmada"
                                        ? "bg-green-500"
                                        : cita.estado ===
                                          "cancelada"
                                        ? "bg-red-500"
                                        : "bg-amber-500"
                                    }`}
                                  />

                                </div>

                                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                                  {cita.motivo ||
                                    "Sin motivo indicado"}
                                </p>

                              </button>

                            ))}

                          </div>

                        )}

                      </div>
                    );
                  })}

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* LEYENDA */}

        <section className="mt-5 flex flex-wrap items-center gap-5 px-2">

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            Confirmada
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Pendiente
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Cancelada
          </div>

        </section>

      </div>

      {/* MODAL */}

      {citaSeleccionada && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A3653]/40 p-4 backdrop-blur-sm"
          onClick={() =>
            setCitaSeleccionada(null)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B1263A]">
                  Detalle de cita
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {citaSeleccionada.nombre}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {citaSeleccionada.fecha} ·{" "}
                  {citaSeleccionada.hora}
                </p>

              </div>

              <button
                onClick={() =>
                  setCitaSeleccionada(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg"
              >
                ×
              </button>

            </div>

            <div className="mt-7 space-y-3">

              <div className="rounded-2xl bg-[#F4F7F9] p-4">

                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Estado
                </p>

                <p className="mt-1 font-semibold capitalize">
                  {citaSeleccionada.estado}
                </p>

              </div>

              <div className="rounded-2xl bg-[#F4F7F9] p-4">

                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Teléfono
                </p>

                <a
                  href={`tel:${citaSeleccionada.telefono}`}
                  className="mt-1 block font-semibold hover:text-[#B1263A]"
                >
                  {citaSeleccionada.telefono}
                </a>

              </div>

              <div className="rounded-2xl bg-[#F4F7F9] p-4">

                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Email
                </p>

                <a
                  href={`mailto:${citaSeleccionada.email}`}
                  className="mt-1 block break-all font-semibold hover:text-[#B1263A]"
                >
                  {citaSeleccionada.email}
                </a>

              </div>

              <div className="rounded-2xl bg-[#F4F7F9] p-4">

                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Motivo de consulta
                </p>

                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {citaSeleccionada.motivo ||
                    "No indicado"}
                </p>

              </div>

            </div>

            {citaSeleccionada.estado ===
              "pendiente" && (

              <div className="mt-7 flex gap-3">

                <button
                  disabled={
                    actualizando ===
                    citaSeleccionada.id
                  }
                  onClick={() =>
                    cambiarEstado(
                      citaSeleccionada,
                      "confirmada"
                    )
                  }
                  className="flex-1 rounded-xl bg-[#0A3653] px-4 py-3 font-bold text-white disabled:opacity-50"
                >
                  ✓ Confirmar
                </button>

                <button
                  disabled={
                    actualizando ===
                    citaSeleccionada.id
                  }
                  onClick={() =>
                    cambiarEstado(
                      citaSeleccionada,
                      "cancelada"
                    )
                  }
                  className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-3 font-bold text-red-600 disabled:opacity-50"
                >
                  Cancelar
                </button>

              </div>

            )}

          </div>

        </div>

      )}

    </main>
  );
}