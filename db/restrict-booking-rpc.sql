-- No application caller uses this old RPC. Keep it available only to the server.
REVOKE EXECUTE ON FUNCTION public.crear_cita_con_paciente(text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crear_cita_con_paciente(text,text,text,text,text,text) TO service_role;
