# Historias · RES · Reservas

Reglas relacionadas: R1–R11b, R13, R17, R20–R26 de `reglas-negocio.md`.

Ronda 1b · 2026-11-24: "(en base)" = la regla ya está en la base nueva (`db/migrations/`); falta que la API y la
pantalla la usen. Los números (10 personas, 2 pendientes, 24 h, 12 h) son configurables y los confirma la agencia (D-28).

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
- Dado el máximo configurado en 10 (R9), cuando intento reservar 11 personas, entonces la API lo rechaza y veo un mensaje para escribir por WhatsApp para grupos.
- Dado que la agencia cambia el máximo a 8, cuando intento reservar 9, entonces se rechaza sin cambiar el programa.
- Dado que ya tengo 2 reservas pendientes vigentes con el mismo correo o teléfono (R10), cuando intento una tercera, entonces se rechaza con un mensaje para escribir por WhatsApp.
- Dado que una de esas 2 pendientes venció, cuando intento otra, entonces sí se permite.
- Dado que la verificación Turnstile falla o no se envió, cuando envío, entonces no se crea la reserva.
- Dado que alguien llama directamente a la API sin pasar por la página, cuando intenta reservar, entonces también se aplican estas reglas.
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (mecanismo, D-20, D-28, D-31) · valores [PROPUESTA] (P-4)

### H-RES-4: vencimiento de pendientes
Como agencia quiero que las reservas no confirmadas liberen el cupo solas.
Criterios de aceptación:
- Dado una pendiente creada hace más de 24 h (R21) sin confirmar, cuando pasa ese tiempo, entonces deja de contar en el cupo en ese mismo instante (en base) y en menos de 10 minutos aparece como `vencida` en el panel.
- Dado una salida llena por una pendiente que acaba de vencer, cuando otro turista abre las fechas, entonces ve los lugares disponibles aunque el proceso aún no la haya marcado.
- Dado una vencida, cuando el personal la reactiva y hay cupo, entonces vuelve al estado elegido; si vuelve a `pendiente`, recibe un plazo nuevo completo; si no hay cupo, ve "solo quedan N lugares" (en base).
- Dado una pendiente cuya salida llega a la hora de corte antes de las 24 h, cuando llega el corte, entonces se marca vencida. [PROPUESTA] (P-A11)
- Dado que el proceso automático se detiene, cuando pasan 30 minutos sin correr, entonces se avisa al equipo técnico (el cupo sigue correcto).
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (en base, D-23) · valor [PROPUESTA] (P-5) · aviso al turista Fase 2 (H-NOT-4)

### H-RES-5: hora de corte en hora de Guatemala
Como agencia quiero que no se puedan reservar salidas que ya partieron o están por partir.
Criterios de aceptación:
- Dado Atitlán con hora de salida 05:30 y 12 horas de corte, cuando en Guatemala son las 17:31 del día anterior, entonces esa salida ya no se ofrece ni se acepta.
- Dado un tour sin horas de corte propias, cuando se calcula el cierre, entonces usa las horas de corte por defecto (12, configurable).
- Dado que son las 18:30 en Guatemala (00:30 UTC del día siguiente), cuando veo las fechas, entonces "hoy" sigue siendo el día de Guatemala.
- Dado que la pantalla tenía la salida abierta antes del corte, cuando envío después del corte, entonces la API rechaza con "la salida ya no está disponible" en mi idioma.
- Dado que el personal registra desde el panel una reserva después del corte, cuando la guarda, entonces se permite (no así en una salida cerrada).
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (en base, D-25, D-26) · horas por tour [PROPUESTA] (P-6)

### H-RES-6: no duplicar por red caída o doble clic
Como visitante quiero reintentar si se cayó la red sin terminar con dos reservas.
Criterios de aceptación:
- Dado que envío y la red se cae antes de la respuesta, cuando vuelvo a enviar el mismo formulario, entonces existe una sola reserva y veo su código.
- Dado que hago doble clic en "Apartar mi lugar", cuando se procesa, entonces se crea una sola reserva.
- Dado que la red falla, cuando veo el error, entonces el mensaje está en mi idioma y tiene botón "Reintentar" (no un error técnico).
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (en base, D-27) · mensajes [PROPUESTA]

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
- Dado que la agencia publica una política nueva, cuando veo una reserva vieja, entonces sigue mostrando la versión que se aceptó.
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (mecanismo, D-36) · textos [PROPUESTA] (P-1)

