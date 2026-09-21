"use client";

import { useState } from "react";
import Link from "next/link";

const opciones = [
  "Cuello y espalda",
  "Sobrecarga",
  "Tensión",
  "Alimentación",
  "Quiero una valoración",
  "No sé qué necesito",
];

export default function QueNecesitas() {
  const [seleccion, setSeleccion] = useState("");

  return (
    <section className="v10-needs" id="que-necesitas">
      <div className="v10-needs-intro">
        <span className="v10-needs-kanji">聴</span>

        <small>EMPIEZA POR TI</small>

        <h2>
          ¿Qué
          <em> necesitas?</em>
        </h2>

        <p>
          No tienes que saber si necesitas osteopatía, acupuntura
          u otra técnica. Empieza contándonos qué notas.
        </p>
      </div>

      <div className="v10-needs-panel">
        <p className="v10-needs-question">
          ¿Qué describe mejor lo que buscas?
        </p>

        <div className="v10-needs-options">
          {opciones.map((opcion, index) => (
            <button
              type="button"
              key={opcion}
              className={seleccion === opcion ? "active" : ""}
              onClick={() => setSeleccion(opcion)}
            >
              <small>
                {String(index + 1).padStart(2, "0")}
              </small>

              <span>{opcion}</span>

              <b>→</b>
            </button>
          ))}
        </div>

        {seleccion && (
          <div className="v10-needs-result">
            <div>
              <b>和</b>

              <p>
                <small>NO TIENES QUE ELEGIR UNA TÉCNICA</small>
                <strong>Cuéntaselo a Alberto.</strong>
                La valoración servirá para decidir cómo abordar tu caso.
              </p>
            </div>

            <Link
              href={`/reservar?motivo=${encodeURIComponent(seleccion)}`}
            >
              Continuar con la reserva
              <b>→</b>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
