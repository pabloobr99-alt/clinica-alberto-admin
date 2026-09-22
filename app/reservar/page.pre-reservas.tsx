import Link from "next/link";

export default function ReservarPage() {
  return (
    <main className="booking-page">
      <header className="booking-header">
        <Link href="/" className="booking-brand">
          <span className="booking-logo">AM</span>

          <span>
            <strong>Alberto Matamoros</strong>
            <small>Terapias Naturales y Equilibrio</small>
          </span>
        </Link>

        <Link href="/" className="booking-back">
          ← Volver
        </Link>
      </header>

      <section className="booking-hero">
        <div className="booking-decoration booking-decoration-one" />
        <div className="booking-decoration booking-decoration-two" />

        <div className="booking-intro">
          <span className="booking-eyebrow">RESERVA ONLINE</span>

          <h1>
            Reserva tu
            <em> momento.</em>
          </h1>

          <p>
            Elige el día y la hora que mejor te venga. La cita quedará
            reservada automáticamente.
          </p>

          <div className="booking-details">
            <div>
              <span>01</span>
              <p>
                <strong>Elige tu cita</strong>
                Consulta los horarios disponibles.
              </p>
            </div>

            <div>
              <span>02</span>
              <p>
                <strong>Reserva</strong>
                Completa tus datos.
              </p>
            </div>

            <div>
              <span>03</span>
              <p>
                <strong>Listo</strong>
                Tu cita queda registrada.
              </p>
            </div>
          </div>
        </div>

        <div className="booking-widget-shell">
          <div className="booking-widget-top">
            <div>
              <span className="booking-widget-label">AGENDA ONLINE</span>
              <h2>Elige tu cita</h2>
            </div>

            <span className="booking-live">
              <i />
              Disponibilidad
            </span>
          </div>

          {/*
            AQUÍ INSERTAREMOS EL WIDGET / ENLACE DE BOOKSY.

            Booksy será la agenda principal.

            Las reservas realizadas desde esta página se gestionarán
            mediante Booksy para compartir la misma disponibilidad.
          */}

          <div id="booksy-widget" className="booksy-placeholder">
            <div className="booksy-placeholder-symbol">
              <span>AM</span>
            </div>

            <h3>Agenda de reservas</h3>

            <p>
              La agenda online estará disponible aquí.
            </p>

            <div className="booksy-placeholder-line" />
            <div className="booksy-placeholder-line short" />
          </div>

          <div className="booking-note">
            <span>◯</span>
            <p>
              No necesitas saber qué técnica elegir.
              <strong> Cuéntanos qué te ocurre y valoraremos tu caso.</strong>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
