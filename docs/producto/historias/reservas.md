# Historias · RES · Reservas

Reglas relacionadas: R1–R11, R13, R17, R20–R26 de `reglas-negocio.md`.

### H-RES-1: apartar lugar sin pagar
Como visitante quiero elegir fecha, número de personas y dejar mis datos para apartar mi lugar sin pagar en línea.
Criterios de aceptación:
- Dado un tour activo con una salida futura con 5 lugares, cuando reservo 3 personas con datos válidos, entonces recibo un código `GA-` de 6 caracteres, el total = precio × 3 y la salida muestra 2 lugares.
- Dado que lleno el formulario, cuando el correo no tiene formato válido o el teléfono tiene menos de 8 caracteres, entonces no se crea la reserva y veo el error en mi idioma.
- Dado un tour con precio especial en esa fecha, cuando reservo, entonces el total usa el precio especial.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL]

### H-RES-2: último lugar y sin cupo
Como visitante quiero saber si ya no hay lugar para no creer que reservé.
Criterios de aceptación:
- Dado una salida con 1 lugar, cuando dos personas reservan 1 lugar al mismo tiempo, entonces solo una reserva se crea y la otra ve "Solo quedan 0 lugares" en su idioma.
- Dado una salida agotada, cuando veo las fechas, entonces aparece "Agotado" y no la puedo elegir.
- Dado que mi reserva falló por cupo, cuando vuelvo al formulario, entonces la fecha agotada ya no queda seleccionada y la lista de fechas está actualizada.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] (los dos primeros) / [PROPUESTA] (el tercero)

