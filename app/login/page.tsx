"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();

    setCargando(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("El correo o la contraseña no son correctos.");
      setCargando(false);
      return;
    }

    router.push("/admin");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7F8] px-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl sm:p-10">

        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#B1263A]">
            Acceso privado
          </p>

          <h1 className="mt-4 text-3xl font-bold text-[#0A3653]">
            Panel de administración
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Introduce tus datos para acceder a la gestión de citas.
          </p>
        </div>

        <form onSubmit={iniciarSesion} className="mt-8 space-y-5">

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-[#0A3653]"
            >
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0A3653] focus:ring-2 focus:ring-[#0A3653]/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-[#0A3653]"
            >
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0A3653] focus:ring-2 focus:ring-[#0A3653]/10"
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
            className="w-full rounded-xl bg-[#0A3653] px-5 py-3.5 font-semibold text-white transition hover:bg-[#0d496f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? "Entrando..." : "Entrar al panel"}
          </button>

        </form>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm font-semibold text-[#0A3653] transition hover:text-[#B1263A]"
          >
            ← Volver a la web
          </a>
        </div>

      </div>
    </main>
  );
}