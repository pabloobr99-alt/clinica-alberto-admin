"use client";

import { useEffect, useState } from "react";

const AGENDA_URL = "/reservar";

const services = [
  {
    number: "01",
    title: "Osteopatía",
    text: "Un enfoque personalizado para comprender tu cuerpo, identificar qué puede estar alterando su equilibrio y trabajar sobre ello.",
  },
  {
    number: "02",
    title: "Acupuntura",
    text: "Una técnica basada en la medicina tradicional china integrada dentro de una valoración individualizada.",
  },
  {
    number: "03",
    title: "Dietética",
    text: "Orientación y acompañamiento para mejorar tus hábitos y cuidar tu bienestar desde la alimentación.",
  },
  {
    number: "04",
    title: "Moxibustión",
    text: "Una técnica tradicional que utiliza el calor para complementar el abordaje terapéutico.",
  },
  {
    number: "05",
    title: "Descargas",
    text: "Trabajo dirigido a liberar tensión y favorecer una mejor sensación corporal.",
  },
];

const testimonials = [
  {
    text: "Un trato cercano, profesional y totalmente personalizado.",
    name: "Paciente",
  },
  {
    text: "Desde el primer momento sentí que realmente escuchaba lo que necesitaba.",
    name: "Paciente",
  },
  {
    text: "Una experiencia muy agradable y un espacio donde te sientes cómodo desde que entras.",
    name: "Paciente",
  },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => {
              const next = new Set(prev);
              next.add(entry.target.id);
              return next;
            });
          }
        });
      },
      {
        threshold: 0.15,
      }
    );

    elements.forEach((element, index) => {
      if (!element.id) {
        element.id = `reveal-${index}`;
      }

      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <main className="overflow-hidden bg-white text-[#0A3653]">
      {/* NAVBAR */}
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/95 shadow-sm backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <a href="#" className="group" onClick={closeMobileMenu}>
            <div className="text-xs font-semibold tracking-[0.28em] text-[#B1263A]">
              CLÍNICA DE OSTEOPATÍA
            </div>

            <div
              className={`mt-1 text-lg font-bold tracking-tight ${
                scrolled ? "text-[#0A3653]" : "text-white"
              }`}
            >
              Alberto Matamoros
            </div>
          </a>

          {/* MENÚ DESKTOP */}
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#servicios" className="nav-link">
              Servicios
            </a>

            <a href="#alberto" className="nav-link">
              Alberto
            </a>

            <a href="#clinica" className="nav-link">
              La clínica
            </a>

            <a href="#contacto" className="nav-link">
              Contacto
            </a>

            <a
              href={AGENDA_URL}
              className="rounded-full bg-[#0A3653] px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#B1263A]"
            >
              Reservar cita
            </a>
          </nav>

          {/* MENÚ MÓVIL */}
          <div className="flex items-center gap-3 md:hidden">
            <a
              href={AGENDA_URL}
              className="rounded-full bg-[#0A3653] px-5 py-3 text-sm font-semibold text-white"
            >
              Reservar
            </a>

            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${
                scrolled
                  ? "bg-[#0A3653] text-white"
                  : "border border-white/30 bg-white/10 text-white backdrop-blur-sm"
              }`}
            >
              <span
                className={`absolute h-px w-5 transition-transform duration-300 ${
                  mobileMenuOpen ? "rotate-45" : "-translate-y-1.5"
                }`}
                style={{ backgroundColor: "currentColor" }}
              />

              <span
                className={`absolute h-px w-5 transition-transform duration-300 ${
                  mobileMenuOpen ? "-rotate-45" : "translate-y-1.5"
                }`}
                style={{ backgroundColor: "currentColor" }}
              />
            </button>
          </div>
        </div>

        {/* PANEL MÓVIL */}
        <div
          className={`overflow-hidden border-t border-slate-200 bg-white transition-all duration-500 md:hidden ${
            mobileMenuOpen
              ? "max-h-[420px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <nav className="mx-auto max-w-7xl px-6 py-6">
            <a
              href="#servicios"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              <span>01</span>
              Servicios
            </a>

            <a
              href="#alberto"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              <span>02</span>
              Alberto
            </a>

            <a
              href="#clinica"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              <span>03</span>
              La clínica
            </a>

            <a
              href="#contacto"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              <span>04</span>
              Contacto
            </a>

            <a
              href={AGENDA_URL}
              onClick={closeMobileMenu}
              className="mt-4 flex items-center justify-between rounded-2xl bg-[#B1263A] px-5 py-4 font-semibold text-white"
            >
              Reservar cita
              <span>→</span>
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center">
        <div className="absolute inset-0 bg-[#E9EEF1]">
          <div className="flex h-full items-center justify-center">
            <div className="image-placeholder image-placeholder-large">
              <span>FOTOGRAFÍA PRINCIPAL</span>
              <small>Imagen de Alberto / consulta</small>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3653]/90 via-[#0A3653]/55 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-24 lg:px-10">
          <div className="max-w-3xl text-white">
            <p className="hero-animation text-sm font-semibold uppercase tracking-[0.35em] text-white/75">
              Terapias Naturales y Equilibrio
            </p>

            <h1 className="hero-animation-delay mt-6 text-5xl font-bold leading-[0.98] tracking-tight sm:text-6xl lg:text-8xl">
              Escucha tu cuerpo.
              <br />
              <span className="text-white/75">
                Encuentra tu equilibrio.
              </span>
            </h1>

            <p className="hero-animation-delay-2 mt-8 max-w-xl text-lg leading-relaxed text-white/80">
              Un espacio dedicado a entenderte, escucharte y acompañarte
              desde un enfoque personalizado.
            </p>

            <div className="hero-animation-delay-3 mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href={AGENDA_URL}
                className="group inline-flex items-center justify-center gap-4 rounded-full bg-white px-8 py-4 font-semibold text-[#0A3653] transition duration-500 hover:gap-6"
              >
                Reservar mi cita
                <span className="transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </a>

              <a
                href="#filosofia"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-4 font-semibold text-white backdrop-blur-sm transition duration-300 hover:bg-white/10"
              >
                Conocer la clínica
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-center text-white/70">
          <div className="text-[10px] uppercase tracking-[0.35em]">
            Descubre
          </div>
          <div className="mx-auto mt-3 h-12 w-px animate-pulse bg-white/50" />
        </div>
      </section>

      {/* FILOSOFÍA */}
      <section
        id="filosofia"
        className={`section-padding reveal ${
          visibleSections.has("filosofia") ? "visible" : ""
        }`}
      >
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="section-kicker">Nuestra filosofía</p>

            <h2 className="section-title">
              Cada cuerpo tiene
              <br />
              <span className="text-[#B1263A]">su propia historia.</span>
            </h2>
          </div>

          <div className="space-y-6 text-lg leading-relaxed text-slate-600">
            <p>
              No creemos en soluciones iguales para todo el mundo. Cada
              persona llega con unas necesidades, unas circunstancias y una
              historia diferente.
            </p>

            <p>
              Por eso, el primer paso es escucharte. Entender qué te ocurre,
              cómo lo sientes y qué puede necesitar tu cuerpo.
            </p>

            <p className="font-medium text-[#0A3653]">
              A partir de ahí comienza el trabajo.
            </p>
          </div>
        </div>
      </section>

      {/* FOTO INTERMEDIA */}
      <section className="parallax-section relative h-[70vh] min-h-[500px] overflow-hidden">
        <div className="parallax-image absolute inset-[-8%]">
          <div className="flex h-full items-center justify-center bg-[#E9EEF1]">
            <div className="image-placeholder image-placeholder-wide">
              <span>FOTOGRAFÍA</span>
              <small>Detalle de la clínica / tratamiento</small>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-[#0A3653]/20" />

        <div className="absolute bottom-10 left-0 right-0 z-10">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <p className="max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Un espacio para parar,
              <br />
              respirar y volver a escucharte.
            </p>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section
        id="servicios"
        className={`section-padding bg-[#F5F7F8] reveal ${
          visibleSections.has("servicios") ? "visible" : ""
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="section-kicker">Servicios</p>

            <h2 className="section-title">
              Un enfoque.
              <br />
              <span className="text-[#B1263A]">
                Diferentes herramientas.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Cada técnica tiene su lugar. Alberto valorará tu situación para
              determinar el enfoque más adecuado para ti.
            </p>
          </div>

          <div className="mt-16 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <div className="space-y-3">
              {services.map((service, index) => (
                <button
                  key={service.title}
                  onClick={() => setActiveService(index)}
                  className={`service-button ${
                    activeService === index ? "service-button-active" : ""
                  }`}
                >
                  <span className="text-sm opacity-50">
                    {service.number}
                  </span>

                  <span className="flex-1 text-left text-xl font-semibold">
                    {service.title}
                  </span>

                  <span className="text-xl">→</span>
                </button>
              ))}
            </div>

            <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] bg-[#0A3653] p-10 text-white sm:p-14">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#B1263A]/30 blur-3xl" />

              <div className="relative flex h-full flex-col justify-between">
                <div>
                  <span className="text-sm tracking-[0.25em] text-white/50">
                    {services[activeService].number}
                  </span>

                  <h3 className="mt-6 text-4xl font-bold">
                    {services[activeService].title}
                  </h3>

                  <p className="mt-8 max-w-lg text-lg leading-relaxed text-white/70">
                    {services[activeService].text}
                  </p>
                </div>

                <div className="mt-12 flex justify-between border-t border-white/10 pt-6">
                  <span className="text-sm text-white/50">
                    Alberto Matamoros
                  </span>

                  <span className="text-sm text-white/50">
                    Terapias Naturales y Equilibrio
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ALBERTO */}
      <section
        id="alberto"
        className={`section-padding reveal ${
          visibleSections.has("alberto") ? "visible" : ""
        }`}
      >
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:items-center">
          <div className="image-placeholder image-placeholder-portrait">
            <span>FOTOGRAFÍA DE ALBERTO</span>
            <small>Retrato profesional</small>
          </div>

          <div>
            <p className="section-kicker">Conoce a Alberto</p>

            <h2 className="section-title">
              Más que una técnica,
              <br />
              <span className="text-[#B1263A]">
                una forma de acompañarte.
              </span>
            </h2>

            <div className="mt-8 space-y-5 text-lg leading-relaxed text-slate-600">
              <p>
                Detrás de cada consulta hay una persona. Por eso el trato
                cercano y la escucha forman parte fundamental de cada sesión.
              </p>

              <p>
                Aquí podremos añadir la formación de Alberto, su trayectoria,
                especialidades y todo aquello que quieras contar sobre él.
              </p>
            </div>

            <div className="mt-10 h-px w-20 bg-[#B1263A]" />

            <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-[#0A3653]">
              Cercanía · Profesionalidad · Personalización
            </p>
          </div>
        </div>
      </section>

      {/* PROCESO */}
      <section className="bg-[#0A3653] py-24 text-white sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#B1263A]">
              El proceso
            </p>

            <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
              Empieza por algo sencillo:
              <br />
              <span className="text-white/60">
                contarnos qué necesitas.
              </span>
            </h2>
          </div>

          <div className="mt-20 grid gap-0 border-t border-white/10 md:grid-cols-4">
            {[
              ["01", "Escuchamos", "Nos cuentas qué te ocurre."],
              ["02", "Valoramos", "Entendemos tu situación."],
              ["03", "Personalizamos", "Elegimos el enfoque adecuado."],
              ["04", "Acompañamos", "Trabajamos contigo."],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="border-b border-white/10 py-10 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0"
              >
                <span className="text-sm text-white/40">{number}</span>

                <h3 className="mt-6 text-2xl font-semibold">{title}</h3>

                <p className="mt-3 leading-relaxed text-white/50">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="section-kicker">La experiencia</p>

            <h2 className="section-title">
              Lo importante es cómo
              <br />
              <span className="text-[#B1263A]">te sientes al salir.</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="rounded-[2rem] border border-slate-200 p-8 transition duration-500 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="text-4xl text-[#B1263A]">“</div>

                <p className="mt-4 text-lg leading-relaxed text-slate-600">
                  {testimonial.text}
                </p>

                <div className="mt-8 text-sm font-semibold text-[#0A3653]">
                  {testimonial.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLÍNICA */}
      <section id="clinica" className="section-padding bg-[#F5F7F8]">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="image-placeholder image-placeholder-square">
              <span>FOTOGRAFÍA</span>
              <small>Interior de la clínica</small>
            </div>

            <div className="image-placeholder image-placeholder-square">
              <span>FOTOGRAFÍA</span>
              <small>Detalle del espacio</small>
            </div>
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="section-kicker">La clínica</p>

              <h2 className="section-title">
                Un espacio pensado
                <br />
                <span className="text-[#B1263A]">para ti.</span>
              </h2>
            </div>

            <p className="max-w-xl text-lg leading-relaxed text-slate-600">
              Aquí podremos contar cómo es la clínica, dónde se encuentra,
              qué ambiente encontrará el paciente y cualquier información
              que ayude a transmitir confianza antes de su primera visita.
            </p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden bg-[#B1263A] py-28 text-white sm:py-40">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-[#0A3653]/30 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
            Tu próximo paso
          </p>

          <h2 className="mt-6 text-5xl font-bold tracking-tight sm:text-7xl">
            ¿Empezamos?
          </h2>

          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-white/80">
            Reserva tu cita a través de nuestra agenda online y da el primer
            paso para cuidar de ti.
          </p>

          <a
            href={AGENDA_URL}
            className="mt-10 inline-flex items-center gap-5 rounded-full bg-white px-9 py-5 font-semibold text-[#0A3653] transition duration-500 hover:gap-7 hover:shadow-2xl"
          >
            Reservar cita
            <span>→</span>
          </a>
        </div>
      </section>

      {/* CONTACTO */}
      <footer id="contacto" className="bg-[#071F31] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-3">
            <div>
              <div className="text-xs font-semibold tracking-[0.28em] text-[#B1263A]">
                CLÍNICA DE OSTEOPATÍA
              </div>

              <h3 className="mt-3 text-2xl font-bold">
                Alberto Matamoros
              </h3>

              <p className="mt-5 max-w-sm leading-relaxed text-white/50">
                Terapias Naturales y Equilibrio.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
                Contacto
              </p>

              <div className="mt-5 space-y-3 text-white/70">
                <p>📍 Dirección de la clínica</p>
                <p>📞 Teléfono</p>
                <p>✉️ Email</p>
                <p>📱 WhatsApp</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
                Enlaces
              </p>

              <div className="mt-5 space-y-3">
                <a href="#servicios" className="footer-link">
                  Servicios
                </a>

                <a href="#alberto" className="footer-link">
                  Alberto
                </a>

                <a href="#clinica" className="footer-link">
                  La clínica
                </a>

                <a href={AGENDA_URL} className="footer-link">
                  Reservar cita
                </a>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-white/10 pt-8 text-sm text-white/30">
            © 2026 Clínica de Osteopatía Alberto Matamoros
          </div>
        </div>
      </footer>
    </main>
  );
}