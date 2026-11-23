# Historias · OPE · Panel de operación

### H-OPE-1: buscar y filtrar reservaciones
Como personal quiero encontrar una reserva por código, nombre, correo, teléfono o tour.
Criterios de aceptación:
- Dado el código GA-ABC123, cuando lo busco, entonces aparece esa reserva.
- Dado filtros de estado y tour, cuando los combino, entonces solo veo las que cumplen ambos.
- Dado que hay más de 1000 reservas, cuando busco una antigua o una de una salida futura, entonces la encuentro (no se recorta en silencio) y la lista se recorre por páginas.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] (búsqueda) / [DECIDIDO] (páginas en el servidor, D-22)

### H-OPE-2: lista de viajeros por salida
Como personal quiero ver, para una salida, todos los que van con su teléfono, notas, punto de recogida y saldo.
Criterios de aceptación:
- Dado la salida de Acatenango del día 10, cuando la abro, entonces veo las reservas activas, el total de personas contra el cupo, y el saldo por cobrar de cada una.
- Dado la lista, cuando la comparto o imprimo, entonces sale en una página legible en celular, sin correos (solo nombre, personas, teléfono, punto de recogida, notas, saldo).
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-OPE-3: pendientes por vencer
Como personal quiero ver primero las reservas pendientes que están por vencer para contactarlas a tiempo.
Criterios de aceptación:
- Dado reservas pendientes, cuando abro Reservaciones, entonces hay una vista "Por confirmar" ordenada por vencimiento, con el tiempo restante.
- Dado una pendiente a menos de 2 h de vencer, cuando la veo, entonces está resaltada.
- Dado una pendiente cuyo plazo ya pasó pero aún no se marcó vencida, cuando la veo, entonces aparece como vencida (no como pendiente).
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-OPE-4: WhatsApp del cliente con un clic
Como personal quiero abrir WhatsApp con el cliente desde la reserva con un mensaje ya escrito.
Criterios de aceptación:
- Dado un teléfono guardado como "5555 5555" (sin código de país), cuando hago clic, entonces abre WhatsApp con +502 5555 5555.
- Dado un teléfono con código de otro país (+1 ...), cuando hago clic, entonces se respeta.
- Dado el mensaje, cuando abre, entonces trae código, tour, fecha y saldo en el idioma en que reservó el cliente.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-OPE-5: exportar reservaciones de forma segura
Como administrador quiero exportar a CSV sin que el archivo pueda ejecutar fórmulas.
Criterios de aceptación:
- Dado un nombre de cliente que empieza con "=", "+", "-" o "@", cuando exporto, entonces en el archivo aparece como texto y Excel no lo ejecuta.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] (exportar) / [PROPUESTA] (seguridad)

### H-OPE-6: avisar cambios sin guardar
Como administrador quiero que el editor me avise si salgo con cambios sin guardar.
Criterios de aceptación:
- Dado que edité un tour o promoción sin guardar, cuando intento cerrar o cambiar de pestaña, entonces se pide confirmación.
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-OPE-7: asistencia y no-show
Como personal quiero marcar quién se presentó para medir no-shows y aplicar la política.
Criterios de aceptación:
- Dado la lista de una salida de hoy, cuando marco a un viajero como "no se presentó", entonces su reserva queda `no_show` y deja de contar en "por cobrar".
- Dado una salida que ya pasó, cuando no marqué nada, entonces las reservas pagadas pasan a `completada` al día siguiente.
Fase: 2 · Prioridad: debería · Estado: [PROPUESTA]

### H-OPE-8: asignar guía y vista del guía
Como guía quiero ver en mi celular solo las salidas que me asignaron con la lista de viajeros.
Criterios de aceptación:
- Dado que el administrador me asigna la salida del día 10, cuando entro, entonces veo esa salida y su lista; no veo otras salidas, montos totales ni la base de clientes.
- Dado que me quitan la asignación, cuando entro, entonces ya no la veo.
Fase: 3 · Prioridad: podría · Estado: [PROPUESTA]

### H-OPE-9: cambiar los valores del negocio desde el panel
Como dueño quiero cambiar el vencimiento de pendientes, el máximo de personas por reserva en línea, el máximo de pendientes por contacto y las horas de corte por defecto sin pedírselo al programador.
Criterios de aceptación:
- Dado el panel con rol dueño, cuando cambio el vencimiento de 24 a 48 h, entonces las pendientes nuevas vencen a las 48 h y las ya creadas conservan su plazo.
- Dado un valor fuera de rango (vencimiento 0 o más de 168 h; personas más de 30; corte más de 168 h), cuando guardo, entonces se rechaza con el rango permitido.
- Dado cualquier cambio, cuando se guarda, entonces queda en el historial con quién, cuándo, valor anterior y nuevo.
- Dado un usuario con rol personal o guía, cuando abre la pantalla, entonces no la ve ni puede cambiar valores por la API.
- Dado un valor que la agencia aún no ha confirmado, cuando lo veo, entonces aparece marcado "por confirmar".
Fase: 2 (en Fase 1 lo cambia el equipo técnico a pedido) · Prioridad: debería · Estado: [DECIDIDO] (valores e historial en base, D-28) / [PROPUESTA] (pantalla)
