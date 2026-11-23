# Preguntas abiertas

Ronda 1b · 2026-11-24. Al responder basta con "P-n: sí / no / otro valor". Las respuestas pasan a `decisiones.md`.
Las preguntas para la agencia están redactadas para ella en `cuestionario-cliente.md` (cada pregunta lleva su P-n).

**Cambios desde la ronda 1:** las preguntas al arquitecto P-A1..A9 quedaron resueltas (ver al final y D-20..D-37).
P-13 cambia: los respaldos ya están resueltos con la base administrada de Lightsail. P-4, P-5 y P-6 dejan de bloquear
el desarrollo porque los valores son parametrizables (D-28), pero la agencia debe confirmarlos antes del lanzamiento.
Se agregan P-17 a la agencia, P-18 a P-24 y P-A10, P-A11. Ronda 1c (2026-11-24): se agregan P-25 a P-28 para la agencia.

## Las 5 más urgentes (bloquean la Fase 1)
1. **P-1 · Política de cancelación** (agencia): sin ella no se puede mostrar en la reserva ni en el comprobante.
2. **P-2 · Forma de pago y anticipo** (agencia): qué métodos aceptan, si piden anticipo y de cuánto, y si cobran en USD.
3. **P-3 · Acompañante en ATV** (agencia): precio del copiloto en cada tour ATV y si el cupo se cuenta en cuatrimotos o en personas.
4. **P-9 · Avisos, dominio y correo** (agencia): a qué correo llega cada reserva nueva, qué dominio usa el sitio y desde qué dirección sale el comprobante.
5. **P-6 · Hora de salida y corte de cada tour** (agencia): la base ya lo soporta; falta el dato real por tour (y si Pueblos ATV tiene dos salidas al día).

---

## Para el cliente (la agencia)

**P-1 · Política de cancelación**
- Por qué importa: es lo primero que busca un turista extranjero; sin ella hay disputas y reembolsos a criterio.
- Bloquea: H-POL-1, H-RES-8, H-RES-11, H-RES-16, H-NOT-2, R27.
- Recomendación: la de R27 (más de 72 h: reembolso total; 72-24 h: cambio de fecha o 50 %; menos de 24 h o no se presenta: sin reembolso; si la agencia cancela por clima o volcán: cambio o reembolso total). ¿Excepciones por tour (Semuc, Acatenango 4x4)?

**P-2 · Forma de pago, anticipo y moneda**
- Por qué importa: hoy el sitio dice "no se te cobra ahora" sin explicar cómo se paga; sin anticipo, los no-shows bloquean cupo.
- Bloquea: H-POL-2, H-PAG-1..3, R31–R34, H-DSH-3.
- Recomendación: anticipo del 30 % para confirmar (transferencia, depósito o enlace de pago); saldo en efectivo o tarjeta antes de salir. Aceptar USD con tipo de cambio del día fijado por la agencia. ¿Recargo con tarjeta?

**P-3 · Acompañante en ATV**
- Por qué importa: el sitio cobra "por persona", pero los textos dicen "copiloto paga extra" (Pacaya) y "copiloto paga 50 %" (Pueblos). Un turista con pareja ve un total que no es el real.
- Bloquea: H-RES-9, H-CAT-5, R14.
- Recomendación: precio por conductor + precio de acompañante (Pueblos: Q300); máximo un acompañante por cuatrimoto; cupo contado en cuatrimotos. Falta el precio de Pacaya y la edad mínima del acompañante (la arquitectura admite cupo en personas o en vehículos, D-34).

**P-4 · Máximo de personas por reserva en línea y pendientes por persona**
- Por qué importa: evita que una sola reserva falsa llene una salida (bloqueante 1). Ya es parametrizable (D-28).
- Bloquea: confirmar valores de R9 y R10 antes del lanzamiento (no bloquea desarrollo).
- Recomendación: 10 personas por reserva en línea (grupos más grandes por WhatsApp); 2 reservas sin confirmar a la vez por correo o teléfono.

