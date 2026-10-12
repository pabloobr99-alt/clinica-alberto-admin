import { NextResponse } from 'next/server';
import {controlAdmin,fechaValida,sinCache} from '@/app/lib/control-admin';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 try {
  const db=await controlAdmin(request);if(!db)return NextResponse.json({error:'No autorizado'},{status:403,headers:sinCache});
  const url=new URL(request.url),desde=url.searchParams.get('desde')??'',hasta=url.searchParams.get('hasta')??'';
  if(!fechaValida(desde)||!fechaValida(hasta)||desde>hasta)return NextResponse.json({error:'Periodo no válido'},{status:400});
  // The offset is calculated by PostgreSQL, including DST boundaries.
  const {data,error}=await db.rpc('control_finanzas',{p_desde:desde,p_hasta:hasta});
  if(error)throw error;
  return NextResponse.json(data,{headers:sinCache});
 }catch{return NextResponse.json({error:'No se pudieron consultar las finanzas'},{status:503,headers:sinCache});}
}
