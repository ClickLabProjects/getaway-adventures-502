# Reglas de negocio

Ronda 1b · 2026-11-24. Cada regla lleva su etiqueta. Las `[PROPUESTA]` tienen una pregunta en `preguntas.md` (P-n).
Las reglas de dinero, cupo y permisos se aplican en el servidor (la API y la base), nunca solo en la pantalla.

Etiquetas: `[ACTUAL]` existe en el sitio actual · `[DECIDIDO]` confirmado por el dueño del proyecto o la agencia ·
`[PROPUESTA]` falta confirmar. **"(en base)"** significa que la regla ya está implementada en la base nueva
(`db/migrations/`) y falta que la API y las pantallas la usen. **"Valor por confirmar"** significa que el mecanismo está
decidido pero el número lo debe confirmar la agencia; se cambia sin programar (D-28).

## 0. Valores configurables (D-28)
| Valor | Inicial | Se usa en | Pregunta |
|---|---|---|---|
| Horas que una pendiente retiene cupo | 24 | R21 | P-5 |
| Máximo de personas por reserva en línea | 10 | R9 | P-4 |
| Máximo de pendientes a la vez por correo o teléfono | 2 | R10 | P-4 |
| Horas de corte por defecto (si el tour no tiene las suyas) | 12 | R2 | P-6 |
| Por tour: hora de salida y horas de corte | sin definir | R2 | P-6 |

Cada cambio de un valor queda registrado con quién y cuándo. En Fase 1 los cambia una persona del equipo técnico a
pedido de la agencia; en Fase 2, el dueño desde el panel (H-OPE-9).

## 1. Tiempo y fechas
- **R1.** Todas las fechas y horas del negocio ("hoy", vencimientos, cortes) se calculan en hora de Guatemala (UTC-6). `[DECIDIDO]` (en base, D-25)
- **R2.** Una salida se puede reservar en línea hasta su **cierre** = fecha de la salida + hora de salida del tour − horas de corte del tour (o las horas de corte por defecto si el tour no las define). `[DECIDIDO]` (en base, D-26) · Valores por tour por confirmar (P-6).
  - Si un tour no tiene hora de salida cargada, se toma como 00:00 de ese día; por eso **cada tour debe tener su hora de salida antes del lanzamiento**.
  - El personal puede registrar desde el panel una reserva fuera de plazo; el sitio público no. `[DECIDIDO]` (en base)
  - Un tour con dos horarios el mismo día (Pueblos ATV 10:00 y 14:00) está por resolver (P-6, P-A10). `[PROPUESTA]`
- **R3.** No se puede reservar una salida pasada, ni de un tour o salida inactivos. `[ACTUAL]` · reforzado en la base para salidas cerradas `[DECIDIDO]`

## 2. Cupo
- **R4.** Cada salida tiene un cupo. Cupos por omisión: Acatenango 20, Acatenango 4x4 8, demás 12. `[ACTUAL]` · Cupo real por tour por confirmar (P-3, cuestionario).
- **R5.** Ocupan cupo las reservas pendientes no vencidas, confirmadas y pagadas. Las canceladas, las vencidas y las pendientes cuyo plazo ya pasó no ocupan, aunque todavía no se hayan marcado como vencidas. `[DECIDIDO]` (en base, D-23)
- **R6.** Dos turistas no pueden quedarse con el último lugar. `[ACTUAL]` · ahora garantizado por la base `[DECIDIDO]` (D-24)
- **R7.** Reactivar una reserva cancelada o vencida, cambiarla de fecha o aumentar personas solo se permite si hay cupo. Confirmar o marcar pagada una reserva que ya ocupaba lugar nunca se bloquea por cupo. `[DECIDIDO]` (en base, D-24)
- **R8.** El cupo de una salida no puede bajar por debajo de las personas ya reservadas. `[DECIDIDO]` (en base, D-24)
- **R9.** Máximo de personas por reserva en línea: **10**. Grupos mayores se atienden por WhatsApp. Las reservas del panel no tienen este tope (la base acepta hasta 30 por reserva). `[DECIDIDO]` mecanismo · valor por confirmar (P-4)
- **R10.** Máximo **2 reservas pendientes vigentes a la vez** por el mismo correo o teléfono. `[DECIDIDO]` mecanismo · valor y alcance por confirmar (P-4: ¿en total o por salida?)
- **R11.** El formulario público exige la verificación anti-robots invisible de Turnstile. `[DECIDIDO]` (D-20)
- **R11b.** En los tours ATV el cupo puede contarse en cuatrimotos o en personas, según defina cada tour. `[DECIDIDO]` mecanismo (D-34) · cuál aplica por confirmar (P-3)

