"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function PacienteRegistroPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repetirPassword, setRepetirPassword] = useState("");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMensaje("");

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const correo = email.trim().toLowerCase();

    if (!nombreLimpio) {
      setError("Introduce tu nombre y apellidos.");
      return;
    }

    if (password.length < 8) {
      setError(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    if (password !== repetirPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    const {
      data,
      error: registroError,
    } = await supabase.auth.signUp({
      email: correo,
      password,
      options: {
        data: {
          nombre: nombreLimpio,
          telefono: telefonoLimpio,
        },
      },
    });

    if (registroError) {
      console.error(registroError);

      setError(
        "No se ha podido crear la cuenta. Comprueba los datos o utiliza otro correo."
      );

      setCargando(false);
      return;
    }

    if (!data.session) {
      setMensaje(
        "Cuenta creada. Te hemos enviado un correo de confirmación. Confirma tu dirección y después inicia sesión."
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
          nombre: nombreLimpio,
          telefono: telefonoLimpio,
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error ||
            "La cuenta se ha creado, pero no se ha podido preparar tu ficha."
        );
      }

      router.push("/paciente");
      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido preparar tu área."
      );

      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f7] px-5 py-12">
      <div className="w-full max-w-lg rounded-[30px] bg-white p-8 shadow-sm sm:p-10">
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
          Crea tu espacio personal.
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Gestiona tus citas, bonos y pagos del Centro desde
          tu cuenta privada.
        </p>

        <form
          onSubmit={registrar}
          className="mt-8 space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-bold text-[#0b3b58]">
              Nombre y apellidos
            </label>

            <input
              type="text"
              autoComplete="name"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellidos"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#0b3b58]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#0b3b58]">
              Teléfono
            </label>

            <input
              type="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="600 000 000"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#0b3b58]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#0b3b58]">
              Correo electrónico
            </label>

            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#0b3b58]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#0b3b58]">
              Contraseña
            </label>

            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#0b3b58]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#0b3b58]">
              Repetir contraseña
            </label>

            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={repetirPassword}
              onChange={(e) =>
                setRepetirPassword(e.target.value)
              }
              placeholder="Repite tu contraseña"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#0b3b58]"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="rounded-xl bg-emerald-50 px-4 py-4 text-sm font-medium leading-6 text-emerald-700">
              {mensaje}

              <Link
                href="/paciente/login"
                className="mt-3 block font-bold text-emerald-800"
              >
                Ir a iniciar sesión →
              </Link>
            </div>
          )}

          {!mensaje && (
            <button
              type="submit"
              disabled={cargando}
              style={{
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
              }}
              className="mt-2 w-full rounded-xl bg-[#0b3b58] px-5 py-4 text-sm font-bold transition hover:bg-[#0d496f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando
                ? "Creando tu cuenta..."
                : "Crear mi cuenta →"}
            </button>
          )}
        </form>

        <p className="mt-7 text-center text-xs text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/paciente/login"
            className="font-bold text-[#0b3b58]"
          >
            Iniciar sesión
          </Link>
        </p>

        <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">
          Tu cuenta se utilizará únicamente para acceder a tu
          información y servicios del Centro.
        </p>
      </div>
    </main>
  );
}
