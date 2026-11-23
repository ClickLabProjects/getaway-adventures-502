# Fases

Ronda 1b · 2026-11-24. El reparto por fases sigue siendo `[PROPUESTA]` hasta que el dueño confirme el alcance (P-16)
y la agencia sus prioridades (P-18). Lo marcado `[DECIDIDO]` ya lo resolvió el dueño del proyecto.
Criterio: Fase 1 es lo mínimo para vender con confianza y sin riesgo de perder reservas, dinero o datos.

## Fase 1 · Salida a producción (sobre el backend nuevo)
**Por qué:** el informe `docs/revision-pre-produccion.md` marcó 4 bloqueantes; tres afectan directo al negocio
(cupos bloqueables, nadie se entera de las reservas, respaldos) y faltan textos que el turista necesita para confiar.
**El dueño decidió no lanzar la versión actual** (D-18): la Fase 1 sale cuando la API nueva, el panel y el sitio
funcionen sobre AWS Lightsail.

### Plataforma (prerrequisito, no son historias de producto) `[DECIDIDO]`
API NestJS + PostgreSQL administrada en Lightsail con respaldos diarios (resuelve los bloqueantes 2 y 4 del informe),
login con Cognito, correos con SES, imágenes en S3, sitio en S3 + CloudFront con dominio propio, Turnstile.
Pendiente del dueño: cuenta de AWS y quién paga (P-13). Pendiente de la agencia: dominio y correo remitente (P-9).

### Producto
| Tema | Historias | Bloqueante del informe | Estado |
|---|---|---|---|
| Anti-abuso: tope de personas, límite por contacto, Turnstile | H-RES-3 | Bloqueante 1 | En base; falta API. Valores por confirmar (P-4) |
| Vencimiento de pendientes que libera cupo | H-RES-4 | Bloqueante 1 | En base; falta proceso que marca y pantalla. Valor por confirmar (P-5) |
| Aviso al operador (correo) y comprobante al turista; confirmación que sobrevive a recargar | H-NOT-1, H-NOT-2, H-RES-7 | Bloqueante 3 | Decidido (SES). Falta P-9 |
| Políticas: cancelación, pago, punto de encuentro, privacidad, términos; aceptación al reservar | H-POL-1..4, H-RES-8, H-CAT-4, H-PAG-1 | Importantes 9 y 13 | Falta texto de la agencia (P-1, P-2, P-10, P-14) |
| Precio de acompañante en ATV y cupo por vehículo | H-RES-9, H-CAT-5 | Importante 14 | Mecanismo decidido (D-34). Falta P-3 |
| Cambiar fecha o personas; cancelar con motivo; reactivar con cupo | H-RES-10..12 | Importantes 1 y 18 | Cupo en base; falta API, pantalla, P-8, P-22 |
| Hora de Guatemala y corte por tour | H-RES-5, H-CAT-8 | Importante 3 | En base. Falta hora y corte de cada tour (P-6) |
| Promo aplicada sin "Apply"; promo de tour borrado; "para todos" | H-PRO-2, H-PRO-3, H-PRO-5 | Importantes 2 y 4 | Borrado resuelto en base; falta pantalla y P-24 |
| Reintento sin duplicar; errores de red claros | H-RES-6, H-CAT-3, H-CTA-1 | Importantes 5 y 6 | Duplicados en base; faltan mensajes |
| Consentimiento por última decisión, baja, anonimizar | H-CLI-2, H-CLI-3, H-CLI-5 | Importantes 7 y 9 | Consentimiento en base; falta baja y anonimizar |
| Registro manual de pagos y anticipo | H-PAG-2, H-PAG-3, H-DSH-3 | — (necesario si hay anticipo) | Modelo decidido (D-33) |
| Panel sobre la API: lista por salida, WhatsApp +502, CSV seguro, páginas de resultados | H-OPE-1, 2, 4, 5, H-DSH-2 | Importantes 8, 15, 16 | Paginación decidida (D-22) |
| Login del panel con Cognito, segundo factor y recuperar contraseña | H-CTA-1..4 | Mejoras | Decidido (D-16, D-37) |

Deseable en Fase 1 si da el tiempo (debería): historial de cambios (H-RES-13), cancelación masiva (H-RES-14),
reservas creadas desde el panel (H-RES-15), pendientes por vencer (H-OPE-3), aviso de confirmación (H-NOT-3),
reembolsos (H-PAG-4, H-PAG-5), doble confirmación del consentimiento (H-CLI-4).
**Sube a "debe" si P-17 dice que hay empleados desde el lanzamiento:** permisos por rol (H-CTA-5).

**Antes de lanzar, la agencia debe confirmar** los valores configurables (vencimiento, máximo de personas, pendientes
por contacto, corte por defecto) y la hora de salida y corte de cada tour. Los valores se cargan sin programar.

**Fuera de Fase 1 a propósito:** pagos en línea, WhatsApp automático, cuentas de cliente, "Mi reserva". Agregan
proveedores, contratos y riesgo; la agencia ya cobra y conversa por WhatsApp y en oficina.

## Fase 2 · Ordenar la operación y cobrar en línea (1 a 3 meses después del lanzamiento)
**Por qué:** cuando haya volumen, el WhatsApp manual no escala y los no-shows cuestan dinero. El orden lo fija P-18.
- Recordatorio el día anterior, resumen diario, avisos de cambio/cancelación/vencimiento (H-NOT-4..6).
- "Mi reserva" con enlace de un solo uso al correo: ver, cancelar, pedir cambio (H-RES-16, D-35).
- Permisos por rol y pantalla de usuarios del panel (H-CTA-5, H-CTA-6), si no subieron a Fase 1.
- Editar valores del negocio desde el panel (H-OPE-9).
- Asistencia y no-show (H-OPE-7); indicadores nuevos (H-DSH-6).
- Pago del anticipo en línea y enlaces de pago (H-PAG-6, H-PAG-7). Depende de P-11 y P-19.
- Promociones privadas, límite de usos, monto fijo (H-PRO-6, H-PRO-7).
- Envío de correos de marketing desde el sistema (H-CLI-6).
- Políticas editables desde el panel, qué llevar, preguntas frecuentes (H-POL-5..7); solicitud de tour privado (H-CAT-9).
- WhatsApp automático (requiere proveedor y costo aparte; decisión del dueño).

## Fase 3 · Crecer y fidelizar
**Por qué:** solo vale la pena con clientes que repiten y con más de un guía u operador.
- Cuentas de cliente vinculadas a reservas previas (H-CTA-7, H-RES-17), en un grupo de usuarios separado del panel.
- Vista del guía y asignación de guías (H-OPE-8); el rol `guía` ya existe en la base.
- Reseñas y descuento para cliente frecuente (H-RSN-1..3).
- Posibles: varios operadores o agencias (P-23), tours de terceros, otras monedas en el sitio.
