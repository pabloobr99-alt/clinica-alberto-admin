"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Paciente = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
};

type Cita = {
  id: number;
  fecha: string;
  hora: string;
  motivo: string | null;
  estado: string | null;
};

type Bono = {
  id: number;
  nombre: string;
  sesiones_totales: number;
  sesiones_usadas: number;
  precio: number;
  fecha_compra: string;
  estado: string;
};

type Cobro = {
  id: number;
  concepto: string;
  importe: number;
  importe_pagado: number;
  estado: string;
  metodo_pago: string | null;
  fecha: string;
  fecha_pago: string | null;
};

export default function AreaPacientePage() {
  const router = useRouter();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/paciente/login");
      return;
    }

    try {
      const response = await fetch("/api/paciente", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const resultado = await response.json();

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/paciente/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          resultado.error || "No se ha podido cargar tu área."
        );
      }

      setPaciente(resultado.paciente);
      setCitas(resultado.citas || []);
      setBonos(resultado.bonos || []);
      setCobros(resultado.cobros || []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se ha podido cargar tu área."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  const ahora = new Date();

  const proximas = citas
    .filter((cita) => cita.estado !== "cancelada")
    .filter(
      (cita) =>
        new Date(`${cita.fecha}T${cita.hora}`) >= ahora
    )
    .sort(
      (a, b) =>
        new Date(`${a.fecha}T${a.hora}`).getTime() -
        new Date(`${b.fecha}T${b.hora}`).getTime()
    );

  const bonoActivo = bonos.find(
    (bono) => bono.estado === "activo"
  );

  const pendiente = cobros
    .filter(
      (cobro) =>
        cobro.estado !== "pagado" &&
        cobro.estado !== "cancelado"
    )
    .reduce(
      (total, cobro) =>
        total +
        Math.max(
          0,
          Number(cobro.importe) -
            Number(cobro.importe_pagado)
        ),
      0
    );

  function fechaBonita(fecha: string) {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString(
      "es-ES",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6f7]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0b3b58]" />
          <p className="mt-4 text-sm font-semibold text-[#0b3b58]">
            Cargando tu espacio...
          </p>
        </div>
      </main>
    );
  }

  if (error || !paciente) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6f7] px-5">
        <div className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#b92d43]">
            Área paciente
          </span>

          <h1 className="mt-3 text-2xl font-bold text-[#0b3b58]">
            No hemos podido abrir tu área
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <Link
            href="/acceso"
            className="mt-6 inline-block text-sm font-bold text-[#0b3b58]"
          >
            ← Volver al acceso
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6f7] text-[#0b3b58]">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/">
            <span className="block text-[9px] font-bold uppercase tracking-[0.25em] text-[#b92d43]">
              Centro de Osteopatía
            </span>
            <span className="mt-1 block text-sm font-bold">
              Alberto Matamoros
            </span>
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold transition hover:border-[#0b3b58]"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#b92d43]">
              Mi espacio
            </span>

            <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Hola, {paciente.nombre.split(" ")[0]}.
            </h1>

            <p className="mt-3 text-slate-500">
              Tus citas, bonos y pagos en un único lugar.
            </p>
          </div>

          <Link
            href="/reservar"
            style={{ color: "#ffffff" }}
            className="rounded-xl bg-[#0b3b58] px-6 py-3.5 text-center text-sm font-bold shadow-sm transition hover:-translate-y-0.5"
          >
            + Reservar nueva cita
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] bg-white p-6 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Próxima cita
            </span>

            {proximas[0] ? (
              <>
                <p className="mt-4 text-2xl font-bold">
                  {fechaBonita(proximas[0].fecha)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  A las {proximas[0].hora.slice(0, 5)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-xl font-bold">
                  Sin próxima cita
                </p>
                <Link
                  href="/reservar"
                  className="mt-2 inline-block text-xs font-bold text-[#b92d43]"
                >
                  Reservar ahora →
                </Link>
              </>
            )}
          </article>

          <article className="rounded-[24px] bg-white p-6 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Bono activo
            </span>

            {bonoActivo ? (
              <>
                <p className="mt-4 text-3xl font-bold">
                  {Math.max(
                    0,
                    bonoActivo.sesiones_totales -
                      bonoActivo.sesiones_usadas
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  sesiones restantes de{" "}
                  {bonoActivo.sesiones_totales}
                </p>
              </>
            ) : (
              <p className="mt-4 text-xl font-bold">
                Sin bono activo
              </p>
            )}
          </article>

          <article className="rounded-[24px] bg-white p-6 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Pendiente
            </span>

            <p className="mt-4 text-3xl font-bold">
              {pendiente.toFixed(2)} €
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Importe pendiente de pago
            </p>
          </article>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b92d43]">
                  Agenda
                </span>
                <h2 className="mt-1 text-xl font-bold">
                  Mis citas
                </h2>
              </div>

              <span className="rounded-full bg-[#f4f6f7] px-3 py-1 text-xs font-bold">
                {citas.length}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {citas.length === 0 ? (
                <div className="rounded-2xl bg-[#f4f6f7] p-5">
                  <p className="text-sm text-slate-500">
                    Todavía no tienes citas registradas.
                  </p>
                </div>
              ) : (
                citas.slice(0, 8).map((cita) => (
                  <div
                    key={cita.id}
                    className="rounded-2xl bg-[#f4f6f7] p-4"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-bold">
                          {fechaBonita(cita.fecha)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {cita.motivo || "Consulta"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold">
                          {cita.hora.slice(0, 5)}
                        </p>
                        <span
                          className={`text-[9px] font-bold uppercase ${
                            cita.estado === "cancelada"
                              ? "text-red-500"
                              : "text-emerald-600"
                          }`}
                        >
                          {cita.estado || "confirmada"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-7">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b92d43]">
                Sesiones
              </span>
              <h2 className="mt-1 text-xl font-bold">
                Mis bonos
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              {bonos.length === 0 ? (
                <div className="rounded-2xl bg-[#f4f6f7] p-5">
                  <p className="text-sm text-slate-500">
                    No tienes bonos registrados.
                  </p>
                </div>
              ) : (
                bonos.map((bono) => {
                  const restantes = Math.max(
                    0,
                    bono.sesiones_totales -
                      bono.sesiones_usadas
                  );

                  return (
                    <div
                      key={bono.id}
                      className="rounded-2xl bg-[#f4f6f7] p-5"
                    >
                      <div className="flex justify-between gap-4">
                        <div>
                          <p className="font-bold">
                            {bono.nombre}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {bono.sesiones_usadas} de{" "}
                            {bono.sesiones_totales} utilizadas
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {restantes}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            restantes
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-1.5">
                        {Array.from({
                          length: bono.sesiones_totales,
                        }).map((_, index) => (
                          <span
                            key={index}
                            className={`h-2 flex-1 rounded-full ${
                              index < bono.sesiones_usadas
                                ? "bg-[#b92d43]"
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-7 lg:col-span-2">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b92d43]">
                  Economía
                </span>
                <h2 className="mt-1 text-xl font-bold">
                  Historial de pagos
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {cobros.length === 0 ? (
                <div className="rounded-2xl bg-[#f4f6f7] p-5">
                  <p className="text-sm text-slate-500">
                    No hay pagos registrados.
                  </p>
                </div>
              ) : (
                cobros.map((cobro) => (
                  <div
                    key={cobro.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-[#f4f6f7] p-4"
                  >
                    <div>
                      <p className="font-bold">
                        {cobro.concepto}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {fechaBonita(cobro.fecha)}
                        {cobro.metodo_pago
                          ? ` · ${cobro.metodo_pago}`
                          : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {Number(cobro.importe).toFixed(2)} €
                      </p>

                      <span
                        className={`text-[9px] font-bold uppercase ${
                          cobro.estado === "pagado"
                            ? "text-emerald-600"
                            : "text-[#b92d43]"
                        }`}
                      >
                        {cobro.estado}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
