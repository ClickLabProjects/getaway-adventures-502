# Reglas de negocio

Ronda 1 · 2026-11-23. Cada regla lleva su etiqueta. Las `[PROPUESTA]` tienen una pregunta en `preguntas.md` (P-n).
Las reglas de dinero, cupo y permisos se aplican en el servidor, nunca solo en la pantalla.

## 1. Tiempo y fechas
- **R1.** Todas las fechas y horas del negocio se interpretan en hora de Guatemala (America/Guatemala, UTC-6). `[PROPUESTA]` — hoy se usa UTC y a partir de las 18:00 "hoy" ya es mañana.
- **R2.** Una salida es reservable hasta su **hora de corte**. Propuesta: cada tour tiene hora de corte; por omisión, 18:00 del día anterior a la salida. `[PROPUESTA]` (P-6)
- **R3.** No se puede reservar una salida de una fecha pasada ni de un tour o salida inactivos. `[ACTUAL]`

## 2. Cupo
- **R4.** Cada salida tiene un cupo en personas. Los cupos por omisión: Acatenango 20, Acatenango 4x4 8, demás 12. `[ACTUAL]`
- **R5.** Ocupan cupo las reservas en estado pendiente (no vencida), confirmada y pagada. Las canceladas y vencidas no. `[ACTUAL]` para canceladas; vencida es `[PROPUESTA]`.
- **R6.** La validación de cupo es atómica: dos turistas no pueden quedarse con el último lugar. `[ACTUAL]`
- **R7.** Reactivar una reserva cancelada, cambiarla de fecha o aumentar personas solo se permite si hay cupo. `[PROPUESTA]`
- **R8.** El cupo de una salida no puede bajar por debajo de las personas ya reservadas. `[PROPUESTA]`
- **R9.** Máximo de personas por reserva en línea: **10** `[PROPUESTA]` (P-4). Grupos mayores se atienden por WhatsApp.
- **R10.** Máximo **2 reservas pendientes** por el mismo correo o teléfono en la misma salida. `[PROPUESTA]` (P-4)
- **R11.** El formulario público exige una verificación anti-robots invisible. `[PROPUESTA]`

## 3. Precios y descuentos
- **R12.** El precio es por persona en quetzales; una salida puede tener precio especial que reemplaza el del tour. `[ACTUAL]`
- **R13.** El total lo calcula el servidor: subtotal = precio × personas; descuento = subtotal × % de la promo redondeado a centavos; total = subtotal − descuento. `[ACTUAL]`
- **R14.** Tours en ATV (Pacaya ATV, Pueblos en ATV): el precio publicado es por **conductor** (una cuatrimoto). El acompañante (copiloto) paga un precio propio que se elige al reservar. Propuesta: Pueblos ATV copiloto = 50% (Q300) según el texto actual; Pacaya ATV = monto que defina la agencia. `[PROPUESTA]` (P-3)
- **R15.** Una sola promoción por reserva. `[ACTUAL]`
- **R16.** Una promo es válida si está activa, dentro de su vigencia (en hora de Guatemala), con descuento > 0 y es para ese tour o para todos. `[ACTUAL]`
- **R17.** Si el turista escribió un código, se valida antes de enviar; si no es válido, la reserva no se crea con precio completo sin avisarle. `[PROPUESTA]`
- **R18.** Si se borra un tour, sus promociones se desactivan (no pasan a valer para todos). `[PROPUESTA]`
- **R19.** El precio de una reserva queda fijo al crearla; cambios posteriores de precio del tour no la afectan. `[ACTUAL]`

## 4. Estados de una reserva
Estados actuales `[ACTUAL]`: `pendiente`, `confirmada`, `pagada`, `cancelada`.
Estados propuestos `[PROPUESTA]` (P-7): agregar `vencida` y `completada` / `no_show`, y separar el estado de pago del estado de la reserva (pago: sin pago, anticipo, pagado, reembolsado).

