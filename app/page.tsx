"use client";

import { useEffect, useState } from "react";

const AGENDA_URL = "/reservar";

const services = [
  {
    number: "01",
    title: "Osteopatía",
    japanese: "調和",
    concept: "Equilibrio",
    text: "Un enfoque personalizado para comprender tu cuerpo, identificar qué puede estar alterando su equilibrio y trabajar sobre ello.",
  },
  {
    number: "02",
    title: "Acupuntura",
    japanese: "気",
    concept: "Armonía",
    text: "Una técnica basada en la medicina tradicional china integrada dentro de una valoración individualizada.",
  },
  {
    number: "03",
    title: "Dietética",
    japanese: "養",
    concept: "Cuidado",
    text: "Orientación y acompañamiento para mejorar tus hábitos y cuidar tu bienestar desde la alimentación.",
  },
  {
    number: "04",
    title: "Moxibustión",
    japanese: "温",
    concept: "Calidez",
    text: "Una técnica tradicional que utiliza el calor para complementar el abordaje terapéutico.",
  },
  {
    number: "05",
    title: "Descargas",
    japanese: "解",
    concept: "Liberación",
    text: "Trabajo dirigido a liberar tensión y favorecer una mejor sensación corporal.",
  },
];

const process = [
  ["01", "Escuchamos", "Nos cuentas qué te ocurre y cómo lo estás sintiendo."],
  ["02", "Valoramos", "Observamos tu situación de forma individualizada."],
  ["03", "Personalizamos", "Alberto determina el enfoque más adecuado para ti."],
  ["04", "Acompañamos", "Trabajamos contigo respetando tu proceso."],
];

