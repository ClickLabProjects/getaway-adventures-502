# Historias · DSH · Dashboard

### H-DSH-1: indicadores de ventas por periodo
Como dueño quiero ver ventas, cobrado, por cobrar, ticket promedio y tasa de cancelación en 30 días, 90 días, 12 meses o todo.
Criterios de aceptación:
- Dado reservas en el periodo, cuando elijo "30 días", entonces ventas = suma de totales de reservas no canceladas creadas en esos 30 días.
- Dado que cambio de periodo, cuando lo cambio, entonces todas las cifras y gráficas se recalculan.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL]

### H-DSH-2: cifras correctas con muchos datos
Como dueño quiero que las cifras sean correctas aunque haya miles de reservas.
Criterios de aceptación:
- Dado 1,500 reservas, cuando veo "Todo", entonces las cifras coinciden con la suma total real (no solo las primeras 1000).
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-DSH-3: "por cobrar" y "cobrado" reales
Como dueño quiero que "por cobrar" sea solo lo que todavía se puede cobrar y que "cobrado" refleje los pagos registrados.
Criterios de aceptación:
- Dado una reserva confirmada de un tour que ya pasó, cuando veo "por cobrar", entonces no aparece ahí (aparece como "sin cobrar de viajes pasados" aparte).
- Dado una reserva con anticipo de Q390, cuando veo "cobrado", entonces suma Q390 aunque la reserva no esté `pagada` (depende de PAG).
- Dado un reembolso, cuando veo "cobrado", entonces se resta.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-DSH-4: ocupación de próximas salidas
Como dueño quiero ver qué salidas de los próximos 14 días se están llenando.
Criterios de aceptación:
- Dado una salida con 8 de 12 lugares, cuando la veo, entonces muestra 8/12 con barra.
- Dado que las vencidas no cuentan, cuando una pendiente vence, entonces la ocupación baja.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] / [PROPUESTA] (vencidas)

### H-DSH-5: rendimiento de promociones
Como dueño quiero ver cuántas reservas y cuánto descuento generó cada promoción.
Criterios de aceptación:
- Dado una promo usada en 5 reservas, cuando veo su rendimiento, entonces muestra 5 reservas, ventas y descuento total otorgado.
Fase: 1 · Prioridad: debería · Estado: [ACTUAL]

### H-DSH-6: indicadores nuevos
Como dueño quiero ver no-shows, origen de la reserva (web, WhatsApp, oficina), idioma y tiempo medio para confirmar.
Criterios de aceptación:
- Dado reservas con origen registrado, cuando veo el dashboard, entonces hay un desglose por origen e idioma.
- Dado reservas con asistencia marcada, cuando veo el dashboard, entonces se muestra la tasa de no-show por tour.
Fase: 2 · Prioridad: podría · Estado: [PROPUESTA]