```
pendiente ──(personal confirma por WhatsApp)──► confirmada ──(pago total registrado)──► pagada
    │                                              │                                     │
    │(sin confirmar en X horas)                    │                                     │(día del tour)
    ▼                                              ▼                                     ▼
 vencida                                      cancelada ◄──────────────────────── completada / no_show
```
- **R20.** Toda reserva nueva entra como `pendiente`. `[ACTUAL]`
- **R21.** Una `pendiente` vence si no se confirma en **24 horas** o, si el tour sale antes, al llegar la hora de corte. Al vencer libera el cupo y se avisa al turista. `[PROPUESTA]` (P-5)
- **R22.** `cancelada` y `vencida` pueden volver a `pendiente`/`confirmada` solo si hay cupo (R7). `[PROPUESTA]`
- **R23.** Cancelar desde el panel pide confirmación y un motivo (cliente lo pidió, no pagó, clima, agencia canceló, duplicada, abuso). `[PROPUESTA]`
- **R24.** Cada cambio de estado, fecha, personas o monto queda en un historial con quién, cuándo y valor anterior. `[PROPUESTA]`
- **R25.** Cambio de fecha: se puede mover a otra salida del mismo tour con cupo; el precio se mantiene salvo que la nueva fecha tenga precio especial distinto, en cuyo caso decide el personal (P-8). El código de reserva no cambia. `[PROPUESTA]`
- **R26.** Un doble clic o reintento por red caída no crea dos reservas. `[PROPUESTA]`

## 5. Cancelaciones y reembolsos (texto final lo redacta la agencia)
- **R27.** Propuesta de política `[PROPUESTA]` (P-1):
  - Cancelación por el turista con **más de 72 h** de anticipación: reembolso total del anticipo o cambio de fecha sin costo.
  - Entre **72 h y 24 h**: cambio de fecha sin costo una vez, o reembolso del 50% del anticipo.
  - **Menos de 24 h** o no se presenta: sin reembolso.
  - Cancelación por la agencia (clima, volcán, seguridad): cambio de fecha o reembolso total.
- **R28.** La política que aplica es la vigente el día que se hizo la reserva, y se muestra antes de reservar y en el comprobante. `[PROPUESTA]`
- **R29.** Los reembolsos se registran (monto, método, fecha, quién) aunque se hagan fuera del sistema. `[PROPUESTA]`

## 6. Pagos y anticipos
- **R30.** Hoy no hay pago en línea; la reserva queda pendiente y se paga por WhatsApp/Instagram/oficina. `[ACTUAL]`
- **R31.** Formas de pago aceptadas (lista que debe confirmar la agencia) `[PROPUESTA]` (P-2): efectivo en oficina (Q o USD), transferencia o depósito bancario, tarjeta en oficina, enlace de pago.
- **R32.** Anticipo para confirmar: **30% del total**, saldo el día del tour antes de salir. `[PROPUESTA]` (P-2)
- **R33.** Cada pago se registra con monto, moneda, método, fecha y quién lo registró; la reserva pasa a `pagada` cuando lo pagado cubre el total. `[PROPUESTA]`
- **R34.** Si se cobra en dólares, se registra el tipo de cambio usado. `[PROPUESTA]` (P-2)

## 7. Datos personales y consentimiento
- **R35.** Para reservar se piden solo nombre, correo, teléfono/WhatsApp, personas y notas opcionales. `[ACTUAL]`
- **R36.** El turista acepta el aviso de privacidad y la política de cancelación al reservar (casilla obligatoria con enlaces). `[PROPUESTA]`
- **R37.** El consentimiento de marketing es opcional, desmarcado por defecto `[ACTUAL]`, y vale la **última decisión** del cliente, no "alguna vez dijo sí". `[PROPUESTA]`
- **R38.** Cada mensaje de marketing incluye forma de darse de baja; la baja se aplica en todos los canales. `[PROPUESTA]`
- **R39.** El cliente puede pedir que se borren sus datos: se anonimizan sus reservas (se conservan montos y fechas para contabilidad). `[PROPUESTA]` (P-10)
- **R40.** Solo administradores (y en F2 el personal) ven datos de clientes; exportar la base es solo para administrador/dueño. `[ACTUAL]` / `[PROPUESTA]`
- **R41.** Los datos de reservas se conservan **5 años** por contabilidad; los datos de marketing de quien no reserva en 3 años se borran. `[PROPUESTA]` (P-10)
