"use client";

import { useState } from "react";
import Link from "next/link";

const servicios = [
  {
    numero: "01",
    nombre: "Osteopatía",
    concepto: "EQUILIBRIO",
    japones: "調和",
    texto:
      "Un abordaje individualizado que comienza con una valoración para comprender qué puede estar alterando tu equilibrio.",
  },
  {
    numero: "02",
    nombre: "Acupuntura",
    concepto: "ARMONÍA",
    japones: "気",
    texto:
      "Una técnica basada en la medicina tradicional china que puede integrarse dentro de una valoración personalizada.",
  },
  {
    numero: "03",
    nombre: "Dietética",
    concepto: "CUIDADO",
    japones: "養",
    texto:
      "Orientación individual para trabajar alimentación y hábitos desde un enfoque personalizado.",
  },
  {
    numero: "04",
    nombre: "Moxibustión",
    concepto: "CALIDEZ",
    japones: "温",
    texto:
      "Una técnica tradicional basada en la aplicación de calor que puede complementar el abordaje elegido.",
  },
  {
    numero: "05",
    nombre: "Descargas",
    concepto: "LIBERACIÓN",
    japones: "解",
    texto:
      "Trabajo adaptado a cada persona orientado a zonas sometidas a tensión o sobrecarga.",
  },
];

export default function ServiciosPremium() {
  const [activo, setActivo] = useState<number | null>(0);

  return (
    <section className="v10-services" id="servicios-premium">
      <header className="v10-services-head">
        <span>TRATAMIENTOS</span>

        <h2>
          Diferentes técnicas.
          <em> Una misma persona.</em>
        </h2>

        <p>
          No necesitas decidir qué técnica necesitas antes de venir.
          El punto de partida es entender qué te ocurre.
        </p>
      </header>

      <div className="v10-services-list">
        {servicios.map((servicio, index) => {
          const abierto = activo === index;

          return (
            <article
              key={servicio.nombre}
              className={`v10-service ${abierto ? "active" : ""}`}
            >
              <button
                type="button"
                className="v10-service-trigger"
                onClick={() => setActivo(abierto ? null : index)}
                aria-expanded={abierto}
              >
                <span className="v10-service-number">
                  {servicio.numero}
                </span>

                <span className="v10-service-title">
                  <strong>{servicio.nombre}</strong>
                  <small>{servicio.concepto}</small>
                </span>

                <span className="v10-service-jp">
                  {servicio.japones}
                </span>

                <span className="v10-service-arrow">
                  {abierto ? "−" : "↗"}
                </span>
              </button>

              <div className="v10-service-content">
                <div className="v10-service-content-inner">
                  <p>{servicio.texto}</p>

                  <div className="v10-service-bottom">
                    <span>
                      <b>聴</b>
                      Primero valoramos. Después elegimos cómo trabajar.
                    </span>

                    <Link href="/reservar">
                      Reservar cita <b>→</b>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
