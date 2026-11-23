# Fases

Ronda 1 · 2026-11-23. Todo es `[PROPUESTA]` hasta que el dueño y la agencia lo confirmen.
Criterio: Fase 1 es lo mínimo para vender con confianza y sin riesgo de perder reservas, dinero o datos.

## Fase 1 · Salida a producción
**Por qué:** el informe `docs/revision-pre-produccion.md` marcó 4 bloqueantes; tres afectan directo al negocio
(cupos bloqueables, nadie se entera de las reservas, respaldos) y faltan textos que el turista necesita para confiar
(cancelación, pago, privacidad). Sin esto se vende, pero se pierden reservas y hay riesgo legal y de reputación.

| Tema | Historias | Bloqueante del informe |
|---|---|---|
| Anti-abuso: tope de personas, límite por correo/teléfono, verificación anti-robots | H-RES-3 | Bloqueante 1 |
| Vencimiento de pendientes que libera cupo | H-RES-4 | Bloqueante 1 |
| Aviso al operador y comprobante al turista; confirmación que sobrevive a recargar | H-NOT-1, H-NOT-2, H-RES-7 | Bloqueante 3 |
| Políticas: cancelación, forma de pago, punto de encuentro, privacidad, términos; aceptación al reservar | H-POL-1..4, H-RES-8, H-CAT-4, H-PAG-1 | Importante 9 y 13 |
| Precio de acompañante en ATV | H-RES-9, H-CAT-5 | Importante 14 |
| Cambiar fecha o personas; cancelar con confirmación y motivo; reactivar con cupo | H-RES-10..12 | Importantes 1 y 18 |
| Hora de Guatemala y hora de corte | H-RES-5, H-CAT-8 | Importante 3 |
| Promo aplicada aunque no se pulse "Apply"; promo de tour borrado | H-PRO-2, H-PRO-3, H-PRO-5 | Importantes 2 y 4 |
| Reintento sin duplicar; errores de red claros | H-RES-6, H-CAT-3, H-CTA-1 | Importantes 5 y 6 |
| Consentimiento revocable, baja, anonimizar cliente | H-CLI-2, H-CLI-3, H-CLI-5 | Importantes 7 y 9 |
| Registro manual de pagos y anticipo (para que "cobrado" sea real) | H-PAG-2, H-PAG-3, H-DSH-3 | — (necesario si hay anticipo) |
| Panel: lista por salida, WhatsApp con +502, CSV seguro, sin límite de 1000 filas | H-OPE-1, 2, 4, 5, H-DSH-2 | Importantes 8, 15, 16 |
| Login de admin: sin registro público; MFA y recuperar contraseña (debería) | H-CTA-2..4 | Mejoras |
| Respaldos y proyecto dedicado | — (no es historia de producto; decisión de dueño, P-13) | Bloqueante 2 y 4 |

Deseable en Fase 1 si da el tiempo (debería): historial de cambios (H-RES-13), cancelación masiva (H-RES-14),
reservas creadas desde el panel (H-RES-15), pendientes por vencer (H-OPE-3), aviso de confirmación (H-NOT-3),
reembolsos (H-PAG-4, H-PAG-5), doble opt-in (H-CLI-4).

**Fuera de Fase 1 a propósito:** pagos en línea, cuentas de cliente, roles adicionales. Agregan proveedores,
contratos y riesgo; la agencia ya cobra por WhatsApp y en oficina.

## Fase 2 · Ordenar la operación y cobrar en línea (1 a 3 meses después del lanzamiento)
**Por qué:** cuando haya volumen, el WhatsApp manual no escala y los no-shows cuestan dinero.
- Pago del anticipo en línea y enlaces de pago (H-PAG-6, H-PAG-7). Depende de elegir pasarela (P-11).
- "Mi reserva" con código + correo: ver, cancelar, pedir cambio (H-RES-16).
- Roles personal y dueño, gestión de usuarios del panel (H-CTA-5, H-CTA-6).
- Recordatorio el día anterior y resumen diario para la agencia (H-NOT-5, H-NOT-6); aviso de reserva vencida (H-NOT-4).
- Asistencia y no-show (H-OPE-7); indicadores nuevos (H-DSH-6).
- Promociones privadas, límite de usos, monto fijo (H-PRO-6, H-PRO-7).
- Envío de correos de marketing desde el sistema (H-CLI-6).
- Políticas editables desde el panel, qué llevar, preguntas frecuentes (H-POL-5..7); solicitud de tour privado (H-CAT-9).

## Fase 3 · Crecer y fidelizar
**Por qué:** solo vale la pena con clientes que repiten y con más de un guía u operador.
- Cuentas de cliente vinculadas a reservas previas (H-CTA-7, H-RES-17).
- Vista del guía y asignación de guías (H-OPE-8).
- Reseñas y descuento para cliente frecuente (H-RSN-1..3).
- Posibles: varios operadores, tours de terceros, otras monedas en el sitio (requiere arquitecto).
