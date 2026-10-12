CREATE FUNCTION public.control_finanzas(p_desde date,p_hasta date) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object(
  'movimientos',coalesce((SELECT jsonb_agg(to_jsonb(m)||jsonb_build_object('concepto',c.concepto,'paciente_id',c.paciente_id,'nombre',coalesce(pa.nombre,c.nombre_agenda),'bono_id',c.bono_id))
    FROM public.pagos_movimientos m JOIN public.cobros c ON c.id=m.cobro_id LEFT JOIN public.pacientes pa ON pa.id=c.paciente_id
    WHERE m.origen='pago' AND m.cobrado_en >= p_desde::timestamp AT TIME ZONE 'Europe/Madrid' AND m.cobrado_en < (p_hasta+1)::timestamp AT TIME ZONE 'Europe/Madrid'),'[]'::jsonb),
  'historico',coalesce((SELECT sum(importe) FROM public.pagos_movimientos WHERE origen='historico_sin_fecha'),0),
  'pendiente',coalesce((SELECT sum(greatest(importe-importe_pagado,0)) FROM public.cobros WHERE estado<>'cancelado'),0),
  'gastos',coalesce((SELECT jsonb_agg(to_jsonb(g)) FROM public.gastos_negocio g WHERE fecha BETWEEN p_desde AND p_hasta),'[]'::jsonb)
 );
$$;
REVOKE ALL ON FUNCTION public.control_finanzas(date,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_finanzas(date,date) TO service_role;
