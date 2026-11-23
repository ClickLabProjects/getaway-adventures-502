# Módulos

Ronda 1b · 2026-11-24. El conjunto de módulos sigue siendo `[PROPUESTA]` hasta que el dueño confirme el alcance (P-16).

**Cambio de plataforma (D-13 a D-22):** el sitio y el panel dejan de hablar directo con Supabase y pasan a hablar con
una **API propia** (NestJS) sobre PostgreSQL, en AWS Lightsail. Login del panel con Cognito, correos con SES, imágenes
en S3, sitio en S3 + CloudFront con dominio propio. **No se lanza la versión actual** (D-18): todo lo de Fase 1 se
construye sobre la plataforma nueva. Por eso el estado "existe" ahora significa "existe en el sitio actual y hay que
llevarlo a la API".

| Código | Módulo | Estado | Fase principal | Historias |
|---|---|---|---|---|
| CAT | Catálogo de tours y salidas | existe (pasar a la API) | 1 | `historias/catalogo.md` |
| RES | Reservas | parcial (reglas clave ya en la base nueva) | 1 | `historias/reservas.md` |
| PAG | Pagos y anticipos | nuevo | 1 (registro manual) · 2 (en línea) | `historias/pagos.md` |
| NOT | Notificaciones y comprobantes | nuevo | 1 | `historias/notificaciones.md` |
| CTA | Cuentas e inicio de sesión | parcial (roles ya en la base nueva) | 1 (panel con Cognito) · 2 (usuarios del panel, "Mi reserva") · 3 (clientes) | `historias/cuentas.md` |
| OPE | Panel de operación | parcial | 1 · 2 · 3 | `historias/operacion.md` |
| DSH | Dashboard | existe (pasar a la API) | 1 · 2 | `historias/dashboard.md` |
| PRO | Promociones | existe (corrección de alcance ya en la base) | 1 · 2 | `historias/promociones.md` |
| CLI | Clientes y marketing | parcial (consentimiento ya en la base) | 1 · 2 | `historias/clientes.md` |
| POL | Contenido y políticas | nuevo | 1 | `historias/politicas.md` |
| RSN | Reseñas y fidelización | nuevo | 3 | `historias/resenas.md` |

Módulos con trabajo en cada fase: **Fase 1: 10** (todos menos RSN; PAG y CTA en su parte mínima) ·
**Fase 2: 10** (ampliaciones; lo nuevo es pago en línea, usuarios del panel, "Mi reserva" y valores editables) ·
**Fase 3: 4** (CTA cuentas de cliente, OPE vista del guía, PRO privadas por cliente, RSN).

---

## CAT · Catálogo de tours y salidas
- **Objetivo:** mostrar cada tour con fotos, qué incluye, horario, punto de salida, precio y fechas con cupo, en EN/ES.
- **Roles:** visitante (ve), admin y dueño (crean, editan, dan de baja, abren y cierran fechas).
- **Estado:** existe `[ACTUAL]` (7 tours, salidas diarias, precio especial, mapa, fotos, bilingüe). En la base nueva ya
  están la hora de salida y las horas de corte por tour, el cupo que no baja de lo vendido y la hora de Guatemala `[DECIDIDO]`.
- **Falta:** leer el catálogo desde la API; fotos en S3; enlaces directos `/tour/...` con vista previa en WhatsApp (D-21);
  pantalla para hora de salida y corte por tour; tarifa de acompañante en ATV y cupo por vehículo (D-34, P-3); punto de
  encuentro; error de red distinto de "no existe".
- **Depende de:** POL (textos por tour), plataforma (API, S3).
- **Fase:** 1; 2 (tours privados, información práctica).

## RES · Reservas
- **Objetivo:** que el turista aparte su lugar y la agencia gestione la reserva de principio a fin.
- **Roles:** visitante (crea), personal/admin/dueño (gestionan), sistema (vence pendientes).
- **Estado:** parcial. Sitio actual: crea con cupo, código GA-XXXXXX, promo y consentimiento; el panel cambia estado y
  exporta CSV `[ACTUAL]`. Base nueva: cupo protegido, estado `vencida` con plazo, corte por tour, protección contra
  duplicados, límites configurables `[DECIDIDO]`.
- **Falta:** crear la reserva a través de la API con Turnstile y los límites; cambiar fecha o personas; cancelar con
  motivo; cancelación masiva; historial de cambios; aceptación de políticas.
- **Depende de:** CAT, NOT, POL, PAG.
- **Fase:** 1; 2 ("Mi reserva" por enlace al correo).

## PAG · Pagos y anticipos
- **Objetivo:** saber cuánto debe cada reserva, cuánto pagó, cómo y cuándo; más adelante, cobrar en línea.
- **Roles:** personal (registra pagos), admin/dueño (reembolsos y correcciones), turista (ve su saldo; paga en línea en F2).
- **Estado:** nuevo. Hoy solo existe el estado `pagada` sin monto, método ni fecha `[ACTUAL]`. Modelo decidido: pagos
  que solo se agregan, con moneda y tipo de cambio (D-33).
