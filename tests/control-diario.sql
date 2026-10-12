BEGIN;
DO $$
DECLARE
 k text:='manual:'||gen_random_uuid(); k2 text:='manual:'||gen_random_uuid();
 req uuid:=gen_random_uuid(); payreq uuid:=gen_random_uuid();
 payload jsonb; r jsonb; c bigint; pid bigint; bid bigint; n integer; old numeric;
BEGIN
 SELECT sum(importe_pagado) INTO old FROM public.cobros;
 payload:=jsonb_build_object('accion','crear_cobro','clave',k,'nombre_agenda','Prueba transaccional','fecha_cita','2026-10-15','hora','10:00','importe',60,'cantidad',20,'metodo','efectivo','cobrado_local','2026-10-10T23:59');
 r:=public.control_diario_accion(req,payload);c:=(r->>'cobro_id')::bigint;
 PERFORM public.control_diario_accion(req,payload);
 IF (SELECT count(*) FROM public.cobros WHERE clave_cita=k)<>1 OR (SELECT count(*) FROM public.pagos_movimientos WHERE cobro_id=c)<>1 THEN RAISE EXCEPTION 'Cobro duplicado'; END IF;
 IF (SELECT paciente_id FROM public.cobros WHERE id=c) IS NOT NULL THEN RAISE EXCEPTION 'Cobro sin ficha no permitido'; END IF;
 IF (SELECT sum(importe) FROM public.pagos_movimientos WHERE cobro_id=c AND (cobrado_en AT TIME ZONE 'Europe/Madrid')::date='2026-10-10')<>20 THEN RAISE EXCEPTION 'Fecha incorrecta del anticipo'; END IF;
 r:=public.control_diario_accion(gen_random_uuid(),jsonb_build_object('accion','crear_ficha','clave',k,'nombre','Prueba transaccional','fecha_cita','2026-10-15'));
 pid:=(r->>'paciente_id')::bigint;
 IF (SELECT paciente_id FROM public.cobros WHERE id=c)<>pid OR (SELECT count(*) FROM public.pagos_movimientos WHERE cobro_id=c)<>1 THEN RAISE EXCEPTION 'Transferencia duplicada o incorrecta'; END IF;
 payload:=jsonb_build_object('accion','pagar','clave',k,'paciente_id',pid,'cobro_id',c,'cantidad',40,'metodo','tarjeta','cobrado_local','2026-10-11T00:01');
 PERFORM public.control_diario_accion(payreq,payload);PERFORM public.control_diario_accion(payreq,payload);
 IF (SELECT importe_pagado FROM public.cobros WHERE id=c)<>60 OR (SELECT count(*) FROM public.pagos_movimientos WHERE cobro_id=c)<>2 THEN RAISE EXCEPTION 'Pago parcial duplicado'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pagos_movimientos WHERE cobro_id=c AND importe=40 AND metodo='tarjeta' AND (cobrado_en AT TIME ZONE 'Europe/Madrid')::date='2026-10-11') THEN RAISE EXCEPTION 'Método o fecha no preservados'; END IF;
 BEGIN
  PERFORM public.control_diario_accion(gen_random_uuid(),payload||'{"cantidad":1}');
  RAISE EXCEPTION 'Se aceptó un sobrepago' USING ERRCODE='XX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN
  PERFORM public.control_diario_accion(payreq,payload||'{"cantidad":1}');
  RAISE EXCEPTION 'Se aceptó otra carga con la misma solicitud' USING ERRCODE='XX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 r:=public.control_diario_accion(gen_random_uuid(),jsonb_build_object('accion','crear_bono','paciente_id',pid,'importe',100,'cantidad',30,'metodo','bizum','cobrado_local','2026-10-11T10:00','sesiones',2,'concepto','Bono prueba'));
 bid:=(r->>'bono_id')::bigint;
 payload:=jsonb_build_object('accion','consumir_bono','clave',k2,'paciente_id',pid,'bono_id',bid,'nombre_agenda','Prueba bono','fecha_cita','2026-10-12','hora','11:00');
 PERFORM public.control_diario_accion(gen_random_uuid(),payload);PERFORM public.control_diario_accion(gen_random_uuid(),payload);
 IF (SELECT sesiones_usadas FROM public.bonos WHERE id=bid)<>1 OR (SELECT count(*) FROM public.bono_sesiones WHERE clave_cita=k2)<>1 THEN RAISE EXCEPTION 'Consumo duplicado'; END IF;
 BEGIN
  PERFORM public.control_diario_accion(gen_random_uuid(),jsonb_build_object('accion','crear_cobro','clave',k2,'importe',35,'cantidad',0));
  RAISE EXCEPTION 'Se permitió cobrar sesión de bono' USING ERRCODE='XX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 SELECT count(*) INTO n FROM public.bonos;
 BEGIN
  PERFORM public.control_diario_accion(gen_random_uuid(),jsonb_build_object('accion','crear_bono','paciente_id',pid,'importe',100,'cantidad',30,'metodo','invalido','sesiones',2));
  RAISE EXCEPTION 'Método inválido aceptado' USING ERRCODE='XX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF (SELECT count(*) FROM public.bonos)<>n THEN RAISE EXCEPTION 'Operación incompleta persistió'; END IF;
 PERFORM public.control_diario_accion(gen_random_uuid(),jsonb_build_object('accion','guardar_notas','paciente_id',pid,'notas','Nota de prueba'));
 PERFORM public.control_diario_accion(gen_random_uuid(),jsonb_build_object('accion','guardar_historial','paciente_id',pid,'motivo','Prueba','tratamiento','Prueba'));
 IF has_function_privilege('anon','public.control_diario_accion(uuid,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.control_diario_accion(uuid,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Función accesible sin autorización'; END IF;
 IF (SELECT sum(importe_pagado) FROM public.cobros WHERE id NOT IN (c,(r->>'cobro_id')::bigint))<>old THEN RAISE EXCEPTION 'Saldos existentes modificados'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: anticipo, parcial, fechas, métodos, idempotencia, vinculación, bono, atomicidad, permisos, preservación' as resultado;
