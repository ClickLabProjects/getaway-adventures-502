# Costo mensual de mantener el sitio

Cálculo del 2026-11-23. Usa precios de lista *on-demand* de AWS en **us-east-1** (Virginia, la región más barata), en USD
y sin impuestos. **Son aproximados: antes de cotizar al cliente hay que confirmarlos en AWS Pricing Calculator.**

## Supuestos

- La agencia es un comercio pequeño: decenas o cientos de reservas al mes y tráfico bajo.
- **Una sola región y una sola zona de disponibilidad**, sin Multi-AZ. Si la base de datos o el servidor fallan, el sitio
  puede quedar caído entre 30 y 60 minutos mientras AWS lo recupera o se restaura. Para este negocio es aceptable.
- Se mantiene lo que pidió el dueño: API propia, RDS PostgreSQL en producción y Cognito.

## Opción elegida: AWS Lightsail (lo más barato dentro de AWS)

El dueño pidió **lo más barato posible sin salir de AWS**. Lightsail es la versión de precio fijo de AWS: la API y la
base de datos corren ahí, y Cognito, SES, S3 y CloudFront se siguen usando como en el resto del diseño.

| Componente | USD/mes |
|---|---|
| Servidor Lightsail de **1 GB** (2 vCPU de ráfaga, 40 GB SSD; incluye IP pública y 2 TB de tráfico) | 7 |
| **Base de datos administrada de Lightsail**, PostgreSQL de 1 GB en una zona, con respaldos diarios automáticos (7 días) | 15 |
| Sitio e imágenes: S3 + CloudFront (dentro del nivel gratuito) | ≈ 1 |
| Correo SES, Cognito, Turnstile y DNS | ≈ 1 |
| Dominio `.com` | 1 |
| **Total** | **≈ 25** |
| **Con colchón del 20 %** | **≈ 30/mes · ≈ 360/año** |

**Alternativa aún más barata, ≈ 15 USD/mes:** un solo servidor Lightsail de 2 GB (12 USD) con PostgreSQL instalado en la
misma máquina, más snapshots automáticos y un respaldo diario a S3. **No se recomienda** para este negocio: el equipo
tendría que administrar la base (respaldos, restauración, actualizaciones), y si el servidor se daña y el respaldo
falló, se pierden reservas. Se ahorran unos 10 USD al mes a cambio de ese riesgo.

**Cómo se escala:** Lightsail no escala solo.
- Las alarmas gratuitas (CPU, memoria, capacidad de ráfaga) avisan por correo antes de que el servidor se sature.
- Para subir de plan se saca un snapshot y se crea un servidor más grande: unos 5-10 minutos sin servicio, que se
  pueden programar de madrugada.
- Si algún día hace falta más, el snapshot se exporta a EC2 y la base se pasa a RDS con un dump.

**Diferencias con EC2 + RDS que se aceptan:**
- La base es la administrada de Lightsail, no RDS. Es PostgreSQL con menos opciones de configuración.
- El servidor no puede tener un rol IAM. La API usa una llave de acceso limitada a SES y Cognito, que se guarda en el
  servidor y se rota.

**Primeros meses:** Lightsail suele dar los primeros 3 meses gratis en algunos planes de servidor y de base, y las
cuentas nuevas de AWS reciben créditos. Hay que verificar las condiciones vigentes y **no contar con eso al cotizar**.

Las secciones siguientes se conservan como referencia de la opción con EC2 + RDS.

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

Queda fuera de este cálculo. Se va a montar con servicios gratuitos y se define por separado.

## Costos que no son de AWS

| Concepto | Costo | USD/mes aprox. |
|---|---|---|
| Dominio `.com` | 12-15 USD al año | 1-1.25 |
| Dominio `.com.gt` (si lo prefieren) | Verificar con el registro de Guatemala | — |
| GitHub (organización, plan gratis) | Repos y Actions: ilimitado si el repo es público, 2.000 min/mes si es privado | 0 |
| Cloudflare (Turnstile y, si se quiere, DNS) | Plan gratis | 0 |

## Resumen: solo producción

| Escenario | AWS | Dominio | **Total mensual** | **Total anual** | **Con colchón del 20 %** |
|---|---|---|---|---|---|
| **Lightsail (elegida)**: servidor 1 GB + base administrada | 24 | 1 | **≈ 25** | **≈ 300** | **≈ 30/mes · ≈ 360/año** |
| Lightsail todo en un servidor (no recomendada) | 14 | 1 | ≈ 15 | ≈ 180 | ≈ 18/mes |
| Mínimo (EC2 t4g.micro) | 29 | 1 | **≈ 30** | **≈ 360** | ≈ 36/mes · ≈ 430/año |
| **Recomendado** (EC2 t4g.small) | 35 | 1 | **≈ 36** | **≈ 430** | **≈ 43/mes · ≈ 520/año** |
| Propuesta original (Fargate + ALB + WAF, una zona) | 60-75 | 1 | ≈ 61-76 | ≈ 730-910 | ≈ 73-91/mes |

**Colchón:** conviene cotizar con un **15-20 % extra** sobre la infraestructura para cubrir el crecimiento de datos,
los cambios de precio y el tipo de cambio.

**Primer año:** las cuentas nuevas de AWS reciben créditos del nivel gratuito (hasta unos 200 USD en los primeros meses,
según el programa vigente). Eso reduce el costo inicial, pero **no conviene cotizarle al cliente contando con ellos.**

## Precio de mantenimiento al cliente

La infraestructura es solo una parte. El precio mensual debería salir de esta fórmula:

```
Precio mensual = Infraestructura de producción con colchón (≈ 30 USD con Lightsail)
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
de Lightsail se suman 30 USD de infraestructura, más las horas por la tarifa, más la herramienta proporcional,
y sobre ese total se aplica el margen.

## Qué falta confirmar

- Los precios exactos en AWS Pricing Calculator con la región elegida. La región México (mx-central-1) suele ser algo
  más cara y no siempre tiene todos los servicios.
- Si la factura de AWS a Guatemala lleva impuestos (IVA u otros) y en qué moneda se le cobrará al cliente.
- El dominio que va a usar la agencia.
