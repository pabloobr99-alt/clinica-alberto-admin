import 'server-only';
import { obtenerSupabasePrivado } from './google-calendar-security';
export async function controlAdmin(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !process.env.ADMIN_USER_ID) return null;
  const db = obtenerSupabasePrivado();
  const {data,error} = await db.auth.getUser(token);
  return !error && data.user?.id === process.env.ADMIN_USER_ID ? db : null;
}
export const sinCache = {'Cache-Control':'private, no-store'};
export function fechaValida(fecha: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && Number.isFinite(Date.parse(fecha+'T12:00:00Z')) && new Date(fecha+'T12:00:00Z').toISOString().slice(0,10)===fecha;
}