**P-5 · Vencimiento de pendientes**
- Por qué importa: sin vencimiento, una reserva sin respuesta ocupa lugar para siempre. Ya es parametrizable (D-28).
- Bloquea: confirmar valor de R21.
- Recomendación: 24 horas. Si se aprueba anticipo, que venza si no llega el anticipo en ese plazo.

**P-6 · Hora de salida y horas de corte por tour**
- Por qué importa: hoy se puede reservar una salida que ya partió. La base ya admite hora de salida y corte por tour (D-26).
- Bloquea: carga de datos reales del catálogo (H-CAT-8, H-RES-5).
- Recomendación: corte por defecto 12 h antes de la salida. Tours de madrugada (Atitlán 5:30) quizá 12-14 h; Pueblos ATV 2 h. ¿Pueblos ATV sale a las 10:00 y a las 14:00 todos los días? (ver P-A10).

**P-7 · Estados de la reserva y significado de "confirmada"**
- Por qué importa: hoy "pagada" no dice cuánto se pagó y no hay forma de marcar que alguien no se presentó.
- Bloquea: R20–R22, H-OPE-7.
- Recomendación: pendiente / confirmada / pagada / cancelada / vencida (ya en la base) y, en Fase 2, completada y no se presentó; el pago se lleva aparte (sin pago, anticipo, pagado, reembolsado). ¿"Confirmada" significa "ya pagó anticipo" o "solo hablamos por WhatsApp"?

**P-8 · Cambio de fecha con precio distinto**
- Por qué importa: si la nueva fecha tiene precio especial, hay que decidir quién paga la diferencia.
- Bloquea: H-RES-10, R25.
- Recomendación: por defecto se cobra la diferencia si la nueva fecha es más cara y no se devuelve si es más barata; el personal puede mantener el precio original. ¿Cuántos cambios de fecha gratis?

**P-9 · Avisos, dominio y remitente**
- Por qué importa: es el bloqueante 3 (hoy nadie se entera de una reserva). El aviso sale por correo (D-32); WhatsApp automático no entra en la Fase 1.
- Bloquea: H-NOT-1, H-NOT-2, puesta en marcha del correo (SES) y del dominio (D-21).
- Recomendación: aviso a un correo de la agencia (y que el personal lo reciba en el celular); comprobante desde una dirección del dominio de la agencia (por ejemplo reservas@...). ¿Tienen dominio propio? ¿Quién lo administra?

**P-10 · Privacidad, conservación de datos y doble confirmación**
- Por qué importa: turistas de EE. UU. y Europa esperan aviso de privacidad y poder borrar sus datos.
- Bloquea: H-POL-3, H-CLI-4, H-CLI-5, R39, R41.
- Recomendación: conservar reservas 5 años (contabilidad) y borrar datos de marketing tras 3 años sin reservar; doble confirmación del consentimiento por correo. Falta el responsable legal (razón social, NIT, dirección).

**P-12 · Reseñas** (Fase 3)
- Por qué importa: define dónde se piden reseñas.
- Bloquea: H-RSN-1.
- Recomendación: Google y TripAdvisor; solo a quien no se dio de baja.

**P-14 · Punto de encuentro y recogida en hotel**
- Por qué importa: el turista necesita saber dónde presentarse; hoy solo dice "Antigua Guatemala".
- Bloquea: H-CAT-4.
- Recomendación: dirección de la agencia con enlace de mapa, presentarse 15 minutos antes; si recogen en hoteles de Antigua, pedir el hotel en la reserva. ¿Tiene costo? En Pacaya ATV, ¿el turista elige La Parada o Condesa?

**P-15 · Facturación**
- Por qué importa: algunos turistas o empresas piden factura (FEL).
- Bloquea: nada en Fase 1 si se hace fuera del sistema.
- Recomendación: factura fuera del sistema en Fase 1; casilla opcional "necesito factura".

