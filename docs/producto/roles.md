# Roles

Ronda 1 · 2026-11-23

## Lista de roles
| Rol | Existe hoy | Descripción | Fase |
|---|---|---|---|
| **Visitante / turista** | Sí `[ACTUAL]` | Cualquiera sin cuenta. Ve tours, promociones vigentes y fechas con cupo; crea reservas. No ve datos de nadie. | 1 |
| **Turista con reserva** (sin cuenta) | No `[PROPUESTA]` | Quien tiene un código de reserva y el correo con el que reservó. Puede ver su reserva, pedir cambio o cancelación y darse de baja del marketing. | 2 |
| **Cliente registrado** | No `[PROPUESTA]` | Turista con cuenta (correo y enlace mágico o contraseña). Ve el historial de sus reservas, sus datos y sus preferencias. Si ya había reservado sin cuenta con ese correo, ve también esas reservas. | 3 |
| **Administrador** | Sí `[ACTUAL]` | Usuario de la agencia en `ga_admins`. Hoy tiene acceso total al panel: dashboard, reservaciones, tours, promociones, clientes. | 1 |
| **Personal de reservas** | No `[PROPUESTA]` | Empleado que atiende WhatsApp: ve y gestiona reservas y salidas, registra pagos. No edita precios, no ve el dashboard financiero completo, no exporta la base de clientes. | 2 |
| **Guía / operador** | No `[PROPUESTA]` | Ve solo la lista de viajeros de las salidas que tiene asignadas, y marca quién se presentó. | 3 |
| **Dueño** | No como rol separado `[PROPUESTA]` | Igual al administrador, más: administrar usuarios del panel y ver la bitácora de cambios. Hoy el dueño usa el rol administrador. | 2 |
| **Sistema** | Parcial | Procesos automáticos: vencer reservas pendientes, mandar avisos y comprobantes, recordatorios. | 1 |

Nota: alta de administradores hoy la hace una persona con `make-admin`; no hay pantalla para ello `[ACTUAL]`.

## Permisos por módulo
Leyenda: **V** ver · **C** crear · **E** editar · **B** borrar/cancelar · **—** sin acceso · *(prop.)* = propuesta.

| Módulo | Visitante | Turista con reserva *(prop.)* | Cliente registrado *(prop.)* | Personal *(prop.)* | Guía *(prop.)* | Administrador | Dueño *(prop.)* |
|---|---|---|---|---|---|---|---|
| Catálogo de tours y salidas | V (activos) | V | V | V, E salidas (abrir/cerrar, cupo) | V sus salidas | V C E B | V C E B |
| Reservas | C | V la suya, pedir cambio/cancelación | V las suyas, C | V C E B | V sus salidas (lista) | V C E B | V C E B |
| Pagos y anticipos | — | V lo pagado de su reserva | V | V C (registrar pago) | — | V C E (reembolsos) | V C E |
| Notificaciones | recibe | recibe | recibe, elige canal | recibe avisos de reservas | recibe lista del día | configura | configura |
| Cuentas e inicio de sesión | registrarse *(F3)* | — | E sus datos, borrar cuenta | entrar al panel | entrar al panel | entrar, MFA | E usuarios del panel |
| Panel de operación | — | — | — | V E | V (vista guía) | V E | V E |
| Dashboard | — | — | — | V operativo (ocupación) | — | V | V |
| Promociones | V vigentes, usar código | — | V vigentes y privadas propias *(F3)* | V | — | V C E B | V C E B |
| Clientes y marketing | darse de baja | darse de baja | E preferencias | V (sin exportar) | — | V, exportar, escribir | V, exportar, anonimizar |
| Contenido y políticas | V | V | V | V | V | E | E |
| Bitácora / historial | — | — | — | V de sus reservas | — | V | V |

## Reglas de acceso que ya existen `[ACTUAL]`
- El público solo lee tours activos, promociones vigentes y salidas futuras con cupo; crea reservas solo por la función del servidor que valida cupo y precio.
- Nadie sin rol de administrador puede leer reservaciones ni la base de clientes.
- Fotos del panel: solo administradores suben o borran.
