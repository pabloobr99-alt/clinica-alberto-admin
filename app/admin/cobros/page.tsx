"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Estado =
  | "sin_cobros"
  | "pendiente"
  | "parcial"
  | "pagado";

type Paciente = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  total: number;
  pagado: number;
  pendiente: number;
  estado: Estado;
};

type Resumen = {
  totalFacturado: number;
  totalCobrado: number;
  totalPendiente: number;
  pacientesPendientes: number;
};

type Filtro =
  | "todos"
  | "pendiente"
  | "parcial"
  | "pagado"
  | "sin_cobros";

function euros(valor: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(valor || 0);
}

export default function CobrosPage() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [resumen, setResumen] = useState<Resumen>({
    totalFacturado: 0,
    totalCobrado: 0,
    totalPendiente: 0,
    pacientesPendientes: 0,
  });

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/admin/pacientes?economia=general",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error ||
            "No se han podido cargar los cobros."
        );
      }

      setPacientes(resultado.pacientes || []);
      setResumen(
        resultado.resumen || {
          totalFacturado: 0,
          totalCobrado: 0,
          totalPendiente: 0,
          pacientesPendientes: 0,
        }
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se han podido cargar los cobros."
      );
    } finally {
      setCargando(false);
    }
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const prioridad: Record<Estado, number> = {
      pendiente: 0,
      parcial: 1,
      pagado: 2,
      sin_cobros: 3,
    };

    return pacientes
      .filter((paciente) => {
        if (
          filtro !== "todos" &&
          paciente.estado !== filtro
        ) {
          return false;
        }

        if (!texto) return true;

        return (
          paciente.nombre.toLowerCase().includes(texto) ||
          (paciente.telefono || "")
            .toLowerCase()
            .includes(texto) ||
          (paciente.email || "")
            .toLowerCase()
            .includes(texto)
        );
      })
      .sort(
        (a, b) =>
          prioridad[a.estado] - prioridad[b.estado] ||
          b.pendiente - a.pendiente
      );
  }, [pacientes, filtro, busqueda]);

  function estilo(estado: Estado) {
    switch (estado) {
      case "pendiente":
        return {
          card: "border-red-200 bg-red-50/70",
          badge: "bg-red-100 text-red-700",
          dot: "bg-red-500",
          texto: "Pendiente",
        };

      case "parcial":
        return {
          card: "border-amber-200 bg-amber-50/70",
          badge: "bg-amber-100 text-amber-700",
          dot: "bg-amber-500",
          texto: "Pago parcial",
        };

      case "pagado":
        return {
          card: "border-emerald-200 bg-emerald-50/70",
          badge: "bg-emerald-100 text-emerald-700",
          dot: "bg-emerald-500",
          texto: "Pagado",
        };

      default:
        return {
          card: "border-slate-200 bg-white",
          badge: "bg-slate-100 text-slate-500",
          dot: "bg-slate-300",
          texto: "Sin cobros",
        };
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-[#0A3653]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <Link
              href="/admin"
              className="text-xs font-bold text-slate-400 hover:text-[#0A3653]"
            >
              ← Panel de administración
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              Cobros
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Control económico de pacientes
            </p>
          </div>

          <button
            type="button"
            onClick={cargar}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold"
          >
            ↻ Actualizar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-[#0A3653] p-5 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">
              Total registrado
            </p>
            <p className="mt-3 text-3xl font-bold">
              {euros(resumen.totalFacturado)}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Cobrado
            </p>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {euros(resumen.totalCobrado)}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-red-500">
              Pendiente
            </p>
            <p className="mt-3 text-3xl font-bold text-red-700">
              {euros(resumen.totalPendiente)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Pacientes con deuda
            </p>
            <p className="mt-3 text-3xl font-bold text-amber-700">
              {resumen.pacientesPendientes}
            </p>
          </div>
        </section>

        <section className="mt-7 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0A3653] lg:max-w-sm"
            />

            <div className="flex flex-wrap gap-2">
              {[
                ["todos", "Todos"],
                ["pendiente", "🔴 Pendientes"],
                ["parcial", "🟠 Parciales"],
                ["pagado", "🟢 Pagados"],
                ["sin_cobros", "Sin cobros"],
              ].map(([valor, nombre]) => (
                <button
                  type="button"
                  key={valor}
                  onClick={() =>
                    setFiltro(valor as Filtro)
                  }
                  className={`rounded-xl px-4 py-2 text-xs font-bold ${
                    filtro === valor
                      ? "bg-[#0A3653] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {nombre}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <section className="mt-7">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B1263A]">
                Pacientes
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Cuadrante de cobros
              </h2>
            </div>

            <p className="text-sm font-semibold text-slate-400">
              {filtrados.length} pacientes
            </p>
          </div>

          {cargando ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#0A3653]" />
              <p className="mt-4 text-sm text-slate-400">
                Cargando cobros...
              </p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
              <p className="font-bold">
                No hay pacientes en este apartado.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtrados.map((paciente) => {
                const colores = estilo(paciente.estado);

                return (
                  <Link
                    key={paciente.id}
                    href={`/admin/pacientes/${paciente.id}`}
                    className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${colores.card}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-bold shadow-sm">
                          {paciente.nombre
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold">
                            {paciente.nombre}
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-400">
                            {paciente.telefono ||
                              paciente.email ||
                              "Sin contacto"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${colores.badge}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${colores.dot}`}
                        />
                        {colores.texto}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-black/5 pt-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Total
                        </p>
                        <p className="mt-1 font-bold">
                          {euros(paciente.total)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Pagado
                        </p>
                        <p className="mt-1 font-bold text-emerald-600">
                          {euros(paciente.pagado)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Falta
                        </p>
                        <p
                          className={`mt-1 font-bold ${
                            paciente.pendiente > 0
                              ? "text-red-600"
                              : "text-slate-400"
                          }`}
                        >
                          {euros(paciente.pendiente)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