**P-17 · Quiénes usarán el panel y con qué permisos** (agencia + dueño del proyecto)
- Por qué importa: la base ya distingue dueño, admin, personal y guía (D-16); falta saber si hay empleados desde el lanzamiento. Todos necesitarán una app autenticadora en el celular (D-37).
- Bloquea: si H-CTA-5 y H-CTA-6 suben a Fase 1.
- Recomendación: si hay empleados además del dueño, subir los roles a Fase 1 (los empleados sin exportar clientes ni ver ventas totales). Lista de personas con nombre, correo y rol.

**P-18 · Prioridades después del lanzamiento** (nueva)
- Por qué importa: ordena la Fase 2 según lo que más le duele a la agencia.
- Bloquea: orden de la Fase 2.
- Recomendación: 1) recordatorio el día antes, 2) asistencia/no se presentó, 3) "Mi reserva", 4) pago del anticipo en línea.

**P-19 · Interés en cobrar en línea** (nueva)
- Por qué importa: el pago en línea cobra una comisión por cada pago (varía según el proveedor) y requiere un contrato de la agencia con el proveedor.
- Bloquea: decisión P-11 del dueño.
- Recomendación: empezar con registro manual y decidir tras 1-2 meses de operación.

**P-20 · Contenido del sitio** (nueva)
- Por qué importa: los textos de políticas, "qué llevar", dificultad, edad mínima y las traducciones al inglés los debe dar o aprobar la agencia.
- Bloquea: H-POL-1..4 (Fase 1), H-POL-6, H-POL-7 (Fase 2).
- Recomendación: la agencia aprueba los textos; el equipo propone un borrador en ES y EN.

**P-21 · Reservas reales en el sitio actual** (nueva)
- Por qué importa: si el sitio actual ya recibió reservas reales, hay que pasarlas a la base nueva antes del cambio.
- Bloquea: el plan de migración de datos (paso 15 de la arquitectura).
- Recomendación: pasar solo el catálogo y las reservas futuras activas.

**P-22 · Motivos de cancelación** (nueva)
- Por qué importa: el panel pedirá un motivo al cancelar (R23); la lista sirve para medir por qué se pierden ventas.
- Bloquea: H-RES-11.
- Recomendación: cliente lo pidió, no pagó, clima o volcán, agencia canceló, duplicada, abuso, otro.

**P-24 · Promociones actuales y descuentos especiales** (nueva)
- Por qué importa: las promociones sin tour quedaron pausadas en la base nueva (D-29); hay que saber cuáles valen para todos los tours. Además, ¿se permiten descuentos del 100 % (cortesías)?
- Bloquea: carga inicial de promociones; H-PRO-5.
- Recomendación: la agencia lista las promociones vigentes con su tour o "todos"; 100 % solo con confirmación explícita.

**P-25 · Descuento máximo de un código público** (nueva, ronda 1c)
- Por qué importa: hoy el sistema acepta hasta 100 %; un código público del 100 % dejaría reservar gratis a cualquiera que lo vea en la portada.
- Bloquea: H-PRO-5, R19b, R19c.
- Recomendación: máximo 50 % para códigos públicos; descuentos mayores solo como cortesía que registra el personal desde el panel.

**P-26 · Vigencia de una promoción: ¿día de la reserva o día del viaje?** (nueva, ronda 1c)
- Por qué importa: promo válida hasta el 30 de noviembre; alguien reserva el 29 para viajar el 15 de diciembre. ¿Aplica?
- Bloquea: R16, H-PRO-3.
- Recomendación: cuenta el día en que se reserva (así funciona hoy).

**P-27 · Porcentaje del cupo que pueden apartar las reservas sin confirmar** (nueva, ronda 1c)
- Por qué importa: evita que reservas falsas llenen un tour. Efecto real: en el Offroad 4x4 (cupo 8), con 60 % caben como máximo 4 personas sin confirmar; un grupo de 5 tendría que confirmar por WhatsApp.
- Bloquea: solo confirmar el valor (ya implementado y configurable, D-39; rango 10-100).
- Recomendación: 60 % del cupo de cada salida.

