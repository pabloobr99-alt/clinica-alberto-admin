"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function PacienteLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setCargando(true);

    const correo = email.trim().toLowerCase();

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: correo,
        password,
      });

    if (loginError || !data.session || !data.user) {
      setError(
        "El correo o la contraseña no son correctos, o todavía no has confirmado tu correo."
      );
      setCargando(false);
      return;
    }

    try {
      const response = await fetch("/api/paciente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          nombre:
            data.user.user_metadata?.nombre ||
            correo.split("@")[0],
          telefono: "",
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error ||
            "No se ha podido vincular tu cuenta."
        );
      }

      router.push("/paciente");
      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido abrir tu área de paciente."
      );

      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f7] px-5 py-12">
      <div className="w-full max-w-md rounded-[30px] bg-white p-8 shadow-sm sm:p-10">
        <Link
          href="/acceso"
          className="text-xs font-bold text-slate-400"
        >
          ← Volver
        </Link>

        <span className="mt-10 block text-[10px] font-bold uppercase tracking-[0.28em] text-[#b92d43]">
          Área paciente
        </span>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0b3b58]">
          Bienvenido de nuevo.
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Accede a tus citas, bonos, sesiones y pagos.
        </p>

        <form
          onSubmit={iniciarSesion}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="paciente-email"
              className="mb-2 block text-sm font-bold text-[#0b3b58]"
            >
              Correo electrónico
            </label>

            <input
              id="paciente-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0b3b58] focus:ring-2 focus:ring-[#0b3b58]/10"
            />
          </div>

          <div>
            <label
              htmlFor="paciente-password"
              className="mb-2 block text-sm font-bold text-[#0b3b58]"
            >
              Contraseña
            </label>

            <input
              id="paciente-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0b3b58] focus:ring-2 focus:ring-[#0b3b58]/10"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            style={{
              color: "#ffffff",
              WebkitTextFillColor: "#ffffff",
            }}
            className="w-full rounded-xl bg-[#0b3b58] px-5 py-4 text-sm font-bold transition hover:bg-[#0d496f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando
              ? "Entrando..."
              : "Entrar en mi área →"}
          </button>
        </form>

        <div className="mt-7 border-t border-slate-100 pt-6 text-center">
          <p className="text-xs text-slate-500">
            ¿Todavía no tienes cuenta?{" "}
            <Link
              href="/paciente/registro"
              className="font-bold text-[#0b3b58]"
            >
              Crear cuenta
            </Link>
          </p>

          <Link
            href="/reservar"
            className="mt-4 inline-block text-xs font-semibold text-slate-400"
          >
            Reservar una cita sin iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
