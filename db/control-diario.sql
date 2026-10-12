-- Additive upgrade: original patients, bookings, charges and tokens are retained.
ALTER TABLE public.cobros ALTER COLUMN paciente_id DROP NOT NULL;
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS clave_cita text;
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS nombre_agenda text;
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS registro_v2 boolean NOT NULL DEFAULT false;
ALTER TABLE public.bono_sesiones ADD COLUMN IF NOT EXISTS clave_cita text;
CREATE UNIQUE INDEX IF NOT EXISTS cobros_control_clave ON public.cobros(clave_cita) WHERE clave_cita IS NOT NULL AND estado <> 'cancelado' AND bono_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sesiones_control_clave ON public.bono_sesiones(clave_cita) WHERE clave_cita IS NOT NULL;
CREATE TABLE public.control_agenda (
 clave text PRIMARY KEY, nombre text NOT NULL, fecha date NOT NULL, hora text,
 cita_id bigint REFERENCES public.citas(id), evento_id text,
 paciente_id bigint REFERENCES public.pacientes(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX control_agenda_fecha ON public.control_agenda(fecha);
CREATE INDEX control_agenda_paciente ON public.control_agenda(paciente_id);
ALTER TABLE public.control_agenda ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pagos_movimientos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cobro_id bigint NOT NULL REFERENCES public.cobros(id),
 importe numeric(12,2) NOT NULL CHECK(importe > 0), metodo text,
 cobrado_en timestamptz, registrado_en timestamptz NOT NULL DEFAULT now(),
 origen text NOT NULL CHECK(origen IN ('pago','historico_sin_fecha')), solicitud_id uuid UNIQUE,
 CHECK((origen='pago' AND cobrado_en IS NOT NULL AND metodo IS NOT NULL) OR (origen='historico_sin_fecha' AND cobrado_en IS NULL))
);
CREATE INDEX pagos_movimientos_cobro ON public.pagos_movimientos(cobro_id);
CREATE INDEX pagos_movimientos_fecha ON public.pagos_movimientos(cobrado_en) WHERE origen='pago';
ALTER TABLE public.pagos_movimientos ENABLE ROW LEVEL SECURITY;
-- Opening balances have no invented payment time. They never enter daily cash.
INSERT INTO public.pagos_movimientos(cobro_id,importe,metodo,origen)
 SELECT id,importe_pagado,metodo_pago,'historico_sin_fecha' FROM public.cobros WHERE importe_pagado>0;
CREATE TABLE public.control_solicitudes (
 id uuid PRIMARY KEY, contenido jsonb NOT NULL, resultado jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.control_solicitudes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.control_agenda,public.pagos_movimientos,public.control_solicitudes FROM anon,authenticated;
GRANT ALL ON public.control_agenda,public.pagos_movimientos,public.control_solicitudes TO service_role;

CREATE FUNCTION public.control_diario_accion(p_id uuid,p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 v_acc text:=p->>'accion'; v_clave text:=nullif(p->>'clave','');
 v_ctx public.control_agenda%ROWTYPE; v_cita public.citas%ROWTYPE;
 v_cobro public.cobros%ROWTYPE; v_bono public.bonos%ROWTYPE;
 v_prev public.control_solicitudes%ROWTYPE;
 v_pid bigint:=nullif(p->>'paciente_id','')::bigint;
 v_cid bigint:=nullif(p->>'cobro_id','')::bigint;
 v_bid bigint:=nullif(p->>'bono_id','')::bigint;
 v_total numeric; v_pago numeric; v_momento timestamptz; v_metodo text;
 v_res jsonb; v_sesion bigint; v_fecha date; v_nombre text;
BEGIN
 IF p_id IS NULL OR v_acc IS NULL THEN RAISE EXCEPTION 'Solicitud no válida'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 SELECT * INTO v_prev FROM public.control_solicitudes WHERE id=p_id;
 IF FOUND THEN
   IF v_prev.contenido<>p THEN RAISE EXCEPTION 'La solicitud ya se utilizó con otros datos'; END IF;
   RETURN v_prev.resultado;
 END IF;
 IF v_clave IS NOT NULL THEN
   IF length(v_clave)>300 OR v_clave !~ '^(cita:[1-9][0-9]*|google:.+|manual:[a-zA-Z0-9-]+)$' THEN RAISE EXCEPTION 'Cita no válida'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(v_clave,1));
   IF v_clave LIKE 'cita:%' THEN
     SELECT * INTO v_cita FROM public.citas WHERE id=substring(v_clave from 6)::bigint FOR UPDATE;
     IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada'; END IF;
     IF v_cita.estado='cancelada' AND v_acc IN ('crear_cobro','consumir_bono') THEN RAISE EXCEPTION 'La cita está cancelada'; END IF;
     INSERT INTO public.control_agenda(clave,nombre,fecha,hora,cita_id,paciente_id)
       VALUES(v_clave,v_cita.nombre,v_cita.fecha::date,v_cita.hora,v_cita.id,v_cita.paciente_id) ON CONFLICT(clave) DO NOTHING;
   ELSE
    IF NOT EXISTS(SELECT 1 FROM public.control_agenda WHERE clave=v_clave) THEN
     INSERT INTO public.control_agenda(clave,nombre,fecha,hora,evento_id,paciente_id)
       VALUES(v_clave,coalesce(nullif(trim(p->>'nombre_agenda'),''),'Sesión'),(p->>'fecha_cita')::date,p->>'hora',
       CASE WHEN v_clave LIKE 'google:%' THEN substring(v_clave from 8) END,
       CASE WHEN v_clave LIKE 'google:%' THEN (SELECT paciente_id FROM public.google_evento_paciente WHERE evento_id=substring(v_clave from 8)) ELSE v_pid END)
       ON CONFLICT(clave) DO NOTHING;
    END IF;
   END IF;
   SELECT * INTO v_ctx FROM public.control_agenda WHERE clave=v_clave FOR UPDATE;
   IF v_ctx.paciente_id IS NOT NULL THEN
     IF v_pid IS NOT NULL AND v_pid<>v_ctx.paciente_id AND v_acc<>'vincular_ficha' THEN RAISE EXCEPTION 'La ficha no coincide con la cita'; END IF;
     v_pid:=v_ctx.paciente_id;
   END IF;
 END IF;
 IF v_acc IN ('crear_ficha','vincular_ficha') THEN
   IF v_clave IS NULL THEN RAISE EXCEPTION 'Selecciona una cita'; END IF;
   IF v_ctx.paciente_id IS NOT NULL THEN
     IF v_acc='vincular_ficha' AND (p->>'paciente_id')::bigint<>v_ctx.paciente_id THEN RAISE EXCEPTION 'La cita ya tiene ficha; revisa el vínculo'; END IF;
     v_pid:=v_ctx.paciente_id;
   ELSIF v_acc='crear_ficha' THEN
     v_nombre:=trim(coalesce(nullif(p->>'nombre',''),v_ctx.nombre));
     IF length(v_nombre)<2 OR length(v_nombre)>200 THEN RAISE EXCEPTION 'Nombre no válido'; END IF;
     INSERT INTO public.pacientes(nombre,telefono,email) VALUES(v_nombre,nullif(trim(p->>'telefono'),''),nullif(trim(p->>'email'),'')) RETURNING id INTO v_pid;
   ELSE
     v_pid:=(p->>'paciente_id')::bigint;
     IF NOT EXISTS(SELECT 1 FROM public.pacientes WHERE id=v_pid) THEN RAISE EXCEPTION 'Ficha no encontrada'; END IF;
   END IF;
   IF EXISTS(SELECT 1 FROM public.cobros WHERE (clave_cita=v_clave OR (v_ctx.cita_id IS NOT NULL AND cita_id=v_ctx.cita_id)) AND paciente_id IS NOT NULL AND paciente_id<>v_pid) THEN RAISE EXCEPTION 'Hay cobros de otra ficha'; END IF;
   UPDATE public.control_agenda SET paciente_id=v_pid WHERE clave=v_clave;
   UPDATE public.cobros SET paciente_id=v_pid WHERE clave_cita=v_clave OR (v_ctx.cita_id IS NOT NULL AND cita_id=v_ctx.cita_id);
   IF v_ctx.cita_id IS NOT NULL THEN UPDATE public.citas SET paciente_id=v_pid WHERE id=v_ctx.cita_id; END IF;
   IF v_ctx.evento_id IS NOT NULL THEN
     INSERT INTO public.google_evento_paciente(evento_id,paciente_id,fecha,hora,titulo)
      VALUES(v_ctx.evento_id,v_pid,v_ctx.fecha,v_ctx.hora,v_ctx.nombre)
      ON CONFLICT(evento_id) DO UPDATE SET paciente_id=excluded.paciente_id;
   END IF;
   v_res:=jsonb_build_object('ok',true,'paciente_id',v_pid);
 ELSIF v_acc IN ('crear_cobro','crear_bono') THEN
   v_total:=(p->>'importe')::numeric;
   v_pago:=coalesce((p->>'cantidad')::numeric,0);
   IF v_total IS NULL OR v_total<0 OR v_total>999999 OR v_total<>round(v_total,2) OR v_pago<0 OR v_pago>v_total OR v_pago<>round(v_pago,2) THEN RAISE EXCEPTION 'Importes no válidos'; END IF;
   IF v_pid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.pacientes WHERE id=v_pid) THEN RAISE EXCEPTION 'Ficha no encontrada'; END IF;
   IF v_acc='crear_bono' THEN
     IF v_pid IS NULL THEN RAISE EXCEPTION 'Crea o vincula la ficha para el bono'; END IF;
     IF (p->>'sesiones')::integer NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Número de sesiones no válido'; END IF;
     INSERT INTO public.bonos(paciente_id,nombre,sesiones_totales,precio,fecha_compra)
       VALUES(v_pid,coalesce(nullif(trim(p->>'concepto'),''),'Bono de sesiones'),(p->>'sesiones')::integer,v_total,(now() AT TIME ZONE 'Europe/Madrid')::date) RETURNING id INTO v_bid;
   ELSE
     IF v_clave IS NOT NULL AND EXISTS(SELECT 1 FROM public.bono_sesiones WHERE clave_cita=v_clave OR (v_ctx.cita_id IS NOT NULL AND cita_id=v_ctx.cita_id)) THEN RAISE EXCEPTION 'La sesión ya se descontó de un bono'; END IF;
     IF v_clave IS NOT NULL AND EXISTS(SELECT 1 FROM public.cobros WHERE estado<>'cancelado' AND bono_id IS NULL AND (clave_cita=v_clave OR (v_ctx.cita_id IS NOT NULL AND cita_id=v_ctx.cita_id))) THEN RAISE EXCEPTION 'La cita ya tiene un cobro; registra el pago sobre él'; END IF;
   END IF;
   INSERT INTO public.cobros(paciente_id,bono_id,cita_id,clave_cita,nombre_agenda,concepto,importe,importe_pagado,estado,fecha,registro_v2)
     VALUES(v_pid,CASE WHEN v_acc='crear_bono' THEN v_bid END,CASE WHEN v_acc='crear_cobro' THEN v_ctx.cita_id END,
       CASE WHEN v_acc='crear_cobro' THEN v_clave END,v_ctx.nombre,coalesce(nullif(trim(p->>'concepto'),''),'Sesión'),v_total,0,
       CASE WHEN v_total=0 THEN 'pagado' ELSE 'pendiente' END,(now() AT TIME ZONE 'Europe/Madrid')::date,true) RETURNING * INTO v_cobro;
   v_cid:=v_cobro.id;
   v_res:=jsonb_build_object('ok',true,'cobro_id',v_cid,'bono_id',v_bid,'paciente_id',v_pid);
 ELSIF v_acc='pagar' THEN
   SELECT * INTO v_cobro FROM public.cobros WHERE id=v_cid FOR UPDATE;
   IF NOT FOUND OR v_cobro.estado='cancelado' THEN RAISE EXCEPTION 'Cobro no disponible'; END IF;
   IF v_pid IS NOT NULL AND v_cobro.paciente_id IS DISTINCT FROM v_pid THEN RAISE EXCEPTION 'El cobro no corresponde a esta ficha'; END IF;
   IF v_clave IS NOT NULL AND v_cobro.clave_cita IS DISTINCT FROM v_clave AND NOT (v_ctx.cita_id IS NOT NULL AND v_cobro.cita_id=v_ctx.cita_id) THEN RAISE EXCEPTION 'El cobro no corresponde a esta cita'; END IF;
   v_pago:=CASE WHEN p->>'completar'='true' THEN v_cobro.importe-v_cobro.importe_pagado ELSE (p->>'cantidad')::numeric END;
   v_res:=jsonb_build_object('ok',true,'cobro_id',v_cid);
 ELSIF v_acc='consumir_bono' THEN
   IF v_pid IS NULL OR v_clave IS NULL THEN RAISE EXCEPTION 'Selecciona ficha y cita'; END IF;
   IF EXISTS(SELECT 1 FROM public.bono_sesiones WHERE clave_cita=v_clave OR (v_ctx.cita_id IS NOT NULL AND cita_id=v_ctx.cita_id)) THEN
     SELECT id INTO v_sesion FROM public.bono_sesiones WHERE clave_cita=v_clave OR (v_ctx.cita_id IS NOT NULL AND cita_id=v_ctx.cita_id) LIMIT 1;
     v_res:=jsonb_build_object('ok',true,'sesion_id',v_sesion,'ya_registrada',true);
   ELSE
     IF EXISTS(SELECT 1 FROM public.cobros WHERE estado<>'cancelado' AND bono_id IS NULL AND (clave_cita=v_clave OR (v_ctx.cita_id IS NOT NULL AND cita_id=v_ctx.cita_id))) THEN RAISE EXCEPTION 'La sesión ya tiene cobro'; END IF;
     SELECT * INTO v_bono FROM public.bonos WHERE id=v_bid FOR UPDATE;
     IF NOT FOUND OR v_bono.paciente_id<>v_pid OR v_bono.estado<>'activo' OR v_bono.sesiones_usadas>=v_bono.sesiones_totales THEN RAISE EXCEPTION 'Bono no disponible'; END IF;
     INSERT INTO public.bono_sesiones(bono_id,paciente_id,cita_id,clave_cita,fecha,observaciones)
      VALUES(v_bid,v_pid,v_ctx.cita_id,v_clave,v_ctx.fecha,nullif(p->>'observaciones','')) RETURNING id INTO v_sesion;
     UPDATE public.bonos SET sesiones_usadas=sesiones_usadas+1,estado=CASE WHEN sesiones_usadas+1=sesiones_totales THEN 'completado' ELSE 'activo' END WHERE id=v_bid;
     v_res:=jsonb_build_object('ok',true,'sesion_id',v_sesion);
   END IF;
 ELSIF v_acc='guardar_notas' THEN
   IF v_pid IS NULL THEN RAISE EXCEPTION 'Selecciona una ficha'; END IF;
   UPDATE public.pacientes SET notas_generales=p->>'notas' WHERE id=v_pid;
   IF NOT FOUND THEN RAISE EXCEPTION 'Ficha no encontrada'; END IF;
   v_res:=jsonb_build_object('ok',true);
 ELSIF v_acc='guardar_historial' THEN
   IF v_pid IS NULL THEN RAISE EXCEPTION 'Selecciona una ficha'; END IF;
   INSERT INTO public.historial_pacientes(paciente_id,fecha,motivo,tratamiento,observaciones)
    VALUES(v_pid,coalesce(v_ctx.fecha,(now() AT TIME ZONE 'Europe/Madrid')::date),p->>'motivo',p->>'tratamiento',p->>'observaciones');
   v_res:=jsonb_build_object('ok',true);
 ELSE RAISE EXCEPTION 'Acción no válida';
 END IF;
 IF v_acc IN ('pagar','crear_cobro','crear_bono') AND coalesce(v_pago,0)>0 THEN
   SELECT * INTO v_cobro FROM public.cobros WHERE id=v_cid FOR UPDATE;
   IF v_pago IS NULL OR v_pago<=0 OR v_pago<>round(v_pago,2) OR v_pago>v_cobro.importe-v_cobro.importe_pagado THEN RAISE EXCEPTION 'El pago supera lo pendiente o no es válido'; END IF;
   v_momento:=coalesce(nullif(p->>'cobrado_local','')::timestamp AT TIME ZONE 'Europe/Madrid',nullif(p->>'cobrado_en','')::timestamptz,now());
   IF v_momento>now()+interval '5 minutes' THEN RAISE EXCEPTION 'La fecha del pago no puede estar en el futuro'; END IF;
   v_metodo:=lower(trim(p->>'metodo'));
   IF v_metodo IS NULL OR v_metodo NOT IN ('efectivo','tarjeta','bizum','transferencia','otro') THEN RAISE EXCEPTION 'Método no válido'; END IF;
   INSERT INTO public.pagos_movimientos(cobro_id,importe,metodo,cobrado_en,origen,solicitud_id) VALUES(v_cid,v_pago,v_metodo,v_momento,'pago',p_id);
   UPDATE public.cobros SET importe_pagado=importe_pagado+v_pago,
    estado=CASE WHEN importe_pagado+v_pago>=importe THEN 'pagado' ELSE 'parcial' END,
    metodo_pago=v_metodo,fecha_pago=(v_momento AT TIME ZONE 'Europe/Madrid')::date WHERE id=v_cid;
 ELSIF v_acc='pagar' THEN RAISE EXCEPTION 'Introduce un pago mayor que cero';
 END IF;
 INSERT INTO public.control_solicitudes(id,contenido,resultado) VALUES(p_id,p,v_res);
 RETURN v_res;
END;
$$;
REVOKE ALL ON FUNCTION public.control_diario_accion(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_diario_accion(uuid,jsonb) TO service_role;