const faqs = [
  {
    question: "¿Tengo que elegir un tratamiento al reservar?",
    answer:
      "No. Cuéntanos qué te ocurre. Alberto valorará tu situación y determinará qué enfoque puede ser el más adecuado.",
  },
  {
    question: "¿Cuánto dura una sesión?",
    answer:
      "Las sesiones tienen una duración aproximada de una hora, permitiendo dedicar tiempo a la valoración y al trabajo personalizado.",
  },
  {
    question: "¿Qué debo explicar al pedir mi cita?",
    answer:
      "Simplemente describe qué notas, dónde lo sientes y aquello que consideres importante. No necesitas saber qué técnica necesitas.",
  },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 45);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <main>
      {/* NAV */}
      <header className={`lux-nav ${scrolled ? "lux-nav--scrolled" : ""}`}>
        <div className="lux-nav__inner">
          <a href="#" className="brand" onClick={closeMenu}>
            <div className="brand__seal">
              <span>AM</span>
            </div>

            <div>
              <span className="brand__small">CLÍNICA DE OSTEOPATÍA</span>
              <strong>Alberto Matamoros</strong>
            </div>
          </a>

          <nav className="desktop-nav">
            <a href="#filosofia">Filosofía</a>
            <a href="#servicios">Servicios</a>
            <a href="#alberto">Alberto</a>
            <a href="#clinica">La clínica</a>
            <a href="#contacto">Contacto</a>
          </nav>

          <a href={AGENDA_URL} className="nav-book">
            <span>Reservar cita</span>
            <i>↗</i>
          </a>

          <button
            type="button"
            className={`menu-button ${mobileMenuOpen ? "is-open" : ""}`}
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label="Abrir menú"
            aria-expanded={mobileMenuOpen}
          >
            <span />
            <span />
          </button>
        </div>

        <div className={`mobile-menu ${mobileMenuOpen ? "is-open" : ""}`}>
          <a href="#filosofia" onClick={closeMenu}>Filosofía</a>
          <a href="#servicios" onClick={closeMenu}>Servicios</a>
          <a href="#alberto" onClick={closeMenu}>Alberto</a>
          <a href="#clinica" onClick={closeMenu}>La clínica</a>
          <a href="#contacto" onClick={closeMenu}>Contacto</a>
          <a href={AGENDA_URL} onClick={closeMenu} className="mobile-menu__book">
            Reservar cita <span>↗</span>
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="lux-hero">
        <div className="hero-noise" />
        <div className="hero-glow hero-glow--blue" />
        <div className="hero-glow hero-glow--wine" />

        <div className="zen-sun zen-sun--hero">
          <span />
        </div>

        <div className="japanese-grid japanese-grid--hero" />

        <div className="lux-container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow hero-enter">
              <span />
              Terapias Naturales y Equilibrio
            </div>

            <h1 className="hero-enter hero-enter--2">
              Tu cuerpo
              <br />
              <em>habla.</em>
              <br />
              <strong>Escuchémoslo.</strong>
            </h1>

            <p className="hero-description hero-enter hero-enter--3">
              Un espacio donde la escucha, la experiencia y diferentes
              herramientas terapéuticas se encuentran para ofrecerte un
              acompañamiento verdaderamente personal.
            </p>

            <div className="hero-actions hero-enter hero-enter--4">
              <a href={AGENDA_URL} className="button button--wine">
                <span>Reservar mi cita</span>
                <i>↗</i>
              </a>

              <a href="#filosofia" className="button button--glass">
                <span>Descubrir la clínica</span>
                <i>↓</i>
              </a>
            </div>

            <div className="hero-values hero-enter hero-enter--5">
              <div>
                <span>01</span>
                <strong>Escucha</strong>
              </div>
              <div>
                <span>02</span>
                <strong>Equilibrio</strong>
              </div>
              <div>
                <span>03</span>
                <strong>Personalización</strong>
              </div>
            </div>
          </div>

          <div className="hero-art hero-enter hero-enter--3">
            <div className="hero-arch">
              <div className="photo-space">
                <span>FOTOGRAFÍA PRINCIPAL</span>
                <small>Alberto · Consulta · Espacio</small>
              </div>

              <div className="hero-arch__shine" />
            </div>

            <div className="hero-floating-card">
              <div className="floating-symbol">和</div>
              <div>
                <span>Una mirada diferente</span>
                <strong>Primero la persona.</strong>
                <p>Después, la técnica.</p>
              </div>
              <i>↗</i>
            </div>

            <div className="hero-stamp">
              <span>AM</span>
              <small>EST. · 2026</small>
            </div>
          </div>
        </div>

        <div className="hero-bottom">
          <span>SEVILLA</span>
          <div />
          <span>OSTEOPATÍA · ACUPUNTURA · BIENESTAR</span>
        </div>
      </section>

      {/* INTRO */}
      <section id="filosofia" className="intro-section">
        <div className="lux-container">
          <div className="intro-top" data-reveal>
            <div className="section-index">
              <span>01</span>
              <i />
              <span>FILOSOFÍA</span>
            </div>

            <div className="enso-small">
              <span>和</span>
            </div>
          </div>

          <div className="intro-grid">
            <div data-reveal>
              <p className="kicker">Nuestra manera de entender el cuidado</p>

              <h2 className="display-title">
                No empiezas
                <br />
                por una <em>técnica.</em>
                <br />
                Empiezas por ti.
              </h2>
            </div>

            <div className="intro-copy" data-reveal>
              <p className="intro-lead">
                Cada cuerpo tiene una historia distinta. Por eso, una sesión
                no debería empezar eligiendo un tratamiento de una lista.
              </p>

              <p>
                El primer paso es escucharte: saber qué notas, cómo lo sientes
                y qué está ocurriendo en tu día a día. A partir de esa
                valoración, Alberto decide qué herramientas pueden encajar
                mejor contigo.
              </p>

              <div className="quote-line">
                <i />
                <p>
                  “La técnica es una herramienta.
                  <br />
                  <strong>La persona es siempre el centro.</strong>”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="statement-section">
        <div className="statement-pattern" />

        <div className="lux-container statement-inner" data-reveal>
          <span className="statement-jp">聴</span>

          <p>EL PRIMER PASO ES SENCILLO</p>

          <h2>
            Tú cuéntame
            <br />
            <em>qué te ocurre.</em>
          </h2>

          <div className="statement-bottom">
            <span />
            <p>Del resto nos ocupamos juntos.</p>
            <span />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="servicios" className="services-section">
        <div className="lux-container">
          <div className="section-heading" data-reveal>
            <div>
              <div className="section-index section-index--dark">
                <span>02</span>
                <i />
                <span>SERVICIOS</span>
              </div>

              <h2 className="display-title">
                Diferentes caminos.
                <br />
                <em>Un mismo propósito.</em>
              </h2>
            </div>

            <p>
              No necesitas saber cuál elegir. Cada herramienta tiene su lugar
              dentro de una valoración individualizada.
            </p>
          </div>

          <div className="services-experience" data-reveal>
            <div className="services-list">
              {services.map((service, index) => (
                <button
                  type="button"
                  key={service.title}
                  onMouseEnter={() => setActiveService(index)}
                  onClick={() => setActiveService(index)}
                  className={`lux-service ${
                    activeService === index ? "is-active" : ""
                  }`}
                >
                  <span className="lux-service__number">{service.number}</span>

                  <div>
                    <strong>{service.title}</strong>
                    <small>{service.concept}</small>
                  </div>

                  <span className="lux-service__arrow">↗</span>
                </button>
              ))}
            </div>

            <div className="service-stage">
              <div className="service-stage__pattern" />
              <div className="service-stage__orb" />

              <div className="service-stage__top">
                <span>{services[activeService].number}</span>
                <span>ALBERTO MATAMOROS</span>
              </div>

              <div className="service-stage__symbol">
                {services[activeService].japanese}
              </div>

              <div className="service-stage__content">
                <span>{services[activeService].concept}</span>
                <h3>{services[activeService].title}</h3>
                <p>{services[activeService].text}</p>
              </div>

              <div className="service-stage__footer">
                <span>Terapias Naturales</span>
                <i />
                <span>Equilibrio</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCE IMAGE */}
      <section className="experience-banner">
        <div className="experience-photo">
          <div className="photo-space photo-space--wide">
            <span>FOTOGRAFÍA DE LA CLÍNICA</span>
            <small>Detalle · Luz natural · Tratamiento</small>
          </div>
        </div>

        <div className="experience-overlay" />

        <div className="experience-copy" data-reveal>
          <span>間</span>
          <p>Un lugar donde el tiempo baja el ritmo.</p>
          <h2>
            Parar.
            <br />
            Respirar.
            <br />
            <em>Volver a escucharte.</em>
          </h2>
        </div>
      </section>

      {/* PROCESS */}
      <section className="process-section">
        <div className="process-circle" />

        <div className="lux-container">
          <div className="process-heading" data-reveal>
            <div className="section-index section-index--light">
              <span>03</span>
              <i />
              <span>EL PROCESO</span>
            </div>

            <h2>
              Cuatro momentos.
              <br />
              <em>Una experiencia.</em>
            </h2>
          </div>

          <div className="process-grid">
            {process.map(([number, title, text], index) => (
              <article
                className="process-card"
                key={number}
                data-reveal
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <div className="process-card__top">
                  <span>{number}</span>
                  <i>{index === 0 ? "聴" : index === 1 ? "観" : index === 2 ? "整" : "和"}</i>
                </div>

                <h3>{title}</h3>
                <p>{text}</p>

                <div className="process-card__line" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ALBERTO */}
      <section id="alberto" className="alberto-section">
        <div className="lux-container alberto-grid">
          <div className="alberto-visual" data-reveal>
            <div className="alberto-photo">
              <div className="photo-space photo-space--portrait">
                <span>RETRATO DE ALBERTO</span>
                <small>Fotografía profesional</small>
              </div>
            </div>

            <div className="alberto-seal">
              <strong>AM</strong>
              <span>ALBERTO MATAMOROS</span>
            </div>

            <div className="alberto-line-art" />
          </div>

          <div className="alberto-copy" data-reveal>
            <div className="section-index section-index--dark">
              <span>04</span>
              <i />
              <span>ALBERTO</span>
            </div>

            <p className="kicker">La persona detrás de la consulta</p>

            <h2 className="display-title">
              Conocimiento,
              <br />
              experiencia y
              <br />
              <em>escucha.</em>
            </h2>

            <p className="alberto-lead">
              Detrás de cada consulta hay una persona. Y detrás de cada
              persona, una historia que merece ser escuchada.
            </p>

            <p>
              El trabajo de Alberto parte de una atención cercana e
              individualizada, integrando distintas herramientas según las
              necesidades de cada caso.
            </p>

            <div className="credentials">
              <div>
                <span>FORMACIÓN</span>
                <strong>Técnico Superior en Dietética</strong>
              </div>

              <div>
                <span>ÁREAS</span>
                <strong>Osteopatía · Acupuntura · Moxibustión</strong>
              </div>
            </div>

            <div className="alberto-signature">
              <span>Alberto Matamoros</span>
              <small>Terapias Naturales y Equilibrio</small>
            </div>
          </div>
        </div>
      </section>

      {/* CLINIC */}
      <section id="clinica" className="clinic-section">
        <div className="lux-container">
          <div className="clinic-heading" data-reveal>
            <div>
              <div className="section-index section-index--dark">
                <span>05</span>
                <i />
                <span>EL ESPACIO</span>
              </div>

              <h2 className="display-title">
                Serenidad desde
                <br />
                <em>que entras.</em>
              </h2>
            </div>

            <p>
              Un entorno pensado para que la experiencia empiece antes de la
              sesión: calma, privacidad, atención y tiempo.
            </p>
          </div>

          <div className="clinic-gallery" data-reveal>
            <div className="clinic-shot clinic-shot--large">
              <div className="photo-space">
                <span>CLÍNICA</span>
                <small>Vista principal</small>
              </div>
              <span className="shot-number">01</span>
            </div>

            <div className="clinic-gallery__right">
              <div className="clinic-shot">
                <div className="photo-space">
                  <span>DETALLE</span>
                  <small>Espacio</small>
                </div>
                <span className="shot-number">02</span>
              </div>

              <div className="clinic-quote">
                <span className="clinic-quote__jp">静</span>
                <p>静けさ</p>
                <h3>La calma también forma parte de la experiencia.</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="lux-container faq-grid">
          <div data-reveal>
            <div className="section-index section-index--dark">
              <span>06</span>
              <i />
              <span>ANTES DE VENIR</span>
            </div>

            <h2 className="display-title">
              Tu primera visita,
              <br />
              <em>sin dudas.</em>
            </h2>

            <p className="faq-intro">
              Queremos que llegues sabiendo lo esencial y sin preocuparte por
              escoger una técnica concreta.
            </p>
          </div>

          <div className="faq-list" data-reveal>
            {faqs.map((faq, index) => (
              <div
                key={faq.question}
                className={`faq-item ${openFaq === index ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                >
                  <span>0{index + 1}</span>
                  <strong>{faq.question}</strong>
                  <i>+</i>
                </button>

                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="final-cta__sun" />
        <div className="final-cta__pattern" />

        <div className="lux-container final-cta__inner" data-reveal>
          <span className="final-japanese">始</span>

          <p>CUANDO TÚ QUIERAS</p>

          <h2>
            Tu bienestar puede
            <br />
            empezar <em>hoy.</em>
          </h2>

          <p className="final-description">
            Cuéntanos qué te ocurre y reserva tu cita.
            <br />
            No necesitas saber qué técnica elegir.
          </p>

          <a href={AGENDA_URL} className="button button--ivory">
            <span>Reservar mi cita</span>
            <i>↗</i>
          </a>

          <div className="final-meta">
            <span>Sesiones · 60 min aprox.</span>
            <i />
            <span>Atención personalizada</span>
            <i />
            <span>Reserva online</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contacto" className="lux-footer">
        <div className="lux-container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="brand__seal brand__seal--footer">
                <span>AM</span>
              </div>

              <div>
                <span>CLÍNICA DE OSTEOPATÍA</span>
                <h3>Alberto Matamoros</h3>
                <p>Terapias Naturales y Equilibrio</p>
              </div>
            </div>

            <div className="footer-columns">
              <div>
                <span className="footer-label">NAVEGACIÓN</span>
                <a href="#filosofia">Filosofía</a>
                <a href="#servicios">Servicios</a>
                <a href="#alberto">Alberto</a>
                <a href="#clinica">La clínica</a>
              </div>

              <div>
                <span className="footer-label">CONTACTO</span>
                <p>Dirección de la clínica</p>
                <p>Teléfono</p>
                <p>Email</p>
                <p>WhatsApp</p>
              </div>

              <div>
                <span className="footer-label">CITA</span>
                <p>Cuéntanos qué te ocurre.</p>
                <a href={AGENDA_URL} className="footer-book">
                  Reservar online <span>↗</span>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 Clínica de Osteopatía Alberto Matamoros</span>
            <span className="footer-kanji">和</span>
            <span>Terapias Naturales y Equilibrio</span>
          </div>
        </div>
      </footer>

      <a href={AGENDA_URL} className="mobile-floating-book">
        <span>Reservar cita</span>
        <i>↗</i>
      </a>
    </main>
  );
}
