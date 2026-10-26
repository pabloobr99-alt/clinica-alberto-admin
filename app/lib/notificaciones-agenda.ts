import "server-only";
import { obtenerSupabasePrivado } from "@/app/lib/google-calendar-security";

const ZONA = "Europe/Madrid";
export function horaLocal() {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", hourCycle:"h23" }).formatToParts(new Date());
  const get = (t: string) => p.find(x => x.type === t)?.value ?? "";
  return { fecha: `${get("year")}-${get("month")}-${get("day")}`, hora: Number(get("hour")) };
}

export async function enviarAgenda(fecha: string, motivo: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha inválida");
  const db = obtenerSupabasePrivado();
  const { data, error } = await db.from("citas").select("id,nombre,fecha,hora,estado").eq("fecha", fecha).neq("estado", "cancelada").order("hora");
  if (error) throw error;
  const citas = data ?? [];
  const resumen = citas.map((c,i) => `${i+1}. ${String(c.hora).slice(0,5)} - ${c.nombre}`).join("\n") || "No hay citas.";
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      from: "Clínica Alberto <agenda@osteopatiaalbertomatamoros.com>",
      to: ["albertommtrabajo@gmail.com"],
      subject: `Agenda ${fecha}: ${citas.length} citas`,
      text: `Agenda del ${fecha}\nMotivo: ${motivo}\nTotal: ${citas.length}\n\n${resumen}`
    })
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
  return { total: citas.length };
}
