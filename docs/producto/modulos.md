# Módulos

Ronda 1 · 2026-11-23. El dueño mencionó "inicio de sesión, reservas, dashboard y otras cosas"; el conjunto
completo de abajo es `[PROPUESTA]` salvo lo marcado `[ACTUAL]`.

| Código | Módulo | Estado | Fase principal | Historias |
|---|---|---|---|---|
| CAT | Catálogo de tours y salidas | existe | 1 (ajustes) | `historias/catalogo.md` |
| RES | Reservas | parcial | 1 | `historias/reservas.md` |
| PAG | Pagos y anticipos | nuevo | 1 (registro manual) · 2 (en línea) | `historias/pagos.md` |
| NOT | Notificaciones y comprobantes | nuevo | 1 | `historias/notificaciones.md` |
| CTA | Cuentas e inicio de sesión | parcial | 1 (admin) · 2 (personal, "mi reserva") · 3 (clientes) | `historias/cuentas.md` |
| OPE | Panel de operación (reservas del día, salidas, guías) | parcial | 1 · 2 · 3 | `historias/operacion.md` |
| DSH | Dashboard | existe | 1 (correcciones) · 2 | `historias/dashboard.md` |
| PRO | Promociones | existe | 1 (correcciones) · 2 | `historias/promociones.md` |
| CLI | Clientes y marketing | parcial | 1 (consentimiento, privacidad) · 2 | `historias/clientes.md` |
| POL | Contenido y políticas | nuevo | 1 | `historias/politicas.md` |
| RSN | Reseñas y fidelización | nuevo | 3 | `historias/resenas.md` |

Fase 1 = salida a producción. Módulos con trabajo en cada fase: **Fase 1: 10** (todos menos RSN; PAG y CTA solo
en su parte mínima) · **Fase 2: 10** (ampliaciones; lo nuevo es pago en línea, rol de personal y "Mi reserva") ·
**Fase 3: 4** (CTA cuentas de cliente, OPE vista del guía, PRO privadas por cliente, RSN).

---

## CAT · Catálogo de tours y salidas
- **Objetivo:** mostrar cada tour con fotos, qué incluye, horario, punto de salida, precio y fechas con cupo, en EN/ES.
- **Roles:** visitante (ve), administrador (crea, edita, da de baja, abre y cierra fechas).
- **Estado:** existe `[ACTUAL]` — 7 tours reales, salidas diarias con cupo y precio especial opcional, mapa, fotos, bilingüe.
- **Falta:** hora de corte por tour, fechas calculadas en hora de Guatemala, precio de acompañante en ATV, punto de
  encuentro claro, que no se pueda bajar el cupo por debajo de lo vendido, mensajes de error de red distintos de "no existe".
- **Depende de:** POL (textos de políticas por tour).
- **Fase:** 1 (ajustes); 2 (tours privados, calendario de temporadas).

## RES · Reservas
- **Objetivo:** que el turista aparte su lugar y la agencia gestione la reserva de principio a fin.
- **Roles:** visitante (crea), administrador / personal (gestiona), sistema (vence pendientes).
- **Estado:** parcial `[ACTUAL]` — se crea con cupo atómico, código GA-XXXXXX, promo y consentimiento; el panel cambia
  estado y exporta CSV.
- **Falta:** tope de personas y límite anti-abuso, vencimiento de pendientes, protección ante doble envío, cambiar
  fecha o personas, cancelar con confirmación y motivo, cancelación masiva, reactivar solo si hay cupo, historial de cambios.
- **Depende de:** CAT, NOT (comprobante y aviso), POL (política de cancelación), PAG.
- **Fase:** 1; 2 (autoservicio del turista).

## PAG · Pagos y anticipos
- **Objetivo:** saber cuánto debe cada reserva, cuánto pagó, cómo y cuándo; más adelante, cobrar en línea.
- **Roles:** administrador / personal (registra), turista (ve su saldo, paga en línea en F2).
- **Estado:** nuevo. Hoy solo existe el estado `pagada` sin monto, método ni fecha `[ACTUAL]`.
- **Fase:** 1 = registrar pagos manuales (efectivo, transferencia, tarjeta en oficina, enlace de pago) y anticipo;
  2 = pago en línea con pasarela (anticipo o total) y reembolsos registrados.
- **Depende de:** RES, POL (forma de pago), NOT. Pregunta al arquitecto sobre la pasarela.

