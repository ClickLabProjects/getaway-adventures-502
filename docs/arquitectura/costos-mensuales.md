# Costo mensual de mantener el sitio

Cálculo del 2026-11-23. Usa precios de lista *on-demand* de AWS en **us-east-1** (Virginia, la región más barata), en USD
y sin impuestos. **Son aproximados: antes de cotizar al cliente hay que confirmarlos en AWS Pricing Calculator.**

## Supuestos

- La agencia es un comercio pequeño: decenas o cientos de reservas al mes y tráfico bajo.
- **Una sola región y una sola zona de disponibilidad**, sin Multi-AZ. Si la base de datos o el servidor fallan, el sitio
  puede quedar caído entre 30 y 60 minutos mientras AWS lo recupera o se restaura. Para este negocio es aceptable.
- Se mantiene lo que pidió el dueño: API propia, RDS PostgreSQL en producción y Cognito.

## Qué cambia frente a la propuesta original para abaratar

| Se quita o cambia | Ahorro aprox./mes | Riesgo que se acepta |
|---|---|---|
| ECS Fargate + **ALB** → **un servidor EC2** con Docker y Caddy (HTTPS automático) | 25-30 | Hay que mantener el sistema operativo (parches automáticos con Amazon Linux 2023 + SSM, que es gratis). Si el servidor cae, AWS lo recupera solo (*auto-recovery*). |
| **WAF** → Turnstile + límite de peticiones en la API | 8-10 | Menos protección contra ataques grandes. Se puede activar después si hace falta. |
| Multi-AZ → una sola zona | 15 | Una caída de la zona tumba el sitio hasta restaurar. |
| Bastión → acceso por SSM al mismo servidor | 3-4 | Ninguno relevante. |
| Secrets Manager → SSM Parameter Store (gratis) | 1 | Se pierde la rotación automática de la clave de la base. |

CloudFront se mantiene adelante del servidor porque su nivel gratuito permanente (1 TB y 10 millones de peticiones al
mes) cubre de sobra este tráfico y además sirve el sitio y las imágenes desde S3.

## Producción, versión económica (recomendada)

| Componente | Detalle | USD/mes |
|---|---|---|
| Servidor de la API | EC2 **t4g.small** (2 vCPU, 2 GB) | 12.30 |
| Disco del servidor | EBS gp3 20 GB | 1.60 |
| IP pública | 1 IPv4 | 3.65 |
| Base de datos | RDS PostgreSQL **db.t4g.micro**, una zona | 11.70 |
| Disco de la base | gp3 20 GB (respaldos de 7 días incluidos hasta el tamaño de la base) | 2.30 |
| Sitio web e imágenes | S3 (pocos GB) + CloudFront (dentro del nivel gratuito) | 0.50-1 |
| DNS | Route 53, 1 zona + consultas | 0.60 |
| Correo | SES, unos miles de correos | 0.10-0.50 |
| Inicio de sesión | Cognito, nivel gratuito (menos de 10.000 usuarios activos, MFA por app) | 0 |
| Captcha | Cloudflare Turnstile | 0 |
| Logs y alarmas | CloudWatch | 1-2 |
| Imágenes de Docker | ECR | 0.20 |
| **Total producción** | | **≈ 34-36** |

**Versión mínima:** con un EC2 **t4g.micro** (1 GB de RAM, suficiente para una API NestJS pequeña) el servidor cuesta
unos 6 USD menos y el total queda en **≈ 28-30 USD/mes**. Tiene menos margen si crece el tráfico.

## Ambiente de pruebas (dev)

| Opción | USD/mes | Nota |
|---|---|---|
| **Base Supabase gratis + API en un EC2 t4g.micro** | **≈ 11** | Supabase gratis se pausa tras 7 días sin uso; se reactiva desde su panel |
| Igual, pero apagando el EC2 de noche y en fines de semana | ≈ 5-6 | Se programa con EventBridge Scheduler (gratis) |
| Supabase Pro en lugar del gratis | +25 | No se pausa |

## Costos que no son de AWS

| Concepto | Costo | USD/mes aprox. |
|---|---|---|
| Dominio `.com` | 12-15 USD al año | 1-1.25 |
| Dominio `.com.gt` (si lo prefieren) | Verificar con el registro de Guatemala | — |
| GitHub (organización, plan gratis) | Repos y Actions: ilimitado si el repo es público, 2.000 min/mes si es privado | 0 |
| Cloudflare (Turnstile y, si se quiere, DNS) | Plan gratis | 0 |

## Resumen de infraestructura

| Escenario | Producción | Dev | Otros | **Total mensual** | **Total anual** |
|---|---|---|---|---|---|
| Mínimo (t4g.micro, dev apagado fuera de horario) | 29 | 6 | 1 | **≈ 36** | **≈ 430** |
| **Recomendado** (t4g.small, dev encendido) | 35 | 11 | 1 | **≈ 47** | **≈ 565** |
| Propuesta original (Fargate + ALB + WAF, una zona) | 60-75 | 35-50 | 1 | ≈ 95-125 | ≈ 1.150-1.500 |

**Colchón:** conviene cotizar con un **15-20 % extra** sobre la infraestructura para cubrir el crecimiento de datos,
los cambios de precio y el tipo de cambio. Por ejemplo, el escenario recomendado quedaría en **≈ 55 USD/mes**.

**Primer año:** las cuentas nuevas de AWS reciben créditos del nivel gratuito (hasta unos 200 USD en los primeros meses,
según el programa vigente). Eso reduce el costo inicial, pero **no conviene cotizarle al cliente contando con ellos.**

## Precio de mantenimiento al cliente

La infraestructura es solo una parte. El precio mensual debería salir de esta fórmula:

```
Precio mensual = Infraestructura (con colchón)
               + Herramientas del equipo (parte proporcional de Claude, Kiro, etc.)
               + Horas de mantenimiento × tarifa por hora
               + Margen de ganancia
```

**Horas típicas de mantenimiento para un sitio de este tamaño** (estimado, sin funcionalidades nuevas):

| Tarea | Horas/mes |
|---|---|
| Revisar alarmas, logs y que los respaldos estén al día | 1 |
| Parches de seguridad y actualización de dependencias | 1-2 |
| Restauración de prueba de la base (mensual) | 0.5-1 |
| Soporte al cliente (dudas del panel, ajustes pequeños de contenido) | 1-3 |
| **Total** | **≈ 4-7** |

Las funcionalidades nuevas y los cambios grandes se cotizan aparte, por proyecto, y no entran en el mantenimiento.

La tarifa por hora, el costo de las herramientas y el margen los define el equipo. Por ejemplo, con el escenario
recomendado se suman 55 USD de infraestructura, más las horas por la tarifa, más la herramienta proporcional,
y sobre ese total se aplica el margen.

## Qué falta confirmar

- Los precios exactos en AWS Pricing Calculator con la región elegida. La región México (mx-central-1) suele ser algo
  más cara y no siempre tiene todos los servicios.
- Si la factura de AWS a Guatemala lleva impuestos (IVA u otros) y en qué moneda se le cobrará al cliente.
- El dominio que va a usar la agencia.
