# Historias · PAG · Pagos y anticipos

Reglas relacionadas: R27–R34.

### H-PAG-1: ver cómo pagar antes de reservar
Como visitante quiero saber cómo y cuándo pago antes de apartar mi lugar.
Criterios de aceptación:
- Dado el formulario de reserva, cuando lo veo, entonces aparece un resumen de formas de pago y el anticipo requerido (R31, R32) con enlace a la política completa, en mi idioma.
- Dado la confirmación y el comprobante, cuando los veo, entonces muestran el monto del anticipo, el saldo y cómo pagar.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-PAG-2: registrar un pago manual
Como personal quiero registrar cada pago que recibo (anticipo o saldo) para saber cuánto debe cada reserva.
Criterios de aceptación:
- Dado una reserva de Q1,300, cuando registro Q390 en transferencia, entonces la reserva muestra pagado Q390, saldo Q910 y estado de pago "anticipo".
- Dado que registro el saldo de Q910, cuando lo guardo, entonces el saldo es Q0 y la reserva pasa a `pagada`.
- Dado que registro un monto mayor al saldo, cuando guardo, entonces se pide confirmación explícita.
- Dado que registro un monto 0 o negativo, cuando guardo, entonces se rechaza.
- Dado un pago registrado, cuando lo veo, entonces muestra monto, moneda, método, fecha, referencia opcional y quién lo registró.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-PAG-3: pago en dólares
Como personal quiero registrar pagos en USD para turistas que pagan en dólares.
Criterios de aceptación:
- Dado que registro USD 50 con tipo de cambio 7.70, cuando guardo, entonces se acredita Q385 al saldo y se guardan ambos montos.
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-PAG-4: registrar un reembolso
Como administrador quiero registrar reembolsos para que el cobrado sea real.
Criterios de aceptación:
- Dado una reserva cancelada con Q390 pagados, cuando registro un reembolso de Q390, entonces pagado neto = Q0 y el dashboard descuenta ese monto de "cobrado".
- Dado que intento reembolsar más de lo pagado, cuando guardo, entonces se rechaza.
- Dado que soy personal (no administrador), cuando intento registrar un reembolso, entonces no se permite. [F2]
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-PAG-5: corregir un pago mal registrado
Como administrador quiero anular un pago registrado por error sin borrar la evidencia.
Criterios de aceptación:
- Dado un pago registrado por error, cuando lo anulo con motivo, entonces deja de sumar al saldo pero sigue visible como anulado en el historial.
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-PAG-6: pagar el anticipo en línea
Como visitante quiero pagar el anticipo con tarjeta al reservar para asegurar mi lugar sin esperar a WhatsApp.
Criterios de aceptación:
- Dado que reservo y pago el anticipo con éxito, cuando vuelvo de la pasarela, entonces la reserva queda `confirmada` con el pago registrado automáticamente y recibo el comprobante.
- Dado que el pago es rechazado, cuando vuelvo, entonces la reserva sigue `pendiente` con su vencimiento normal y puedo reintentar o pagar por WhatsApp.
- Dado que cierro la ventana durante el pago, cuando la pasarela confirma después, entonces la reserva igual queda confirmada (la confirmación no depende de mi navegador).
- Dado que la pasarela confirma el mismo pago dos veces, cuando llega el segundo aviso, entonces no se registra doble.
- Dado que el cupo ya se liberó porque la reserva venció, cuando llega un pago tardío, entonces se avisa al personal para reembolsar o reubicar.
Fase: 2 · Prioridad: debería · Estado: [PROPUESTA]

### H-PAG-7: enlace de pago desde el panel
Como personal quiero mandar por WhatsApp un enlace de pago con el monto exacto.
Criterios de aceptación:
- Dado una reserva con saldo Q910, cuando genero un enlace de pago, entonces el enlace cobra Q910 y al pagarse se registra solo en la reserva.
Fase: 2 · Prioridad: podría · Estado: [PROPUESTA]
