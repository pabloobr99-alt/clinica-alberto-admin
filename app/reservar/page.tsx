"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Paso = 1 | 2 | 3 | 4;

type Reserva = {
  nombre: string;
  telefono: string;
  email: string;
  motivo: string;
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function fechaLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function bonito(fecha: string) {
  const d = new Date(`${fecha}T12:00:00`);

  return `${DIAS[d.getDay()]} ${d.getDate()} de ${
    MESES[d.getMonth()]
  }`;
}

export default function ReservarPage() {
  const [paso, setPaso] = useState<Paso>(1);

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");

  const [horarios, setHorarios] = useState<string[]>([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const [reserva, setReserva] = useState<Reserva>({
    nombre: "",
    telefono: "",
    email: "",
    motivo: "",
  });

  const dias = useMemo(() => {
    const resultado = [];
    const hoy = new Date();

    hoy.setHours(12, 0, 0, 0);

    for (let i = 0; i < 21; i++) {
      const date = new Date(hoy);
      date.setDate(hoy.getDate() + i);

      resultado.push({
        value: fechaLocal(date),
        numero: date.getDate(),
        dia: DIAS[date.getDay()].slice(0, 3),
        mes: MESES[date.getMonth()].slice(0, 3),
      });
    }

    return resultado;
  }, []);

  useEffect(() => {
    if (!fecha) {
      setHorarios([]);
      return;
    }

    let activo = true;

    async function cargar() {
      setCargandoHoras(true);
      setError("");
      setHora("");

      try {
        const respuesta = await fetch(
          `/api/disponibilidad?fecha=${encodeURIComponent(fecha)}`,
          {
            cache: "no-store",
          }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se ha podido consultar la agenda."
          );
        }

        if (activo) {
          setHorarios(datos.horarios ?? []);
        }
      } catch (err) {
        if (activo) {
          setHorarios([]);
          setError(
            err instanceof Error
              ? err.message
              : "No se ha podido consultar la agenda."
          );
        }
      } finally {
        if (activo) {
          setCargandoHoras(false);
        }
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, [fecha]);

  function actualizar(
    campo: keyof Reserva,
    valor: string
  ) {
    setReserva((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function elegirFecha(nuevaFecha: string) {
    setFecha(nuevaFecha);
    setHora("");
    setError("");
    setPaso(2);
  }

  function elegirHora(nuevaHora: string) {
    setHora(nuevaHora);
    setError("");
    setPaso(3);
  }

  async function confirmar(event: FormEvent) {
    event.preventDefault();

    setError("");

    if (
      !reserva.nombre.trim() ||
      !reserva.telefono.trim() ||
      !reserva.email.trim() ||
      !reserva.motivo.trim()
    ) {
      setError("Completa todos los campos.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/reservar", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...reserva,
          fecha,
          hora,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se ha podido registrar la cita."
        );
      }

      setPaso(4);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido registrar la cita."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="reserva-v2">
      <header className="reserva-v2__header">
        <Link href="/" className="reserva-v2__brand">
          <img
            src="/logo-alberto.png"
            alt="Alberto Matamoros"
          />

          <span>
            <strong>Alberto Matamoros</strong>
            <small>Terapias Naturales y Equilibrio</small>
          </span>
        </Link>

        <Link href="/" className="reserva-v2__back">
          <span>←</span>
          Volver
        </Link>
      </header>

      <section className="reserva-v2__layout">
        <aside className="reserva-v2__intro">
          <span className="reserva-v2__kanji">予約</span>

          <span className="reserva-v2__eyebrow">
            RESERVA ONLINE
          </span>

          <h1>
            Tu momento,
            <em> a tu ritmo.</em>
          </h1>

          <p className="reserva-v2__lead">
            Escoge cuándo venir. No necesitas saber qué
            tratamiento elegir: primero escuchamos qué te
            ocurre y después valoramos el abordaje.
          </p>

          <div className="reserva-v2__steps">
            <div className={paso >= 1 ? "active" : ""}>
              <span>01</span>
              <p>
                <strong>Día</strong>
                Elige cuándo venir.
              </p>
            </div>

            <div className={paso >= 2 ? "active" : ""}>
              <span>02</span>
              <p>
                <strong>Hora</strong>
                Consulta los huecos.
              </p>
            </div>

            <div className={paso >= 3 ? "active" : ""}>
              <span>03</span>
              <p>
                <strong>Tú</strong>
                Cuéntanos qué necesitas.
              </p>
            </div>
          </div>

          <div className="reserva-v2__philosophy">
            <span>聴</span>

            <p>
              <small>ESCUCHAR ANTES DE TRATAR</small>
              Cada cita comienza entendiendo tu caso.
            </p>
          </div>
        </aside>

        <div className="reserva-v2__card">
          {paso !== 4 && (
            <div className="reserva-v2__cardhead">
              <div>
                <span>AGENDA</span>

                <h2>
                  {paso === 1 && "Elige tu día"}
                  {paso === 2 && "Elige tu hora"}
                  {paso === 3 && "Cuéntanos sobre ti"}
                </h2>
              </div>

              <div className="reserva-v2__live">
                <i />
                Online
              </div>
            </div>
          )}

          {paso === 1 && (
            <>
              <div className="reserva-v2__month">
                Próximas 3 semanas
              </div>

              <div className="reserva-v2__days">
                {dias.map((dia) => (
                  <button
                    key={dia.value}
                    type="button"
                    className={
                      fecha === dia.value
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      elegirFecha(dia.value)
                    }
                  >
                    <small>{dia.dia}</small>
                    <strong>{dia.numero}</strong>
                    <span>{dia.mes}</span>
                  </button>
                ))}
              </div>

              <div className="reserva-v2__hint">
                <span>和</span>

                <p>
                  Selecciona un día para consultar la
                  disponibilidad real.
                </p>
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <button
                type="button"
                className="reserva-v2__change"
                onClick={() => setPaso(1)}
              >
                ← Cambiar día
              </button>

              <div className="reserva-v2__selecteddate">
                <small>HAS ELEGIDO</small>
                <strong>{bonito(fecha)}</strong>
              </div>

              {cargandoHoras ? (
                <div className="reserva-v2__loading">
                  <i />
                  Consultando agenda...
                </div>
              ) : horarios.length ? (
                <div className="reserva-v2__times">
                  {horarios.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={
                        hora === item
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        elegirHora(item)
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="reserva-v2__empty">
                  <span>静</span>

                  <h3>Sin huecos disponibles</h3>

                  <p>
                    Prueba con otro día de la agenda.
                  </p>

                  <button
                    type="button"
                    onClick={() => setPaso(1)}
                  >
                    Elegir otro día
                  </button>
                </div>
              )}
            </>
          )}

          {paso === 3 && (
            <form
              className="reserva-v2__form"
              onSubmit={confirmar}
            >
              <button
                type="button"
                className="reserva-v2__change"
                onClick={() => setPaso(2)}
              >
                ← Cambiar hora
              </button>

              <div className="reserva-v2__summary">
                <span>予約</span>

                <p>
                  <small>TU CITA</small>
                  <strong>
                    {bonito(fecha)} · {hora}
                  </strong>
                </p>
              </div>

              <label>
                <span>Nombre y apellidos</span>

                <input
                  required
                  autoComplete="name"
                  value={reserva.nombre}
                  onChange={(event) =>
                    actualizar(
                      "nombre",
                      event.target.value
                    )
                  }
                  placeholder="Tu nombre"
                />
              </label>

              <div className="reserva-v2__formrow">
                <label>
                  <span>Teléfono</span>

                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={reserva.telefono}
                    onChange={(event) =>
                      actualizar(
                        "telefono",
                        event.target.value
                      )
                    }
                    placeholder="600 000 000"
                  />
                </label>

                <label>
                  <span>Email</span>

                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={reserva.email}
                    onChange={(event) =>
                      actualizar(
                        "email",
                        event.target.value
                      )
                    }
                    placeholder="tu@email.com"
                  />
                </label>
              </div>

              <label>
                <span>¿Qué te ocurre?</span>

                <textarea
                  required
                  rows={5}
                  value={reserva.motivo}
                  onChange={(event) =>
                    actualizar(
                      "motivo",
                      event.target.value
                    )
                  }
                  placeholder="Cuéntanos brevemente qué notas, dónde tienes molestias o qué necesitas valorar..."
                />
              </label>

              <p className="reserva-v2__privacy">
                Utilizaremos estos datos únicamente para
                gestionar tu solicitud de cita.
              </p>

              {error && (
                <div className="reserva-v2__error">
                  {error}
                </div>
              )}

              <button
                className="reserva-v2__submit"
                type="submit"
                disabled={enviando}
              >
                {enviando
                  ? "Reservando..."
                  : "Confirmar cita"}

                {!enviando && <span>→</span>}
              </button>
            </form>
          )}

          {paso === 4 && (
            <div className="reserva-v2__success">
              <div className="reserva-v2__successmark">
                <span>✓</span>
              </div>

              <span className="reserva-v2__successkanji">
                和
              </span>

              <small>CITA REGISTRADA</small>

              <h2>Nos vemos pronto.</h2>

              <p>
                Tu cita para el{" "}
                <strong>{bonito(fecha)}</strong> a las{" "}
                <strong>{hora}</strong> ha quedado
                registrada.
              </p>

              <div className="reserva-v2__successdata">
                <span>
                  <small>PACIENTE</small>
                  {reserva.nombre}
                </span>

                <span>
                  <small>FECHA</small>
                  {bonito(fecha)}
                </span>

                <span>
                  <small>HORA</small>
                  {hora}
                </span>
              </div>

              <Link
                href="/"
                className="reserva-v2__home"
              >
                Volver a la clínica
                <span>→</span>
              </Link>
            </div>
          )}

          {error && paso !== 3 && (
            <div className="reserva-v2__error reserva-v2__error--outside">
              {error}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
