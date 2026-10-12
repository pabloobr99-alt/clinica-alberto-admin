'use client';
import {useEffect,useState,useCallback,useRef} from 'react';
import Link from 'next/link';
import {supabase} from '@/app/lib/supabase';
type Payment={id:string;cobro_id:number;concepto:string;nombre:string;importe:number;metodo:string;cobrado_en:string;bono_id:number|null};
type Expense={id:number;fecha:string;concepto:string;importe:number};
type Finance={movimientos:Payment[];historico:number;pendiente:number;gastos:Expense[]};
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());
const money=(n:number)=>Number(n).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const field='rounded-xl border bg-white p-3';
export default function FinancePage(){
 const [from,setFrom]=useState(()=>today().slice(0,8)+'01'),[to,setTo]=useState(today),[method,setMethod]=useState('todos');
 const [data,setData]=useState<Finance|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const version=useRef(0);
 const load=useCallback(async()=>{
  const run=++version.current;setLoading(true);setError('');setData(null);
  try{const {data:{session}}=await supabase.auth.getSession();if(!session){window.location.assign('/login');return;}
   const r=await fetch(`/api/admin/finanzas?desde=${from}&hasta=${to}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
   if(r.status===403){window.location.assign('/login');return;}const d=await r.json();if(!r.ok)throw new Error(d.error);if(run===version.current)setData(d);
  }catch(e){if(run===version.current)setError(e instanceof Error?e.message:'Error al cargar');}finally{if(run===version.current)setLoading(false);}
 },[from,to]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void load();});return()=>{active=false;};},[load]);
 const payments=(data?.movimientos??[]).filter(m=>method==='todos'||m.metodo===method).sort((a,b)=>b.cobrado_en.localeCompare(a.cobrado_en));
 const cash=payments.reduce((s,m)=>s+Number(m.importe),0),expenses=(data?.gastos??[]).reduce((s,g)=>s+Number(g.importe),0);
 const methods=Object.entries(payments.reduce<Record<string,number>>((acc,m)=>{acc[m.metodo]=(acc[m.metodo]??0)+Number(m.importe);return acc;},{}));
 const exportCSV=()=>{
  const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const rows=[['Fecha y hora Madrid','Paciente','Concepto','Importe','Método','Cobro'],...payments.map(m=>[new Date(m.cobrado_en).toLocaleString('es-ES',{timeZone:'Europe/Madrid'}),m.nombre,m.concepto,Number(m.importe).toFixed(2),m.metodo,m.cobro_id])];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`caja-${from}-${to}.csv`;a.click();URL.revokeObjectURL(url);
 };
 return <main className="min-h-screen bg-slate-50 p-4 text-[#0A3653] sm:p-8"><div className="mx-auto max-w-6xl space-y-5"><header className="flex items-center justify-between"><h1 className="text-3xl font-bold">Finanzas</h1><Link className={field} href="/admin/control">Control del día</Link></header><section className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5"><label>Desde<input className={`${field} block`} type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input className={`${field} block`} type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label>Método<select className={`${field} block`} value={method} onChange={e=>setMethod(e.target.value)}>{['todos','efectivo','tarjeta','bizum','transferencia','otro'].map(m=><option key={m}>{m}</option>)}</select></label><button className={field} disabled={loading} onClick={()=>void load()}>Actualizar</button><button className={field} disabled={loading||!data} onClick={exportCSV}>Exportar ingresos</button></section>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{loading?<p>Cargando finanzas…</p>:data&&<><section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Ingresos del periodo',cash],['Gastos del periodo',expenses],['Saldo del periodo',cash-expenses],['Pendiente total',data.pendiente]].map(([label,n])=><div key={String(label)} className="rounded-2xl bg-white p-5"><p>{label}</p><strong className="text-2xl">{money(Number(n))}</strong></div>)}</section><p className="rounded-xl bg-amber-50 p-4 text-amber-950">Saldo histórico conservado: <strong>{money(data.historico)}</strong>. Los registros antiguos no contienen las fechas individuales de cada ingreso y quedan fuera de la caja por periodo. Los ingresos nuevos se contabilizan por su fecha y hora de cobro en Madrid.</p><section className="rounded-2xl bg-white p-5"><h2 className="mb-3 text-xl font-bold">Ingresos por método</h2>{methods.map(([m,n])=><p key={m} className="flex justify-between border-b py-2"><span>{m}</span><strong>{money(n)}</strong></p>)}</section><section className="rounded-2xl bg-white p-5"><h2 className="mb-3 text-xl font-bold">Cada ingreso</h2><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr>{['Fecha y hora','Paciente','Concepto','Método','Importe'].map(t=><th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>{payments.map(m=><tr key={m.id} className="border-t"><td className="p-3">{new Date(m.cobrado_en).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}</td><td className="p-3">{m.nombre||'Sin ficha'}</td><td className="p-3">{m.concepto}{m.bono_id?' · Bono':''}</td><td className="p-3">{m.metodo}</td><td className="p-3">{money(m.importe)}</td></tr>)}</tbody></table>{!payments.length&&<p className="p-3">Sin ingresos en este periodo.</p>}</div></section><section className="rounded-2xl bg-white p-5"><h2 className="font-bold">Gastos</h2>{data.gastos.map(g=><p key={g.id} className="flex justify-between border-b py-2"><span>{g.fecha} · {g.concepto}</span><strong>{money(g.importe)}</strong></p>)}</section></>}
 </div></main>;
}