**P-28 · Volver a suscribir a quien se dio de baja** (nueva, ronda 1c)
- Por qué importa: si un cliente pidió no recibir promociones, marcar la casilla en una reserva nueva no lo vuelve a suscribir; solo el personal desde el panel, cuando el cliente lo pida. Ya implementado así (D-38); la agencia solo lo confirma.
- Bloquea: nada (confirmación).
- Recomendación: sí.

## Para el dueño del proyecto

**P-11 · Pagos en línea: ¿se incluyen en lo vendido y en qué fase?**
- Por qué importa: es el cambio de mayor alcance (pasarela, comisiones, contrato de la agencia con el proveedor).
- Bloquea: planificación de Fase 2 (H-PAG-6, H-PAG-7). Depende de P-19.
- Recomendación: Fase 2, tras 1-2 meses de registro manual.

**P-13 · Cuenta de AWS: a nombre de quién y quién paga** (reformulada)
- Por qué importa: los datos de los turistas viven ahí; los ≈ 25-30 USD/mes (D-19) deben tener un responsable. Los respaldos ya están resueltos (base administrada con respaldos diarios, D-15).
- Bloquea: la salida a producción.
- Recomendación: cuenta a nombre de la agencia o facturada a ella, con acceso administrado por el dueño del proyecto. Ver también las decisiones pendientes en `docs/arquitectura/backend-propio-aws.md` (región, base de pruebas, quién aprueba despliegues).

**P-16 · Alcance contratado**
- Por qué importa: hay que saber si cuentas de cliente, guías y reseñas son parte de lo vendido o trabajo adicional.
- Bloquea: confirmar `fases.md` y `modulos.md`.
- Recomendación: vender Fase 1 como lo acordado; Fase 2 y 3 como mejoras con su propio presupuesto.

**P-23 · ¿El sistema servirá a otras agencias en los próximos 12 meses?** (nueva)
- Por qué importa: si sí, cada dato debe separarse por empresa desde el inicio; agregarlo después es caro.
- Bloquea: diseño de la base antes de la Fase 1.
- Recomendación: si no hay un plan concreto, no hacerlo.

## Para el arquitecto

### Abiertas
**P-A10 · Dos horarios el mismo día en un tour:** Pueblos en ATV sale a las 10:00 y a las 14:00, pero la base guarda una sola hora de salida por tour. ¿Hora por salida, o dos tours? Depende de la respuesta de la agencia en P-6. (Bloquea H-CAT-8 para ese tour.)
**P-A11 · Pendiente que llega al corte antes de vencer:** la base vence por horas desde la creación; R21 propone vencerla también al llegar el corte o al pasar la fecha del tour, para que no queden pendientes viejas en el panel. ¿Lo hace el proceso que marca vencidas? (No afecta el cupo: después del corte nadie más puede reservar.)

### Resueltas (ronda 1b, propuesta de arquitectura aceptada por el dueño)
- **P-A1 · Anti-robots y límites:** Turnstile + protección contra duplicados + límites dentro de la operación de la API + límite por IP; ya no hay acceso directo a la base (D-20, D-31).
- **P-A2 · Vencimiento:** el cupo ignora al instante las pendientes vencidas; un proceso las marca como `vencidas` cada 5 minutos y avisa (D-23).
- **P-A3 · Avisos:** cola en la misma operación que la reserva, envío por SES con reintentos y alarma; WhatsApp manual en Fase 1 (D-32).
- **P-A4 · Pagos:** registros que solo se agregan; correcciones como registro nuevo; moneda y tipo de cambio; saldo calculado (D-33).
- **P-A5 · Acompañante:** tarifas por tour y líneas por reserva; el tour define si el cupo se cuenta en personas o vehículos (D-34).
- **P-A6 · "Mi reserva":** enlace de un solo uso por correo, vence en 24 h, respuesta siempre igual, límite por IP, sin Cognito (D-35).
- **P-A7 · Versiones de políticas:** versiones inmutables; la reserva guarda la que se aceptó (D-36).
- **P-A8 · Hosting:** S3 + CloudFront con dominio propio; `/tour/*` devuelve HTML con vista previa (D-21).
- **P-A9 · Panel con mucho volumen:** paginación, métricas en el servidor e índices (D-22).
