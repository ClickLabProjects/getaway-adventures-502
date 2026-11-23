# Historias · NOT · Notificaciones y comprobantes

Ronda 1b · 2026-11-24: los correos salen por Amazon SES desde una cola con reintentos (D-17, D-32). WhatsApp
automático no entra en Fase 1: el personal escribe al turista por WhatsApp a mano con el botón de H-OPE-4.

### H-NOT-1: aviso inmediato al operador
Como personal quiero enterarme al instante de cada reserva nueva sin tener el panel abierto.
Criterios de aceptación:
- Dado una reserva nueva, cuando se crea, entonces en menos de 2 minutos llega un correo a la dirección de avisos de la agencia (P-9) con código, tour, fecha, personas, total, nombre, teléfono con enlace a WhatsApp y notas.
- Dado que el servicio de envío falla, cuando se crea la reserva, entonces la reserva se crea igual y el aviso se reintenta; si sigue fallando, queda marcado en el panel como "aviso no enviado".
- Dado una reserva creada desde el panel, cuando se crea, entonces no se avisa al operador (ya lo sabe).
- Dado que el correo de avisos tiene varios destinatarios, cuando se crea una reserva, entonces llega a todos.
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (correo con reintentos, D-32) · destinatarios [PROPUESTA] (P-9)

### H-NOT-2: comprobante por correo al turista
Como visitante quiero un correo con mi reserva para tenerlo a mano.
Criterios de aceptación:
- Dado que reservo en inglés, cuando se crea la reserva, entonces recibo un correo en inglés con código, tour, fecha, hora y punto de encuentro, personas, subtotal, descuento, total, anticipo, cómo pagar, resumen de la política de cancelación, botón de WhatsApp y datos de contacto.
- Dado que reservo en español, cuando se crea, entonces el correo llega en español.
- Dado que el correo dice claramente "Reserva pendiente de confirmación", no "confirmada".
- Dado que el correo rebota o falla, cuando ocurre, entonces el panel lo muestra en esa reserva.
- Dado que el correo sale del dominio de la agencia (P-9), cuando llega a Gmail u Outlook, entonces no cae en spam (dominio verificado).
- Dado el comprobante (Fase 2), cuando lo leo, entonces trae el enlace "Ver mi reserva" (H-RES-16).
Fase: 1 · Prioridad: debe · Estado: [DECIDIDO] (SES, D-17) · remitente y textos [PROPUESTA] (P-9, P-1, P-2)

### H-NOT-3: aviso de confirmación
Como turista quiero saber cuándo mi reserva quedó confirmada.
Criterios de aceptación:
- Dado una reserva pendiente, cuando el personal la pasa a confirmada, entonces recibo un correo "Reserva confirmada" en mi idioma con lo pagado y el saldo.
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-NOT-4: aviso de cancelación, vencimiento o cambio de fecha
Como turista quiero saber si mi reserva cambió.
Criterios de aceptación:
- Dado que la agencia cancela mi reserva, cuando se guarda, entonces recibo un correo con el motivo (en lenguaje amable) y qué hacer.
- Dado que mi reserva venció (H-RES-4), cuando vence, entonces recibo un correo con enlace para reservar de nuevo.
- Dado que me cambian de fecha, cuando se guarda, entonces recibo un correo con la nueva fecha y el mismo código.
Fase: 1 (cancelación y cambio) / 2 (vencida) · Prioridad: debería · Estado: [PROPUESTA]

### H-NOT-5: recordatorio antes del tour
Como turista quiero un recordatorio el día anterior con hora y punto de encuentro.
Criterios de aceptación:
- Dado una reserva confirmada o pagada para mañana, cuando son las 16:00 en Guatemala, entonces recibo el recordatorio con hora, punto de encuentro, qué llevar y saldo pendiente.
- Dado una reserva cancelada o vencida, cuando llega la hora, entonces no se envía.
Fase: 2 · Prioridad: debería · Estado: [PROPUESTA]

### H-NOT-6: resumen diario para la agencia
Como personal quiero recibir cada noche la lista de salidas de mañana.
Criterios de aceptación:
- Dado que mañana hay 3 salidas con reservas, cuando son las 19:00 en Guatemala, entonces recibo un resumen por salida con viajeros, saldo por cobrar y pendientes sin confirmar.
Fase: 2 · Prioridad: podría · Estado: [PROPUESTA]
