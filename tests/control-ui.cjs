const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 const page=await browser.newPage({viewport:{width:1024,height:768}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const date='2026-10-12';let pid=null,charges=[],payments=[],used=false,requests=[];
 const patient={id:90001,nombre:'Paciente de prueba',notas_generales:'Nota previa',telefono:'600000000'};
 const jwt=['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',Buffer.from(JSON.stringify({sub:'00000000-0000-4000-8000-000000000001',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'testsignature'].join('.');
 const session={access_token:jwt,refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated'}};
 await page.context().addCookies([{name:'sb-khvmvmdmfmloadmjryro-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:'http://127.0.0.1:3100'}]);
 await page.route('https://khvmvmdmfmloadmjryro.supabase.co/**',route=>route.fulfill({json:{user:patient}}));
 await page.route('**/api/admin/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(req.method()==='POST'){
   const p=req.postDataJSON();requests.push(p);
   if(p.accion==='crear_cobro') {charges=[{id:100001,clave_cita:'google:evento-prueba',paciente_id:pid,cita_id:null,bono_id:null,concepto:p.concepto,importe:p.importe,importe_pagado:p.cantidad,estado:'parcial'}];payments=[{id:'p1',cobro_id:100001,importe:p.cantidad,metodo:p.metodo,cobrado_en:'2026-10-10T10:00:00Z',origen:'pago'}];}
   if(p.accion==='crear_ficha'){pid=patient.id;charges=charges.map(c=>({...c,paciente_id:pid}));}
   if(p.accion==='pagar'){charges=charges.map(c=>({...c,importe_pagado:60,estado:'pagado'}));payments.push({id:'p2',cobro_id:100001,importe:40,metodo:'tarjeta',cobrado_en:'2026-10-11T10:00:00Z',origen:'pago'});}
   if(p.accion==='consumir_bono')used=true;
   return route.fulfill({json:{ok:true,...(pid?{paciente_id:pid}:{})}});
  }
  if(url.pathname.endsWith('/google'))return route.fulfill({json:{eventos:[{id:'evento-prueba',nombre:'Paciente de prueba',hora:'10:00'},{id:'evento-bono',nombre:'Paciente de prueba',hora:'11:00'}]}});
  if(url.pathname.endsWith('/finanzas'))return route.fulfill({json:{movimientos:payments.map(m=>({...m,concepto:'Sesión',nombre:patient.nombre})),historico:510,pendiente:0,gastos:[]}});
  if(url.searchParams.has('pacienteId'))return route.fulfill({json:{paciente:patient,historial:[{id:1,fecha:date,motivo:'Dolor de espalda',tratamiento:'Tratamiento de prueba',observaciones:'Evolución'}],bonos:[{id:90001,nombre:'Bono prueba',sesiones_totales:5,sesiones_usadas:used?1:0,estado:'activo'}],cobros:charges,movimientos:payments}});
  return route.fulfill({json:{citas:[],contextos:pid?[{clave:'google:evento-prueba',paciente_id:pid,fecha:date,hora:'10:00',nombre:patient.nombre}]:[],vinculos:pid?[{evento_id:'evento-bono',paciente_id:pid}]:[],pacientes:[patient],cobros:charges,sesiones:used?[{id:1,clave_cita:'google:evento-bono',cita_id:null}]:[],movimientos:payments}});
 });
 await page.goto('http://127.0.0.1:3100/admin/control');
 page.on('console',m=>{if(m.type()==='error')console.error('browser:',m.text())});
 console.log('Control cargado');
 await page.getByRole('button',{name:/10:00 · Paciente/}).click();
 await page.getByLabel('Importe total (€)',{exact:true}).fill('60');
 await page.getByLabel('Importe recibido ahora (€)').fill('20');
 await page.getByLabel('Fecha y hora del ingreso').fill('2026-10-10T12:00');
 await page.getByRole('button',{name:'Guardar cobro',exact:true}).click();
 await page.getByText('Guardado correctamente.',{exact:true}).waitFor();
 assert.equal(charges.length,1);assert.equal(requests[0].cantidad,20);assert.match(requests[0].solicitud_id,/^[0-9a-f-]{36}$/);
 await page.getByRole('button',{name:'Ficha e historial',exact:true}).click();
 assert.equal(await page.getByLabel('Nombre',{exact:true}).inputValue(),'Paciente de prueba');
 await page.getByRole('button',{name:'Crear ficha y vincular cobros'}).click();
 await page.getByLabel('Notas generales').waitFor();
 assert.equal(await page.getByLabel('Notas generales').inputValue(),'Nota previa');
 assert.equal(charges.length,1);assert.equal(payments.length,1);
 await page.getByText('Dolor de espalda',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Cobrar',exact:true}).click();
 await page.getByLabel('Importe recibido ahora (€)').fill('40');
 await page.getByLabel('Método').selectOption('tarjeta');
 await page.getByRole('button',{name:'Registrar ingreso',exact:true}).click();
 await page.getByText('Guardado correctamente.',{exact:true}).waitFor();
 assert.equal(requests.at(-1).accion,'pagar');assert.equal(requests.at(-1).metodo,'tarjeta');
 await page.getByRole('button',{name:/11:00 · Paciente/}).click();
 await page.getByRole('button',{name:'Bonos',exact:true}).click();
 await page.getByLabel('Bono disponible').selectOption('90001');
 await page.getByRole('button',{name:'Descontar una sesión de esta cita'}).click();
 await page.getByRole('button',{name:'Sesión ya descontada'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Sesión ya descontada'}).isDisabled(),true);
 await page.screenshot({path:'../tablet-control.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('link',{name:'Finanzas',exact:true}).click();
 await page.getByRole('heading',{name:'Cada ingreso'}).waitFor();
 assert.equal(await page.locator('tbody tr').count(),2);
 assert.deepEqual(errors,[]);
 console.log('PASS: interfaz tablet, Google de lectura, anticipo, ficha precargada, vínculo sin duplicados, historial, pago parcial, bono único y Finanzas');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
