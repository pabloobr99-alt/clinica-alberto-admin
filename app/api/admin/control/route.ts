import { NextResponse } from 'next/server';
import { controlAdmin,fechaValida,sinCache } from '@/app/lib/control-admin';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 try {
  const db=await controlAdmin(request);
  if(!db) return NextResponse.json({error:'No autorizado'},{status:403,headers:sinCache});
  const url=new URL(request.url),fecha=url.searchParams.get('fecha')??'';
  const pid=Number(url.searchParams.get('pacienteId'));
  if(pid>0) {
   const results=await Promise.all([
    db.from('pacientes').select('id,nombre,telefono,email,notas_generales').eq('id',pid).single(),
    db.from('historial_pacientes').select('*').eq('paciente_id',pid).order('fecha',{ascending:false}).limit(50),
    db.from('bonos').select('*').eq('paciente_id',pid).order('created_at',{ascending:false}).limit(201),
    db.from('cobros').select('*').eq('paciente_id',pid).order('created_at',{ascending:false}).limit(201)
   ]);
   if(results.some(r=>r.error)) throw new Error('No se pudo cargar la ficha');
   if((results[2].data?.length??0)>200||(results[3].data?.length??0)>200) return NextResponse.json({error:'Esta ficha necesita un informe paginado para mostrar todos sus cobros.'},{status:422,headers:sinCache});
   const ids=(results[3].data??[]).map(c=>c.id);
   const movimientos=ids.length?await db.from('pagos_movimientos').select('*').in('cobro_id',ids).order('registrado_en',{ascending:false}):{data:[],error:null};
   if(movimientos.error) throw new Error('No se pudieron cargar los pagos');
   return NextResponse.json({paciente:results[0].data,historial:results[1].data,bonos:results[2].data,cobros:results[3].data,movimientos:movimientos.data},{headers:sinCache});
  }
  if(!fechaValida(fecha)) return NextResponse.json({error:'Fecha no válida'},{status:400,headers:sinCache});
  const results=await Promise.all([
   db.from('citas').select('id,nombre,telefono,email,fecha,hora,motivo,estado,paciente_id,google_event_id').eq('fecha',fecha).order('hora'),
   db.from('control_agenda').select('*').eq('fecha',fecha),
   db.from('google_evento_paciente').select('evento_id,paciente_id'),
   db.from('pacientes').select('id,nombre,telefono').order('nombre').limit(1001)
  ]);
  if(results.some(r=>r.error)) throw new Error('No se pudo cargar el control diario');
  if((results[3].data?.length??0)>1000) throw new Error('La lista de pacientes necesita búsqueda paginada');
  const citas=results[0].data??[],contextos=results[1].data??[];
  const claves=contextos.map(c=>c.clave),ids=citas.map(c=>c.id);
  const [porClave,porCita,sesionesClave,sesionesCita]=await Promise.all([
   claves.length?db.from('cobros').select('*').in('clave_cita',claves):Promise.resolve({data:[],error:null}),
   ids.length?db.from('cobros').select('*').in('cita_id',ids):Promise.resolve({data:[],error:null}),
   claves.length?db.from('bono_sesiones').select('*').in('clave_cita',claves):Promise.resolve({data:[],error:null}),
   ids.length?db.from('bono_sesiones').select('*').in('cita_id',ids):Promise.resolve({data:[],error:null})
  ]);
  if([porClave,porCita,sesionesClave,sesionesCita].some(r=>r.error)) throw new Error('No se pudieron consultar los movimientos');
  const cobros=[...new Map([...(porClave.data??[]),...(porCita.data??[])].map(c=>[c.id,c])).values()];
  const sesiones=[...new Map([...(sesionesClave.data??[]),...(sesionesCita.data??[])].map(c=>[c.id,c])).values()];
  const movimientos=cobros.length?await db.from('pagos_movimientos').select('*').in('cobro_id',cobros.map(c=>c.id)).order('registrado_en',{ascending:false}):{data:[],error:null};
  if(movimientos.error) throw new Error('No se pudieron consultar los pagos');
  return NextResponse.json({citas,contextos,vinculos:results[2].data,pacientes:results[3].data,cobros,sesiones,movimientos:movimientos.data},{headers:sinCache});
 }catch {return NextResponse.json({error:'No se pudo cargar la información. Vuelve a intentarlo.'},{status:503,headers:sinCache});}
}
export async function POST(request:Request) {
 try {
  const db=await controlAdmin(request);
  if(!db) return NextResponse.json({error:'No autorizado'},{status:403,headers:sinCache});
  const {solicitud_id,...body}=await request.json();
  if(typeof solicitud_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(solicitud_id)) return NextResponse.json({error:'Solicitud no válida'},{status:400,headers:sinCache});
  if(JSON.stringify(body).length>30000) return NextResponse.json({error:'Los datos son demasiado largos'},{status:400,headers:sinCache});
  const {data,error}=await db.rpc('control_diario_accion',{p_id:solicitud_id,p:body});
  if(error) return NextResponse.json({error:error.code==='P0001'?error.message:'No se pudo guardar la operación. Revisa los datos.'},{status:409,headers:sinCache});
  return NextResponse.json(data,{headers:sinCache});
 }catch{return NextResponse.json({error:'No se pudo guardar la operación'},{status:503,headers:sinCache});}
}
