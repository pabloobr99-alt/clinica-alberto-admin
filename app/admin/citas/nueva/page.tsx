"use client";

import Link from "next/link";
import { Suspense, FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Paciente = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
};

type Horario = {
  hora: string;
  disponible: boolean;
};

function hoy() {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function NuevaCitaContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pacienteInicial =
    searchParams.get("pacienteId") || "";

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] =
    useState(pacienteInicial);

  const [fecha, setFecha] = useState(hoy());
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");

  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargandoHorarios, setCargandoHorarios] =
    useState(false);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarPacientes();
  }, []);

  useEffect(() => {
    if (fecha) {
      cargarHorarios(fecha);
    }
  }, [fecha]);

  async function cargarPacientes() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("pacientes")
      .select("id,nombre,telefono,email")
      .order("nombre", { ascending: true });

    if (error) {
      console.error(error);
      setError("No se han podido cargar los pacientes.");
      return;
    }

    setPacientes((data || []) as Paciente[]);
  }

  async function cargarHorarios(fechaElegida: string) {
    setCargandoHorarios(true);
    setHora("");

    try {
      const response = await fetch(
        `/api/disponibilidad?fecha=${encodeURIComponent(
          fechaElegida
        )}`
      );

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error ||
            "No se ha podido consultar la disponibilidad."
        );
      }

      const lista: Horario[] = [];

      if (Array.isArray(resultado.horarios)) {
        for (const item of resultado.horarios) {
          if (typeof item === "string") {
            lista.push({
              hora: item,
              disponible: true,
            });
          } else if (item && typeof item === "object") {
            lista.push({
              hora: String(item.hora || ""),
              disponible:
                item.disponible !== false &&
                item.ocupada !== true,
            });
          }
        }
      }

      setHorarios(lista.filter((item) => item.hora));
    } catch (err) {
      console.error(err);
      setHorarios([]);
      setError(
        err instanceof Error
          ? err.message
          : "No se han podido consultar los horarios."
      );
    } finally {
      setCargandoHorarios(false);
    }
  }

  async function crearCita(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!pacienteId || !fecha || !hora || !motivo.trim()) {
      setError("Completa todos los campos.");
      return;
    }

    setGuardando(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/admin/citas/crear",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            pacienteId: Number(pacienteId),
            fecha,
            hora,
            motivo: motivo.trim(),
          }),
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error ||
            "No se ha podido crear la cita."
        );
      }

      if (pacienteInicial) {
        router.push(
          `/admin/pacientes/${pacienteInicial}`
        );
      } else {
        router.push("/admin");
      }

      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido crear la cita."
      );
    } finally {
      setGuardando(false);
    }
  }

  const pacienteSeleccionado = pacientes.find(
    (p) => String(p.id) === pacienteId
  );

  return (
    <main className="min-h-screen bg-[#F4F7F9] px-4 py-8 text-[#0A3653] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={
            pacienteInicial
              ? `/admin/pacientes/${pacienteInicial}`
              : "/admin"
          }
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#0A3653]"
        >
          ← Volver
        </Link>

        <div className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="bg-[#0A3653] px-6 py-7 text-white sm:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
              Agenda
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Nueva cita
            </h1>

            <p className="mt-2 text-sm text-white/65">
              Crea una cita manualmente y sincronízala con
              Google Calendar.
            </p>
          </div>

          <form
            onSubmit={crearCita}
            className="space-y-7 p-6 sm:p-8"
          >
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Paciente
              </label>

              <select
                value={pacienteId}
                onChange={(e) =>
                  setPacienteId(e.target.value)
                }
                required
                disabled={Boolean(pacienteInicial)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0A3653] disabled:bg-slate-50"
              >
                <option value="">
                  Selecciona un paciente
                </option>

                {pacientes.map((paciente) => (
                  <option
                    key={paciente.id}
                    value={paciente.id}
                  >
                    {paciente.nombre}
                  </option>
                ))}
              </select>

              {pacienteSeleccionado && (
                <div className="mt-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                  <strong className="text-[#0A3653]">
                    {pacienteSeleccionado.nombre}
                  </strong>
                  <br />
                  {pacienteSeleccionado.telefono ||
                    "Sin teléfono"}
                  {" · "}
                  {pacienteSeleccionado.email ||
                    "Sin email"}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Fecha
              </label>

              <input
                type="date"
                min={hoy()}
                required
                value={fecha}
                onChange={(e) =>
                  setFecha(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0A3653]"
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hora
                </label>

                {cargandoHorarios && (
                  <span className="text-xs text-slate-400">
                    Consultando agenda...
                  </span>
                )}
              </div>

              {!cargandoHorarios &&
              horarios.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No hay horarios disponibles para esta
                  fecha.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {horarios.map((item) => (
                    <button
                      key={item.hora}
                      type="button"
                      disabled={!item.disponible}
                      onClick={() =>
                        setHora(item.hora)
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                        hora === item.hora
                          ? "border-[#0A3653] bg-[#0A3653] text-white"
                          : item.disponible
                          ? "border-slate-200 bg-white text-[#0A3653] hover:border-[#0A3653]"
                          : "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                      }`}
                    >
                      {item.hora}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Motivo de la consulta
              </label>

              <textarea
                required
                rows={4}
                value={motivo}
                onChange={(e) =>
                  setMotivo(e.target.value)
                }
                placeholder="Motivo de la consulta..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#0A3653]"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                href={
                  pacienteInicial
                    ? `/admin/pacientes/${pacienteInicial}`
                    : "/admin"
                }
                className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-500"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={guardando || !hora}
                style={{
                  color: "#ffffff",
                  WebkitTextFillColor: "#ffffff",
                }}
                className="rounded-xl bg-[#B1263A] px-6 py-3 text-sm font-bold shadow-sm transition hover:bg-[#982033] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando
                  ? "Creando cita..."
                  : "Crear cita confirmada"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}


export default function NuevaCitaAdminPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#0A3653]" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Cargando nueva cita...
            </p>
          </div>
        </main>
      }
    >
      <NuevaCitaContenido />
    </Suspense>
  );
}
