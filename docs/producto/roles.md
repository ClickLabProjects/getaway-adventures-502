# Roles

Ronda 1b · 2026-11-24. Cambio desde la ronda 1: el panel usará Cognito para entrar y la base nueva ya guarda el rol
de cada persona del panel (`dueno`, `admin`, `personal`, `guia`) y si está activa (D-16). Los **permisos por rol**
de la tabla de abajo siguen siendo propuesta (P-17).

## Lista de roles
| Rol | Existe hoy | Descripción | Fase |
|---|---|---|---|
| **Visitante / turista** | Sí `[ACTUAL]` | Cualquiera sin cuenta. Ve tours, promociones vigentes y fechas con cupo; crea reservas. No ve datos de nadie. | 1 |
| **Turista con reserva** (sin cuenta) | No · mecanismo `[DECIDIDO]` (D-35) | Quien recibe en el correo de su reserva un enlace de un solo uso (vence en 24 h). Con él ve su reserva, pide cambio o cancelación y se da de baja del marketing. | 2 |
| **Cliente registrado** | No `[PROPUESTA]` | Turista con cuenta, en un grupo de usuarios separado del panel (D-37). Ve el historial de sus reservas, sus datos y sus preferencias. Si ya había reservado sin cuenta con ese correo, ve también esas reservas. | 3 |
| **Administrador** | Sí `[ACTUAL]` · rol `admin` en la base nueva | Usuario de la agencia. Hoy tiene acceso total al panel: dashboard, reservaciones, tours, promociones, clientes. Entra con Cognito y segundo factor (D-37). | 1 |
| **Personal de reservas** | Rol `personal` ya en la base; permisos `[PROPUESTA]` | Empleado que atiende WhatsApp: ve y gestiona reservas y salidas, registra pagos. No edita precios, no ve el dashboard financiero completo, no exporta la base de clientes. | 2 |
| **Guía / operador** | Rol `guia` ya en la base; pantallas `[PROPUESTA]` | Ve solo la lista de viajeros de las salidas que tiene asignadas, y marca quién se presentó. | 3 |
| **Dueño** | Rol `dueno` ya en la base; permisos `[PROPUESTA]` | Igual al administrador, más: administrar usuarios del panel, cambiar los valores del negocio (H-OPE-9) y ver la bitácora. | 1 (rol) · 2 (pantallas) |
| **Sistema** | Parcial | Procesos automáticos de la API: marcar pendientes vencidas (cada pocos minutos; el cupo se libera al instante), enviar avisos y comprobantes por correo con reintentos, recordatorios (F2). | 1 |

Nota: nadie puede registrarse en el panel por su cuenta (D-37). En Fase 1 el alta la hace una persona del equipo
técnico (en Cognito y en la base); en Fase 2, el dueño desde el panel (H-CTA-6). Si hay empleados desde el
lanzamiento, los permisos por rol suben a Fase 1 (P-17).

## Permisos por módulo
Leyenda: **V** ver · **C** crear · **E** editar · **B** borrar/cancelar · **—** sin acceso · *(prop.)* = propuesta.

| Módulo | Visitante | Turista con reserva *(prop.)* | Cliente registrado *(prop.)* | Personal *(prop.)* | Guía *(prop.)* | Administrador | Dueño *(prop.)* |
|---|---|---|---|---|---|---|---|
| Catálogo de tours y salidas | V (activos) | V | V | V, E salidas (abrir/cerrar, cupo) | V sus salidas | V C E B | V C E B |
| Reservas | C | V la suya, pedir cambio/cancelación | V las suyas, C | V C E B | V sus salidas (lista) | V C E B | V C E B |
| Pagos y anticipos | — | V lo pagado de su reserva | V | V C (registrar pago) | — | V C E (reembolsos) | V C E |
| Notificaciones | recibe | recibe | recibe, elige canal | recibe avisos de reservas | recibe lista del día | configura | configura |
| Cuentas e inicio de sesión | registrarse *(F3)* | pedir enlace al correo *(F2)* | E sus datos, borrar cuenta | entrar al panel (2.º factor) | entrar al panel (2.º factor) | entrar (2.º factor) | E usuarios del panel |
| Panel de operación | — | — | — | V E | V (vista guía) | V E | V E |
| Dashboard | — | — | — | V operativo (ocupación) | — | V | V |
| Promociones | V vigentes, usar código | — | V vigentes y privadas propias *(F3)* | V | — | V C E B | V C E B |
| Clientes y marketing | darse de baja | darse de baja | E preferencias | V (sin exportar) | — | V, exportar, escribir | V, exportar, anonimizar |
| Contenido y políticas | V | V | V | V | V | E | E |
| Bitácora / historial | — | — | — | V de sus reservas | — | V | V |
| Valores del negocio (vencimiento, topes, corte) | — | — | — | — | — | V | V E *(F2)* |

## Reglas de acceso
`[ACTUAL]` en el sitio actual:
- El público solo lee tours activos, promociones vigentes y salidas futuras con cupo; crea reservas solo por la función del servidor que valida cupo y precio.
- Nadie sin rol de administrador puede leer reservaciones ni la base de clientes.
- Fotos del panel: solo administradores suben o borran.

`[DECIDIDO]` para la plataforma nueva (D-13, D-16, D-37):
- Solo la API habla con la base; el navegador nunca. La API niega todo por omisión y abre cada acción según el rol.
- La API no puede borrar reservas (ni con un error de programación): solo cambiarlas de estado.
- Quitar el acceso a una persona (inactiva) tiene efecto inmediato aunque su sesión siga abierta.