### H-RES-9: copiloto en ATV
Como visitante que reserva un ATV quiero indicar cuántas cuatrimotos y cuántos acompañantes para pagar lo correcto.
Criterios de aceptación:
- Dado el tour Pueblos en ATV, cuando elijo 2 conductores y 1 acompañante, entonces el total = 2 × precio conductor + 1 × precio acompañante (R14) y así lo calcula el servidor.
- Dado un tour ATV, cuando elijo 0 conductores, entonces no puedo reservar.
- Dado un tour ATV, cuando elijo más acompañantes que conductores, entonces no puedo reservar.
- Dado un tour que no es ATV, cuando reservo, entonces no veo la opción de acompañante.
- Dado que el cupo de ese tour se cuenta en cuatrimotos (P-3), cuando reservo 2 conductores y 1 acompañante, entonces el cupo baja 2; si se cuenta en personas, baja 3.
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (mecanismo, D-34) · precios y forma de contar el cupo [PROPUESTA] (P-3)

### H-RES-10: cambiar fecha o personas de una reserva
Como personal de la agencia quiero mover una reserva a otra fecha o cambiar personas cuando el turista lo pide.
Criterios de aceptación:
- Dado una reserva confirmada de 2 personas el día 10, cuando la muevo al día 12 que tiene 3 lugares, entonces queda en el día 12, el código no cambia, el día 10 libera 2 lugares y el turista recibe un aviso.
- Dado que el día 12 tiene 1 lugar, cuando intento mover 2 personas, entonces la base lo rechaza (en base) y nada cambia.
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
- Dado una reserva confirmada en una salida que ya está sobrevendida, cuando la marco pagada, entonces se permite (no sube la ocupación).
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (en base, D-24) · pantalla [PROPUESTA]

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
- Dado el panel, cuando creo una reserva con los datos del cliente, entonces aplica las mismas reglas de cupo y precio que la pública, sin Turnstile ni tope de personas en línea (máximo 30), puede saltarse la hora de corte, y queda marcado su origen (web, WhatsApp, oficina, Instagram).
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-RES-16: "Mi reserva" sin cuenta (enlace por correo)
Como turista con reserva quiero abrir mi reserva desde un enlace que me llega al correo, y pedir un cambio o cancelarla.
Criterios de aceptación:
- Dado mi correo de comprobante, cuando abro el enlace "Ver mi reserva", entonces veo tour, fecha, personas, total, pagado, saldo y estado, sin crear cuenta.
- Dado la página "Mi reserva", cuando escribo mi correo (y mi código), entonces veo siempre el mismo mensaje "si existe una reserva, te enviamos un enlace", exista o no; el enlace llega solo al correo de la reserva.
- Dado un enlace ya usado o con más de 24 h, cuando lo abro, entonces veo "este enlace venció" y puedo pedir otro.
- Dado muchas solicitudes desde el mismo lugar en poco tiempo, cuando pido otro enlace, entonces se bloquea temporalmente.
- Dado que faltan más de 72 h, cuando pido cancelar, entonces se cancela y veo lo que corresponde reembolsar; si faltan menos de 24 h, veo que no hay reembolso antes de confirmar.
- Dado que pido cambio de fecha, cuando lo envío, entonces la agencia recibe la solicitud y la reserva no cambia hasta que el personal la aprueba.
Fase: 2 · Prioridad: debería · Estado: [DECIDIDO] (acceso por enlace, D-35) · reglas de cancelación [PROPUESTA] (P-1)

### H-RES-17: cliente sin cuenta que luego se registra
Como cliente registrado quiero ver las reservas que hice antes de tener cuenta.
Criterios de aceptación:
- Dado que reservé 2 veces sin cuenta con ana@x.com, cuando creo una cuenta con ana@x.com y verifico el correo, entonces veo esas 2 reservas.
- Dado que creo la cuenta con otro correo, cuando entro, entonces no veo esas reservas.
- Dado que no verifiqué el correo, cuando entro, entonces no veo reservas previas.
Fase: 3 · Prioridad: podría · Estado: [PROPUESTA]