## NOT · Notificaciones y comprobantes
- **Objetivo:** que nadie dependa de abrir el panel: aviso inmediato al operador y comprobante al turista.
- **Roles:** sistema (envía), administrador (configura destinatarios), turista y personal (reciben).
- **Estado:** nuevo. Hoy no hay ningún aviso y el código de reserva se pierde si se recarga la página `[ACTUAL]`.
- **Fase:** 1 = aviso al operador, correo de comprobante en el idioma del turista, confirmación que sobrevive a la recarga;
  2 = recordatorio antes del tour, aviso de cambio de fecha/cancelación, correo de "reserva vencida".
- **Depende de:** RES, POL. Necesita servicio externo (correo/WhatsApp) en Edge Functions.

## CTA · Cuentas e inicio de sesión
- **Objetivo:** que cada persona entre con el nivel de acceso que le corresponde.
- **Estado:** parcial `[ACTUAL]` — login de administradores con correo y contraseña; no hay cuentas de clientes.
- **Fase:** 1 = login de admin seguro (sin registro público, MFA, recuperar contraseña);
  2 = roles personal y dueño, gestión de usuarios del panel, "Mi reserva" con código + correo sin cuenta;
  3 = cuentas de cliente que se vinculan con reservas previas del mismo correo.
- **Depende de:** RES, CLI.

## OPE · Panel de operación
- **Objetivo:** el trabajo diario de la agencia: qué sale hoy y mañana, quién va, quién no ha pagado.
- **Roles:** administrador, personal, guía (F3).
- **Estado:** parcial — existen las pestañas Reservaciones y Tours y salidas `[ACTUAL]`.
- **Falta:** vista por salida (lista de viajeros), lista imprimible/compartible para el guía, alertas de pendientes por
  vencer, buscar sin límite de 1000 filas, marcar asistencia y no-show.
- **Fase:** 1 (lista por salida, paginación); 2 (asistencia, asignar guía); 3 (vista del guía).

## DSH · Dashboard
- **Objetivo:** ventas, cobrado, por cobrar, ocupación y promociones de un vistazo.
- **Estado:** existe `[ACTUAL]` (ventas, cobrado, por cobrar, ticket promedio, cancelación, ventas por periodo y tour,
  viajeros por día, ocupación 14 días, rendimiento de promos).
- **Falta:** cifras correctas con más de 1000 reservas, "por cobrar" sin viajes pasados, cobrado basado en pagos reales (PAG).
- **Fase:** 1 (correcciones); 2 (no-show, origen del cliente, idioma, exportar).

## PRO · Promociones
- **Objetivo:** atraer reservas con descuentos visibles en la portada o por código.
- **Estado:** existe `[ACTUAL]` (título, imagen, código, % descuento, vigencia, tour, EN/ES).
- **Falta:** aplicar el código aunque no se pulse "Apply", no convertir en global la promo de un tour borrado,
  confirmar descuentos de 100%. F2: promociones privadas, límite de usos, monto fijo.
- **Fase:** 1 (correcciones); 2 (nuevas reglas).

## CLI · Clientes y marketing
- **Objetivo:** base de clientes para volver a venderles, con consentimiento válido.
- **Estado:** parcial `[ACTUAL]` — base agrupada por correo, segmentos, mensajes por WhatsApp/correo, exportación,
  filtro "acepta promociones".
- **Falta:** consentimiento revocable y basado en la última decisión del cliente, enlace para darse de baja,
  anonimizar a un cliente a petición, CSV seguro, envíos masivos que no se corten.
- **Fase:** 1 (consentimiento, baja, anonimizar); 2 (envíos desde el sistema, segmentos guardados).

## POL · Contenido y políticas
- **Objetivo:** que el turista sepa, antes de reservar, cómo paga, qué pasa si cancela, dónde se encuentra con el guía y cómo se usan sus datos.
- **Estado:** nuevo. No existe ningún texto de política `[ACTUAL]`. **El contenido lo debe redactar la agencia.**
- **Fase:** 1 (cancelación, forma de pago, punto de encuentro, privacidad, términos; aceptación en la reserva);
  2 (preguntas frecuentes, qué llevar, requisitos físicos por tour).
- **Depende de:** nada técnico; bloquea RES, NOT y PAG.

## RSN · Reseñas y fidelización
- **Objetivo:** pedir reseña después del tour, mostrarlas y premiar al cliente que vuelve.
- **Estado:** nuevo.
- **Fase:** 3.
- **Depende de:** NOT, CLI, OPE (asistencia).
