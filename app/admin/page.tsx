"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

type Filtro = "todas" | Estado;

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function formatearFecha(fecha: string) {
  if (!fecha) return "";

  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sumarDias(fecha: string, dias: number) {
  const date = new Date(`${fecha}T12:00:00`);
  date.setDate(date.getDate() + dias);
  return date.toISOString().slice(0, 10);
}

function convertirFechaHora(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora}:00`);
}

export default function Admin() {
  const router = useRouter();
  const pathname = usePathname();

  const [comprobandoAcceso, setComprobandoAcceso] = useState(true);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [fechaSeleccionada, setFechaSeleccionada] =
    useState<string>(fechaHoy());

  const [citaSeleccionada, setCitaSeleccionada] =
    useState<Cita | null>(null);

  useEffect(() => {
    async function comprobarUsuario() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setComprobandoAcceso(false);
      cargarCitas();
    }

    comprobarUsuario();
  }, [router]);

  async function cargarCitas() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("citas")
      .select("id,nombre,telefono,email,fecha,hora,motivo,estado")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (error) {
      console.error(error);
      setError("No se han podido cargar las citas.");
      setCitas([]);
    } else {
      setCitas((data || []) as Cita[]);
    }

    setCargando(false);
  }

  async function cambiarEstado(
    id: number,
    nuevoEstado: Estado
  ) {
    setActualizando(true);
    setError("");

    const { error } = await supabase
      .from("citas")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (error) {
      console.error(error);
      setError("No se ha podido actualizar la cita.");
      setActualizando(false);
      return;
    }

    setCitas((prev) =>
      prev.map((cita) =>
        cita.id === id
          ? { ...cita, estado: nuevoEstado }
          : cita
      )
    );

    setCitaSeleccionada(null);
    setActualizando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const citasPendientes = useMemo(
    () => citas.filter((cita) => cita.estado === "pendiente"),
    [citas]
  );

  const citasConfirmadas = useMemo(
    () => citas.filter((cita) => cita.estado === "confirmada"),
    [citas]
  );

  const citasCanceladas = useMemo(
    () => citas.filter((cita) => cita.estado === "cancelada"),
    [citas]
  );

  const citasDeHoy = useMemo(
    () =>
      citas.filter(
        (cita) =>
          cita.fecha === fechaHoy() &&
          cita.estado !== "cancelada"
      ),
    [citas]
  );

  const citasDelDia = useMemo(() => {
    return citas
      .filter((cita) => {
        if (cita.fecha !== fechaSeleccionada) {
          return false;
        }

        if (filtro === "todas") {
          return true;
        }

        return cita.estado === filtro;
      })
      .sort((a, b) =>
        a.hora.localeCompare(b.hora)
      );
  }, [citas, fechaSeleccionada, filtro]);

  const proximaCita = useMemo(() => {
    const ahora = new Date();

    return (
      citas
        .filter(
          (cita) =>
            cita.estado !== "cancelada" &&
            convertirFechaHora(
              cita.fecha,
              cita.hora
            ) >= ahora
        )
        .sort(
          (a, b) =>
            convertirFechaHora(
              a.fecha,
              a.hora
            ).getTime() -
            convertirFechaHora(
              b.fecha,
              b.hora
            ).getTime()
        )[0] || null
    );
  }, [citas]);

  if (comprobandoAcceso) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0A3653]" />
          <p className="text-sm text-slate-500">
            Comprobando acceso...
          </p>
        </div>
      </main>
    );
  }

  const dashboardActivo = pathname === "/admin";
  const agendaActiva = pathname === "/agenda";
  const solicitudesActivas =
    pathname === "/admin/solicitudes";
  const pacientesActivos =
    pathname.startsWith("/admin/pacientes");

  return (
    <main className="min-h-screen bg-slate-50">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        {/* LOGO */}
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#B1263A]">
            Clínica
          </div>

          <div className="text-lg font-semibold leading-tight text-[#0A3653]">
            Alberto
            <br />
            Matamoros
          </div>

          <div className="mt-2 text-xs text-slate-400">
            Panel de administración
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Administración
          </p>

          <button
            onClick={() => router.push("/admin")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              dashboardActivo
                ? "bg-[#0A3653] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0A3653]"
            }`}
          >
            <span className="text-lg">▦</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => router.push("/agenda")}
            className={`mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              agendaActiva
                ? "bg-[#0A3653] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0A3653]"
            }`}
          >
            <span className="text-lg">◷</span>
            <span>Agenda</span>
          </button>

          <button
            onClick={() =>
              router.push("/admin/solicitudes")
            }
            className={`mt-2 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
              solicitudesActivas
                ? "bg-[#0A3653] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0A3653]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">◉</span>
              <span>Solicitudes</span>
            </div>

            {citasPendientes.length > 0 && (
              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${
                  solicitudesActivas
                    ? "bg-white text-[#0A3653]"
                    : "bg-[#B1263A] text-white"
                }`}
              >
                {citasPendientes.length}
              </span>
            )}
          </button>

          <button
            onClick={() =>
              router.push("/admin/pacientes")
            }
            className={`mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              pacientesActivos
                ? "bg-[#0A3653] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0A3653]"
            }`}
          >
            <span className="text-lg">♙</span>
            <span>Pacientes</span>
          </button>

          <div className="my-6 border-t border-slate-100" />

          <button
            onClick={() => router.push("/")}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#0A3653]"
          >
            <span className="text-lg">↗</span>
            <span>Ver página web</span>
          </button>

          <button
            onClick={cerrarSesion}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-[#B1263A]"
          >
            <span className="text-lg">↪</span>
            <span>Cerrar sesión</span>
          </button>
        </nav>

        {/* PARTE INFERIOR */}
        <div className="border-t border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A3653] text-sm font-semibold text-white">
              AM
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                Alberto Matamoros
              </p>

              <p className="text-xs text-slate-400">
                Administrador
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <section className="lg:pl-64">
        {/* HEADER */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B1263A]">
                Panel privado
              </p>

              <h1 className="mt-1 text-xl font-semibold text-[#0A3653] sm:text-2xl">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* MENÚ MÓVIL */}
              <details className="relative lg:hidden">
                <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-[#0A3653] shadow-sm">
                  ☰
                </summary>

                <div className="absolute right-0 top-14 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    onClick={() => router.push("/admin")}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ▦
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => router.push("/agenda")}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ◷
                    <span>Agenda</span>
                  </button>

                  <button
                    onClick={() =>
                      router.push("/admin/solicitudes")
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ◉
                    <span>Solicitudes</span>

                    {citasPendientes.length > 0 && (
                      <span className="ml-auto rounded-full bg-[#B1263A] px-2 py-1 text-xs font-bold text-white">
                        {citasPendientes.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      router.push("/admin/pacientes")
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ♙
                    <span>Pacientes</span>
                  </button>

                  <div className="my-2 border-t border-slate-100" />

                  <button
                    onClick={() => router.push("/")}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    ↗
                    <span>Ver página web</span>
                  </button>

                  <button
                    onClick={cerrarSesion}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-[#B1263A]"
                  >
                    ↪
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </details>

              {/* ACTUALIZAR */}
              <button
                onClick={cargarCitas}
                disabled={cargando}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#0A3653] hover:text-[#0A3653] disabled:opacity-50 sm:px-4"
              >
                {cargando ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* TARJETAS */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* PENDIENTES */}
            <button
              onClick={() => {
                setFiltro("pendiente");
                setFechaSeleccionada(fechaHoy());
              }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#B1263A]/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Solicitudes pendientes
                  </p>

                  <p className="mt-2 text-3xl font-semibold text-[#0A3653]">
                    {citasPendientes.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#B1263A]">
                  ◉
                </div>
              </div>
            </button>

            {/* CONFIRMADAS */}
            <button
              onClick={() => {
                setFiltro("confirmada");
                setFechaSeleccionada(fechaHoy());
              }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A3653]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Citas confirmadas
                  </p>

                  <p className="mt-2 text-3xl font-semibold text-[#0A3653]">
                    {citasConfirmadas.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0A3653]">
                  ✓
                </div>
              </div>
            </button>

            {/* HOY */}
            <button
              onClick={() => {
                setFiltro("todas");
                setFechaSeleccionada(fechaHoy());
              }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A3653]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Citas de hoy
                  </p>

                  <p className="mt-2 text-3xl font-semibold text-[#0A3653]">
                    {citasDeHoy.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#0A3653]">
                  ◷
                </div>
              </div>
            </button>

            {/* CANCELADAS */}
            <button
              onClick={() => {
                setFiltro("cancelada");
                setFechaSeleccionada(fechaHoy());
              }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Citas canceladas
                  </p>

                  <p className="mt-2 text-3xl font-semibold text-[#0A3653]">
                    {citasCanceladas.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  ×
                </div>
              </div>
            </button>
          </div>

          {/* PRÓXIMA CITA */}
          {proximaCita && (
            <div className="mt-8 overflow-hidden rounded-2xl bg-[#0A3653] text-white shadow-lg">
              <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Próxima cita
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    {proximaCita.nombre}
                  </h2>

                  <p className="mt-1 text-sm text-white/70">
                    {formatearFecha(proximaCita.fecha)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-white/10 px-5 py-3 text-center">
                    <p className="text-2xl font-semibold">
                      {proximaCita.hora}
                    </p>

                    <p className="text-xs text-white/60">
                      hora
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setCitaSeleccionada(proximaCita)
                    }
                    className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0A3653] transition hover:bg-slate-100"
                  >
                    Ver cita
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AGENDA DEL DÍA */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B1263A]">
                    Agenda
                  </p>

                  <h2 className="mt-1 text-xl font-semibold capitalize text-[#0A3653]">
                    {formatearFecha(fechaSeleccionada)}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      setFechaSeleccionada(
                        sumarDias(fechaSeleccionada, -1)
                      )
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-[#0A3653] hover:text-[#0A3653]"
                  >
                    ←
                  </button>

                  <button
                    onClick={() =>
                      setFechaSeleccionada(fechaHoy())
                    }
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#0A3653] hover:text-[#0A3653]"
                  >
                    Hoy
                  </button>

                  <button
                    onClick={() =>
                      setFechaSeleccionada(
                        sumarDias(fechaSeleccionada, 1)
                      )
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-[#0A3653] hover:text-[#0A3653]"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* FILTROS */}
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  ["todas", "Todas"],
                  ["pendiente", "Pendientes"],
                  ["confirmada", "Confirmadas"],
                  ["cancelada", "Canceladas"],
                ].map(([valor, nombre]) => (
                  <button
                    key={valor}
                    onClick={() =>
                      setFiltro(valor as Filtro)
                    }
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      filtro === valor
                        ? "bg-[#0A3653] text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* CITAS */}
            <div className="divide-y divide-slate-100">
              {cargando ? (
                <div className="p-10 text-center text-sm text-slate-400">
                  Cargando citas...
                </div>
              ) : citasDelDia.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                    ◷
                  </div>

                  <p className="mt-4 font-medium text-slate-600">
                    No hay citas para este día
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Prueba con otra fecha o cambia el filtro.
                  </p>
                </div>
              ) : (
                citasDelDia.map((cita) => (
                  <button
                    key={cita.id}
                    onClick={() =>
                      setCitaSeleccionada(cita)
                    }
                    className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 text-center">
                        <p className="text-lg font-semibold text-[#0A3653]">
                          {cita.hora}
                        </p>
                      </div>

                      <div className="h-10 w-px bg-slate-200" />

                      <div>
                        <p className="font-semibold text-slate-800">
                          {cita.nombre}
                        </p>

                        <p className="mt-1 line-clamp-1 max-w-xl text-sm text-slate-500">
                          {cita.motivo}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        cita.estado === "pendiente"
                          ? "bg-amber-50 text-amber-700"
                          : cita.estado === "confirmada"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {cita.estado === "pendiente"
                        ? "Pendiente"
                        : cita.estado === "confirmada"
                        ? "Confirmada"
                        : "Cancelada"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MODAL CITA */}
      {citaSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setCitaSeleccionada(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* CABECERA */}
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B1263A]">
                    Detalle de cita
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-[#0A3653]">
                    {citaSeleccionada.nombre}
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setCitaSeleccionada(null)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
            </div>

            {/* INFORMACIÓN */}
            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Fecha
                  </p>

                  <p className="mt-1 text-sm font-semibold capitalize text-slate-700">
                    {formatearFecha(
                      citaSeleccionada.fecha
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Hora
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {citaSeleccionada.hora}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Motivo de consulta
                </p>

                <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {citaSeleccionada.motivo}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Teléfono
                  </p>

                  <p className="mt-2 text-sm text-slate-700">
                    {citaSeleccionada.telefono ||
                      "No indicado"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Email
                  </p>

                  <p className="mt-2 break-all text-sm text-slate-700">
                    {citaSeleccionada.email ||
                      "No indicado"}
                  </p>
                </div>
              </div>

              {/* ESTADO */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Estado
                </p>

                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      citaSeleccionada.estado ===
                      "pendiente"
                        ? "bg-amber-50 text-amber-700"
                        : citaSeleccionada.estado ===
                          "confirmada"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {citaSeleccionada.estado ===
                    "pendiente"
                      ? "Pendiente"
                      : citaSeleccionada.estado ===
                        "confirmada"
                      ? "Confirmada"
                      : "Cancelada"}
                  </span>
                </div>
              </div>
            </div>

            {/* ACCIONES */}
            {citaSeleccionada.estado !==
              "cancelada" && (
              <div className="flex flex-col gap-3 border-t border-slate-100 p-6 sm:flex-row">
                {citaSeleccionada.estado ===
                  "pendiente" && (
                  <button
                    disabled={actualizando}
                    onClick={() =>
                      cambiarEstado(
                        citaSeleccionada.id,
                        "confirmada"
                      )
                    }
                    className="flex-1 rounded-xl bg-[#0A3653] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#082d46] disabled:opacity-50"
                  >
                    {actualizando
                      ? "Actualizando..."
                      : "Confirmar cita"}
                  </button>
                )}

                <button
                  disabled={actualizando}
                  onClick={() =>
                    cambiarEstado(
                      citaSeleccionada.id,
                      "cancelada"
                    )
                  }
                  className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-[#B1263A] transition hover:bg-red-50 disabled:opacity-50"
                >
                  Cancelar cita
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}