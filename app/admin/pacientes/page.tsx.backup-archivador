"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
};

export default function PacientesPage() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    comprobarAcceso();
  }, []);

  async function comprobarAcceso() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.replace("/login");
      return;
    }

    cargarDatos();
  }

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const [
      { data: pacientesData, error: pacientesError },
      { data: historialData, error: historialError },
    ] = await Promise.all([
      supabase
        .from("pacientes")
        .select(
          "id,nombre,telefono,email,notas_generales,created_at"
        )
        .order("nombre", { ascending: true }),

      supabase
        .from("historial_pacientes")
        .select(
          "id,paciente_id,fecha,motivo,tratamiento,observaciones,proxima_revision"
        )
        .order("fecha", { ascending: false }),
    ]);

    if (pacientesError) {
      console.error(pacientesError);
      setError(
        "No se han podido cargar los pacientes."
      );
      setCargando(false);
      return;
    }

    if (historialError) {
      console.error(historialError);
      setError(
        "Los pacientes se han cargado, pero no se ha podido cargar su historial."
      );
    }

    setPacientes((pacientesData || []) as Paciente[]);
    setHistorial((historialData || []) as Historial[]);
    setCargando(false);
  }

  const pacientesFiltrados = pacientes.filter(
    (paciente) => {
      const texto = busqueda.toLowerCase().trim();

      if (!texto) return true;

      return (
        paciente.nombre
          .toLowerCase()
          .includes(texto) ||
        paciente.telefono
          ?.toLowerCase()
          .includes(texto) ||
        paciente.email
          ?.toLowerCase()
          .includes(texto)
      );
    }
  );

  function numeroSesiones(pacienteId: number) {
    return historial.filter(
      (sesion) => sesion.paciente_id === pacienteId
    ).length;
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0A3653]" />

          <p className="text-sm text-slate-500">
            Cargando pacientes...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => router.push("/admin")}
                className="mb-4 text-sm font-medium text-slate-400 transition hover:text-[#0A3653]"
              >
                ← Volver al dashboard
              </button>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B1263A]">
                Administración
              </p>

              <h1 className="mt-1 text-3xl font-semibold text-[#0A3653]">
                Pacientes
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Gestiona los pacientes y consulta su historial.
              </p>
            </div>

            <button
              onClick={cargarDatos}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#0A3653] hover:text-[#0A3653]"
            >
              Actualizar
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* BUSCADOR */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>

            <input
              type="text"
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              placeholder="Buscar por nombre, teléfono o email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0A3653] focus:bg-white"
            />
          </div>
        </div>

        {/* CABECERA LISTADO */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">
              {pacientesFiltrados.length} pacientes
            </p>
          </div>
        </div>

        {/* LISTADO */}
        {pacientesFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400">
              ♙
            </div>

            <h2 className="mt-5 text-lg font-semibold text-[#0A3653]">
              No hay pacientes
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {busqueda
                ? "No hemos encontrado ningún paciente con esa búsqueda."
                : "Todavía no hay pacientes registrados."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pacientesFiltrados.map((paciente) => (
              <button
                key={paciente.id}
                onClick={() =>
                  router.push(
                    `/admin/pacientes/${paciente.id}`
                  )
                }
                className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#0A3653]/20 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0A3653] text-sm font-semibold text-white">
                      {paciente.nombre
                        .split(" ")
                        .slice(0, 2)
                        .map((nombre) =>
                          nombre.charAt(0).toUpperCase()
                        )
                        .join("")}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-slate-800 group-hover:text-[#0A3653]">
                        {paciente.nombre}
                      </h2>

                      <p className="mt-1 text-xs text-slate-400">
                        Paciente #{paciente.id}
                      </p>
                    </div>
                  </div>

                  <span className="text-slate-300 transition group-hover:text-[#0A3653]">
                    →
                  </span>
                </div>

                <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
                  {paciente.telefono && (
                    <p className="text-sm text-slate-500">
                      <span className="mr-2 text-slate-400">
                        ☎
                      </span>
                      {paciente.telefono}
                    </p>
                  )}

                  {paciente.email && (
                    <p className="truncate text-sm text-slate-500">
                      <span className="mr-2 text-slate-400">
                        @
                      </span>
                      {paciente.email}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-xs font-medium text-slate-400">
                    Sesiones registradas
                  </span>

                  <span className="text-sm font-semibold text-[#0A3653]">
                    {numeroSesiones(paciente.id)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}