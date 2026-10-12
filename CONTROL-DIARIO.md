# ALBERTO 2.0 — Control diario

Entrada principal tras iniciar sesión: `/admin/control`. La pantalla reúne citas locales y eventos de Google, fichas e historial, cobros sin ficha, anticipos, pagos parciales y pendientes, y bonos. Google se consulta en modo lectura: crear o cancelar una cita local ya no escribe en Google.

Cada ingreso nuevo se registra en `pagos_movimientos` con importe, método y fecha/hora. La caja y el CSV de Finanzas usan esa fecha en Europe/Madrid. Los saldos anteriores se conservan como `historico_sin_fecha`, fuera de la caja por periodos porque no existen fechas individuales fiables. No se inventan fechas de ingresos históricos.

`control_diario_accion` ejecuta cada operación en una transacción y guarda su solicitud UUID. Los reintentos con el mismo UUID y contenido devuelven el mismo resultado. Las claves de cita, los bloqueos y los índices evitan duplicar un cobro de sesión o consumir dos veces una cita. Crear un bono y su cobro inicial es atómico. Vincular una ficha actualiza la relación del cobro existente; no copia el cobro ni sus ingresos. El descuento de bonos de la ficha antigua se deriva al control diario para vincular cada sesión a una cita.

Los endpoints validan la sesión en Supabase y comparan el usuario con `ADMIN_USER_ID`. Los nuevos datos tienen RLS activado, sin permisos para anon/authenticated. Las funciones económicas son SECURITY INVOKER y solo service_role puede ejecutarlas. Ningún secreto privado se incluye en el cliente o en los archivos de despliegue.

## Base de datos

Proyecto: `khvmvmdmfmloadmjryro`. Las migraciones aditivas se aplicaron mediante Supabase, con historial remoto. Los SQL de `db/` documentan el esquema final y las correcciones; no deben ejecutarse todos ciegamente sobre una base ya actualizada. Las tablas, credenciales y registros existentes se conservaron.

## Validación

- Build de Next.js 16.4.0 y comprobación TypeScript.
- Pruebas SQL transaccionales en `tests/control-diario.sql`: anticipo, parciales, métodos, fecha real en Madrid, reintentos, transferencia a ficha, consumo único, rechazo de sobrepago, rollback de operaciones incompletas, permisos y preservación de saldos. La transacción de prueba se revierte; no deja fichas ni cobros de prueba.
- Prueba de navegador en `tests/control-ui.cjs` con respuestas simuladas y sesión ficticia. Comprueba formularios de tablet, ficha precargada, historial, pagos, bonos y Finanzas. No sustituye una prueba de usuario con la sesión administrativa real.
- Endpoints de control, Google y Finanzas rechazan consultas sin autenticación con HTTP 403.

## Publicación

Proyecto Vercel existente: `prj_zhgeGBWtZdftnOT0uAojSdVv96Y7`, equipo `team_TPuZ0veQJe6NyDyAU9XidWY2`. El despliegue usa las variables ya guardadas en Vercel. No se descargaron ni cambiaron secretos sensibles. La integración MCP de Vercel devolvió 403; su CLI local tiene acceso autorizado al proyecto.

La protección de contraseñas filtradas de Supabase sigue desactivada en la configuración existente. La función `es_administrador` conserva sus permisos porque la requieren las políticas de acceso de las fichas. Las tablas solo de servidor no tienen políticas públicas; ese cierre es intencional.