## 3. Precios y descuentos
- **R12.** El precio es por persona en quetzales; una salida puede tener precio especial que reemplaza el del tour. `[ACTUAL]`
- **R13.** El total lo calcula el servidor: subtotal = suma de (precio de cada tarifa × cantidad); descuento = subtotal × % de la promo, redondeado a centavos; total = subtotal − descuento. `[ACTUAL]` (tarifa única) · varias tarifas `[DECIDIDO]` (D-34)
- **R14.** Tours ATV (Pacaya ATV, Pueblos en ATV): el precio publicado es por **conductor** (una cuatrimoto); el acompañante paga su propia tarifa. Propuesta: Pueblos ATV acompañante = Q300 (50 % del texto actual); Pacaya ATV = lo que defina la agencia. `[PROPUESTA]` (P-3)
- **R15.** Una sola promoción por reserva. `[ACTUAL]`
- **R16.** Una promo es válida si está activa, dentro de su vigencia (hora de Guatemala), con descuento > 0 y es para ese tour o está marcada "para todos los tours". `[ACTUAL]` · alcance explícito `[DECIDIDO]` (en base, D-29)
- **R17.** Si el turista escribió un código, se valida antes de crear la reserva; si no es válido, la reserva no se crea con precio completo sin avisarle. `[PROPUESTA]`
- **R18.** Si se borra un tour, sus promociones se desactivan (no pasan a valer para todos). `[DECIDIDO]` (en base, D-29)
- **R19.** El precio de una reserva queda fijo al crearla. `[ACTUAL]`
- **R19b.** Descuento de 100 % (cortesía): solo con confirmación explícita en el panel. `[PROPUESTA]` (P-24)

## 4. Estados de una reserva
Estados: `pendiente`, `confirmada`, `pagada`, `cancelada` `[ACTUAL]` y `vencida` `[DECIDIDO]` (en base, D-23).
Propuestos `[PROPUESTA]` (P-7): `completada` y `no_show` (Fase 2), y llevar el estado de pago aparte (sin pago, anticipo, pagado, reembolsado) a partir de los pagos registrados (D-33).

```
pendiente ──(personal confirma)──► confirmada ──(pago total registrado)──► pagada
    │                                  │                                     │
    │(pasan N horas, R21)              │                                     │(día del tour, F2)
    ▼                                  ▼                                     ▼
 vencida ──(reactivar con cupo)──► … cancelada ◄────────────────── completada / no_show
```
- **R20.** Toda reserva nueva entra como `pendiente` con una fecha de vencimiento. `[ACTUAL]` / `[DECIDIDO]` (en base)
- **R21.** Una `pendiente` vence a las **24 h** de creada (valor configurable). Al vencer deja de ocupar cupo al instante; un proceso la marca `vencida` en pocos minutos y avisa al turista (Fase 2, H-NOT-4). `[DECIDIDO]` mecanismo · valor por confirmar (P-5)
  - Vencer también al llegar el corte o la fecha del tour: `[PROPUESTA]` (P-A11).
- **R22.** `cancelada` y `vencida` pueden volver a `pendiente` o `confirmada` solo si hay cupo (R7). Si vuelve a `pendiente`, recibe un plazo nuevo completo. `[DECIDIDO]` (en base)
- **R23.** Cancelar desde el panel pide confirmación y un motivo. Lista propuesta: cliente lo pidió, no pagó, clima o volcán, agencia canceló, duplicada, abuso, otro. `[PROPUESTA]` (P-22)
- **R24.** Cada cambio de estado, fecha, personas o monto queda en un historial con quién, cuándo y valor anterior. `[PROPUESTA]`
- **R25.** Cambio de fecha: a otra salida del mismo tour con cupo; el código no cambia; si la nueva fecha tiene otro precio, por defecto se cobra la diferencia y el personal puede mantener el original. `[PROPUESTA]` (P-8)
- **R26.** Un doble clic o reintento por red caída no crea dos reservas. `[DECIDIDO]` (en base, D-27)

