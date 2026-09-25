import Link from "next/link";

export default function AccesoPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f7] text-[#0b3b58]">

      {/* CABECERA */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="group">
            <span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-[#b92d43]">
              Centro de Osteopatía
            </span>
            <span className="mt-1 block text-sm font-bold text-[#0b3b58]">
              Alberto Matamoros
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#0b3b58] transition hover:border-[#0b3b58]"
          >
            ← Volver al Centro
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">

        {/* PRESENTACIÓN */}
        <div className="mb-10 max-w-3xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#b92d43]">
            Área privada
          </span>

          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[#0b3b58] sm:text-5xl">
            Tu espacio en el Centro.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
            Accede a tu espacio personal como paciente o entra en el
            área profesional de administración.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ================= PACIENTE ================= */}
          <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b3b58]/10 text-xl text-[#0b3b58]">
              ♙
            </div>

            <div className="mt-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#b92d43]">
                Pacientes
              </span>

              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Área paciente
              </h2>

              <p className="mt-3 max-w-md leading-7 text-slate-500">
                Consulta tus citas, sesiones, bonos y pagos desde tu
                espacio personal.
              </p>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {[
                ["01", "Mis citas"],
                ["02", "Mis bonos"],
                ["03", "Mis pagos"],
                ["04", "Reservar"],
              ].map(([numero, texto]) => (
                <div
                  key={texto}
                  className="rounded-2xl bg-[#f4f6f7] p-4"
                >
                  <span className="text-[9px] font-bold tracking-widest text-[#b92d43]">
                    {numero}
                  </span>
                  <p className="mt-2 text-sm font-bold text-[#0b3b58]">
                    {texto}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3">

              <Link
                href="/paciente/login"
                style={{ color: "#ffffff" }}
                className="flex w-full items-center justify-between rounded-xl bg-[#0b3b58] px-5 py-4 text-sm font-bold shadow-sm transition hover:-translate-y-0.5"
              >
                <span>Entrar en mi área</span>
                <span>→</span>
              </Link>

              <Link
                href="/paciente/registro"
                style={{ color: "#0b3b58" }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold transition hover:border-[#0b3b58]"
              >
                <span>Crear mi cuenta</span>
                <span>＋</span>
              </Link>

              <Link
                href="/reservar"
                style={{ color: "#64748b" }}
                className="block pt-2 text-center text-xs font-semibold transition hover:text-[#0b3b58]"
              >
                ¿Solo quieres pedir cita? Reservar sin acceder →
              </Link>

            </div>
          </section>

          {/* ================= PROFESIONAL ================= */}
          <section className="rounded-[30px] bg-[#0b3b58] p-7 text-white shadow-xl sm:p-9">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl">
              ⚕
            </div>

            <div className="mt-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                Acceso restringido
              </span>

              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Área profesional
              </h2>

              <p className="mt-3 max-w-md leading-7 text-white/60">
                Gestión privada del Centro de Osteopatía Alberto
                Matamoros.
              </p>
            </div>

            <div className="mt-7 space-y-3">
              {[
                "Agenda y solicitudes",
                "Fichas de pacientes",
                "Historial de sesiones",
                "Bonos y cobros",
              ].map((texto) => (
                <div
                  key={texto}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3.5"
                >
                  <span className="h-2 w-2 rounded-full bg-[#c62d47]" />
                  <span className="text-sm font-semibold text-white">
                    {texto}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/login"
              style={{ color: "#0b3b58" }}
              className="mt-8 flex w-full items-center justify-between rounded-xl bg-white px-5 py-4 text-sm font-bold shadow-sm transition hover:-translate-y-0.5"
            >
              <span>Acceder como profesional</span>
              <span>→</span>
            </Link>

            <p className="mt-4 text-center text-[10px] text-white/40">
              Acceso exclusivo para personal autorizado
            </p>
          </section>

        </div>

        <footer className="mt-10 text-center text-[11px] text-slate-400">
          Centro de Osteopatía Alberto Matamoros
        </footer>
      </div>
    </main>
  );
}