- **Fase:** 1 = registrar pagos manuales y anticipo; 2 = pago en línea (depende de P-11 y P-19).
- **Depende de:** RES, POL (forma de pago, P-2), NOT.

## NOT · Notificaciones y comprobantes
- **Objetivo:** que nadie dependa de abrir el panel: aviso inmediato al operador y comprobante al turista.
- **Roles:** sistema (envía), admin/dueño (definen destinatarios), turista y personal (reciben).
- **Estado:** nuevo. Hoy no hay ningún aviso `[ACTUAL]`.
- **Decidido:** envío por correo con SES, con cola y reintentos (D-17, D-32). **WhatsApp automático no entra en Fase 1**:
  el aviso al operador llega por correo y el personal escribe al turista por WhatsApp a mano (botón de un clic, H-OPE-4).
- **Fase:** 1 = aviso al operador por correo, comprobante al turista en su idioma, confirmación que sobrevive a la
  recarga; 2 = recordatorio, aviso de cambio/cancelación/vencimiento, resumen diario, enlace de "Mi reserva".
- **Depende de:** RES, POL; dominio y remitente de la agencia (P-9).

## CTA · Cuentas e inicio de sesión
- **Objetivo:** que cada persona entre con el nivel de acceso que le corresponde.
- **Estado:** parcial. Sitio actual: login de administradores con correo y contraseña `[ACTUAL]`. Decidido: Cognito,
  sin registro público, segundo factor obligatorio; la base ya guarda el rol de cada persona (dueño, admin, personal,
  guía) y si está activa (D-16, D-37).
- **Fase:** 1 = login del panel con Cognito y segundo factor, recuperar contraseña, alta de usuarios hecha por el equipo
  técnico; 2 = permisos distintos por rol y pantalla para que el dueño administre usuarios (suben a Fase 1 si P-17 dice
  que hay empleados desde el inicio), "Mi reserva" por enlace al correo (D-35); 3 = cuentas de cliente.
- **Depende de:** plataforma (Cognito), RES, CLI.

## OPE · Panel de operación
- **Objetivo:** el trabajo diario: qué sale hoy y mañana, quién va, quién no ha pagado.
- **Roles:** personal, admin, dueño; guía (F3).
- **Estado:** parcial — pestañas Reservaciones y Tours y salidas `[ACTUAL]`. El panel pasa a hablar con la API, con
  páginas de resultados (sin límite de 1000 filas) (D-22).
- **Falta:** lista de viajeros por salida, pendientes por vencer, asistencia y no-show (F2), editar valores del negocio
  (F2, H-OPE-9), vista del guía (F3).
- **Fase:** 1 · 2 · 3.

## DSH · Dashboard
- **Objetivo:** ventas, cobrado, por cobrar, ocupación y promociones de un vistazo.
- **Estado:** existe `[ACTUAL]`. Las cifras pasan a calcularse en el servidor (D-22), así que son correctas con cualquier volumen.
- **Falta:** "por cobrar" sin viajes pasados; cobrado basado en pagos reales (PAG).
- **Fase:** 1 (pasar a la API y correcciones); 2 (no-show, origen del cliente, idioma, exportar).

## PRO · Promociones
- **Objetivo:** atraer reservas con descuentos visibles en la portada o por código.
- **Estado:** existe `[ACTUAL]`. En la base nueva cada promo vale para un tour o "para todos" a propósito, y se desactiva
  si se borra su tour `[DECIDIDO]` (D-29).
- **Falta:** casilla "para todos los tours" en el panel; aplicar el código aunque no se pulse "Apply"; confirmar
  descuentos de 100 %; revisar y reactivar las promociones globales que quedaron pausadas (P-24).
- **Fase:** 1; 2 (privadas, límite de usos, monto fijo).

## CLI · Clientes y marketing
- **Objetivo:** base de clientes para volver a venderles, con consentimiento válido.
- **Estado:** parcial `[ACTUAL]` (base por correo, segmentos, mensajes, exportación). En la base nueva el consentimiento
  es un historial y vale la última decisión `[DECIDIDO]` (D-30).
- **Falta:** enlace para darse de baja, marcar baja desde el panel, anonimizar a petición, CSV seguro.
- **Fase:** 1 (baja, anonimizar); 2 (envíos desde el sistema, segmentos guardados).

## POL · Contenido y políticas
- **Objetivo:** que el turista sepa, antes de reservar, cómo paga, qué pasa si cancela, dónde se encuentra con el guía y cómo se usan sus datos.
- **Estado:** nuevo. **El contenido lo redacta o aprueba la agencia** (P-1, P-2, P-10, P-14, P-20). Las políticas
  tienen versiones y cada reserva guarda la que aceptó (D-36).
- **Fase:** 1 (cancelación, forma de pago, punto de encuentro, privacidad, términos; aceptación al reservar);
  2 (editar desde el panel, qué llevar, preguntas frecuentes).
- **Depende de:** nada técnico; bloquea RES, NOT y PAG.

## RSN · Reseñas y fidelización
- **Objetivo:** pedir reseña después del tour, mostrarlas y premiar al cliente que vuelve.
- **Estado:** nuevo. **Fase:** 3. **Depende de:** NOT, CLI, OPE (asistencia).