## 5. Cancelaciones y reembolsos (el texto final lo redacta la agencia)
- **R27.** Propuesta de política `[PROPUESTA]` (P-1):
  - Más de **72 h** antes: reembolso total del anticipo o cambio de fecha sin costo.
  - Entre **72 h y 24 h**: un cambio de fecha sin costo, o reembolso del 50 % del anticipo.
  - **Menos de 24 h** o no se presenta: sin reembolso.
  - Cancelación por la agencia (clima, volcán, seguridad): cambio de fecha o reembolso total.
- **R28.** Aplica la política vigente el día de la reserva; se muestra antes de reservar y en el comprobante; la reserva guarda la versión aceptada. `[DECIDIDO]` mecanismo (D-36) · texto por confirmar (P-1)
- **R29.** Los reembolsos se registran (monto, método, fecha, quién) aunque se hagan fuera del sistema. `[DECIDIDO]` mecanismo (D-33)

## 6. Pagos y anticipos
- **R30.** No hay pago en línea en Fase 1; la reserva queda pendiente y se paga por WhatsApp, Instagram u oficina. `[ACTUAL]` / `[DECIDIDO]` (D-2)
- **R31.** Formas de pago aceptadas `[PROPUESTA]` (P-2): efectivo en oficina (Q o USD), transferencia o depósito, tarjeta en oficina, enlace de pago.
- **R32.** Anticipo para confirmar: **30 % del total**, saldo el día del tour antes de salir. `[PROPUESTA]` (P-2)
- **R33.** Cada pago se registra con monto, moneda, método, fecha y quién; los pagos no se editan ni se borran: una corrección es un registro nuevo. La reserva pasa a `pagada` cuando lo pagado cubre el total. `[DECIDIDO]` mecanismo (D-33)
- **R34.** Si se cobra en dólares, se registra el tipo de cambio usado. `[DECIDIDO]` mecanismo (D-33) · quién fija el tipo de cambio por confirmar (P-2)

## 7. Datos personales y consentimiento
- **R35.** Para reservar se piden solo nombre, correo, teléfono/WhatsApp, personas y notas opcionales. `[ACTUAL]`
- **R36.** El turista acepta el aviso de privacidad y la política de cancelación al reservar (casilla obligatoria con enlaces). `[PROPUESTA]`
- **R37.** El consentimiento de marketing es opcional, desmarcado por defecto `[ACTUAL]`, y vale la **decisión más reciente** del cliente (reserva, baja o cambio desde el panel). `[DECIDIDO]` (en base, D-30)
- **R38.** Cada mensaje de marketing incluye forma de darse de baja; la baja se aplica en todos los canales. `[PROPUESTA]`
- **R39.** El cliente puede pedir que se borren sus datos: se anonimizan sus reservas (se conservan montos y fechas). `[PROPUESTA]` (P-10)
- **R40.** Solo el personal del panel ve datos de clientes; exportar la base es solo para admin y dueño. Los datos personales nunca se guardan en los registros técnicos del servidor. `[ACTUAL]` / `[PROPUESTA]` (permisos por rol, P-17)
- **R41.** Reservas se conservan **5 años**; datos de marketing de quien no reserva en 3 años se borran. `[PROPUESTA]` (P-10)
- **R42.** "Mi reserva" (Fase 2) da acceso solo con un enlace de un solo uso enviado al correo de la reserva, que vence en 24 h. `[DECIDIDO]` (D-35)

## 8. Acceso al panel
- **R43.** Nadie puede crearse una cuenta del panel por su cuenta; el alta la hace el dueño (Fase 2) o una persona del equipo técnico (Fase 1). `[DECIDIDO]` (D-37)
- **R44.** Entrar al panel exige contraseña y segundo factor (app autenticadora). `[DECIDIDO]` (D-37)
- **R45.** Quitar el acceso a una persona tiene efecto inmediato (se marca inactiva en la base). `[DECIDIDO]` (D-16)