### H-RES-3: tope de personas y límite anti-abuso
Como agencia quiero que nadie pueda bloquear salidas con reservas falsas.
Criterios de aceptación:
- Dado el formulario, cuando intento reservar más de 10 personas (R9), entonces el servidor lo rechaza y veo un mensaje para escribir por WhatsApp para grupos.
- Dado que ya tengo 2 reservas pendientes con el mismo correo o teléfono en esa salida, cuando intento una tercera, entonces se rechaza.
- Dado que la verificación anti-robots falla o no se envió, cuando envío, entonces no se crea la reserva.
- Dado que alguien llama directamente al servidor sin pasar por la página, cuando intenta reservar, entonces también se aplican estas reglas.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-4: vencimiento de pendientes
Como agencia quiero que las reservas no confirmadas liberen el cupo solas.
Criterios de aceptación:
- Dado una reserva pendiente creada hace más de 24 h (R21) sin confirmar, cuando pasa ese tiempo, entonces queda `vencida`, ya no cuenta en el cupo y el turista recibe un aviso.
- Dado una reserva pendiente para una salida cuya hora de corte llegó, cuando llega el corte, entonces vence aunque no hayan pasado 24 h.
- Dado una reserva vencida, cuando el personal la reactiva y hay cupo, entonces vuelve a `confirmada`; si no hay cupo, ve el error.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-5: hora de corte en hora de Guatemala
Como agencia quiero que no se puedan reservar salidas que ya partieron o están por partir.
Criterios de aceptación:
- Dado que en Guatemala son las 19:00 del lunes, cuando veo las fechas, entonces el martes no aparece si su corte era el lunes 18:00, y el lunes tampoco.
- Dado que son las 18:30 en Guatemala (00:30 UTC del día siguiente), cuando veo las fechas, entonces "hoy" sigue siendo el día de Guatemala.
- Dado que la pantalla tenía la salida abierta antes del corte, cuando envío después del corte, entonces el servidor rechaza con "la salida ya no está disponible".
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-6: no duplicar por red caída o doble clic
Como visitante quiero reintentar si se cayó la red sin terminar con dos reservas.
Criterios de aceptación:
- Dado que envío y la red se cae antes de la respuesta, cuando vuelvo a enviar el mismo formulario, entonces existe una sola reserva y veo su código.
- Dado que hago doble clic en "Apartar mi lugar", cuando se procesa, entonces se crea una sola reserva.
- Dado que la red falla, cuando veo el error, entonces el mensaje está en mi idioma y tiene botón "Reintentar" (no un error técnico).
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-7: confirmación que no se pierde
Como visitante quiero volver a ver mi código aunque recargue la página.
Criterios de aceptación:
- Dado que acabo de reservar, cuando recargo la página, entonces sigo viendo la confirmación con el código, tour, fecha, personas y total.
- Dado que cierro el navegador, cuando busco mi código, entonces lo tengo en el correo de comprobante (H-NOT-2).
- Dado la confirmación, cuando la veo, entonces se muestran la forma de pago, el siguiente paso y un resumen de la política de cancelación.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-8: aceptar políticas al reservar
Como agencia quiero que el turista acepte las condiciones antes de reservar.
Criterios de aceptación:
- Dado el formulario, cuando no marco "Acepto la política de cancelación y el aviso de privacidad", entonces no puedo enviar.
- Dado que acepto, cuando se crea la reserva, entonces queda guardada la versión de la política aceptada y la fecha (R28).
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-9: copiloto en ATV
Como visitante que reserva un ATV quiero indicar cuántas cuatrimotos y cuántos acompañantes para pagar lo correcto.
Criterios de aceptación:
- Dado el tour Pueblos en ATV, cuando elijo 2 conductores y 1 acompañante, entonces el total = 2 × precio conductor + 1 × precio acompañante (R14) y así lo calcula el servidor.
- Dado un tour ATV, cuando elijo 0 conductores, entonces no puedo reservar.
- Dado un tour ATV, cuando elijo más acompañantes que conductores, entonces no puedo reservar.
- Dado un tour que no es ATV, cuando reservo, entonces no veo la opción de acompañante.
- Dado que el cupo de ATV se cuenta en cuatrimotos o en personas (P-3), cuando reservo, entonces el cupo baja según esa regla.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-10: cambiar fecha o personas de una reserva
Como personal de la agencia quiero mover una reserva a otra fecha o cambiar personas cuando el turista lo pide.
Criterios de aceptación:
- Dado una reserva confirmada de 2 personas el día 10, cuando la muevo al día 12 que tiene 3 lugares, entonces queda en el día 12, el código no cambia, el día 10 libera 2 lugares y el turista recibe un aviso.
- Dado que el día 12 tiene 1 lugar, cuando intento mover 2 personas, entonces el servidor lo rechaza y nada cambia.
- Dado que la nueva fecha tiene precio especial distinto, cuando la muevo, entonces el panel muestra el precio anterior y el nuevo y el personal elige cuál aplica (R25).
- Dado que cambio de 2 a 4 personas, cuando hay cupo, entonces el total se recalcula con el mismo precio por persona y el mismo descuento.
- Dado una reserva cancelada o de una fecha pasada, cuando intento moverla, entonces no se permite.
- Dado cualquier cambio, cuando se guarda, entonces queda en el historial (H-RES-13).
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-11: cancelar con confirmación y motivo
Como personal quiero cancelar una reserva sin errores de dedo y dejando constancia del motivo.
Criterios de aceptación:
- Dado una reserva, cuando elijo cancelar, entonces se pide confirmación y un motivo de la lista (R23); sin motivo no se cancela.
- Dado que cancelo, cuando se guarda, entonces el cupo se libera y el turista recibe aviso (H-NOT-4).
- Dado una reserva con pagos registrados, cuando la cancelo, entonces el panel me indica el monto que correspondería reembolsar según la política (R27).
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-12: reactivar solo con cupo
Como agencia quiero no sobrevender al reactivar una reserva.
Criterios de aceptación:
- Dado una reserva cancelada de 3 personas y una salida con 2 lugares, cuando intento reactivarla, entonces se rechaza con "solo quedan 2 lugares".
- Dado que hay 3 o más lugares, cuando la reactivo, entonces vuelve al estado elegido y el cupo baja.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-RES-13: historial de la reserva
Como dueño quiero saber quién cambió qué en una reserva.
Criterios de aceptación:
- Dado una reserva, cuando cambia estado, fecha, personas, monto o se registra un pago, entonces se guarda quién, cuándo, valor anterior y nuevo.
- Dado el detalle de una reserva en el panel, cuando lo abro, entonces veo el historial en orden cronológico.
- Dado que nadie puede editar ni borrar el historial desde el panel.
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-RES-14: cancelación masiva
Como agencia quiero cancelar varias reservas a la vez (por clima o por abuso).
Criterios de aceptación:
- Dado que selecciono 15 reservas pendientes, cuando elijo "Cancelar seleccionadas" con motivo, entonces las 15 quedan canceladas tras una sola confirmación que dice "15 reservas".
- Dado que cancelo por "agencia canceló (clima)", cuando se cancelan, entonces cada turista recibe el aviso con la opción de cambio de fecha.
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-RES-15: crear reserva desde el panel
Como personal quiero registrar una reserva que llegó por WhatsApp o en la oficina para que el cupo sea real.
Criterios de aceptación:
- Dado el panel, cuando creo una reserva con los datos del cliente, entonces aplica las mismas reglas de cupo y precio que la pública, sin captcha ni tope de 10 personas, y queda marcado su origen (web, WhatsApp, oficina, Instagram).
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-RES-16: "Mi reserva" sin cuenta
Como turista con reserva quiero ver mi reserva con mi código y correo, y pedir un cambio o cancelarla.
Criterios de aceptación:
- Dado un código y el correo correcto, cuando los ingreso, entonces veo tour, fecha, personas, total, pagado, saldo y estado.
- Dado un código con un correo que no coincide, cuando lo ingreso, entonces veo "no encontramos esa reserva" (sin revelar si el código existe).
- Dado más de 5 intentos fallidos desde el mismo lugar en 15 minutos, cuando intento otra vez, entonces se bloquea temporalmente.
- Dado que faltan más de 72 h, cuando pido cancelar, entonces se cancela y veo lo que corresponde reembolsar; si faltan menos de 24 h, veo que no hay reembolso antes de confirmar.
- Dado que pido cambio de fecha, cuando lo envío, entonces la agencia recibe la solicitud y la reserva no cambia hasta que el personal la aprueba.
Fase: 2 · Prioridad: debería · Estado: [PROPUESTA]

### H-RES-17: cliente sin cuenta que luego se registra
Como cliente registrado quiero ver las reservas que hice antes de tener cuenta.
Criterios de aceptación:
- Dado que reservé 2 veces sin cuenta con ana@x.com, cuando creo una cuenta con ana@x.com y verifico el correo, entonces veo esas 2 reservas.
- Dado que creo la cuenta con otro correo, cuando entro, entonces no veo esas reservas.
- Dado que no verifiqué el correo, cuando entro, entonces no veo reservas previas.
Fase: 3 · Prioridad: podría · Estado: [PROPUESTA]
