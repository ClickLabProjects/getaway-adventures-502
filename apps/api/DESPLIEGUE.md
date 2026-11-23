# Despliegue de la API: IP real, Turnstile y proxies

## Cadena de confianza

```
Cliente → CloudFront → Caddy (Lightsail) → API (red interna Docker)
```

La IP del cliente alimenta el límite de peticiones de `POST /api/v1/reservaciones` y el campo `remoteip` de Turnstile.
Si se acepta un `X-Forwarded-For` falsificado, cualquiera evade el límite. Por eso la API **ignora** `X-Forwarded-For`
salvo que `TRUST_PROXY` declare qué proxies son de confianza (`false` por omisión; `true` se rechaza al arrancar).

### 1. CloudFront
- Añade al origen una **cabecera personalizada secreta** (p. ej. `X-Origin-Verify: <valor largo aleatorio>`). El valor
  vive en variables de entorno de Caddy y de CloudFront, nunca en el repo.
- Reenvía `X-Forwarded-For` (CloudFront lo añade con la IP del visitante).

### 2. Caddy
- Exige la cabecera secreta; sin ella responde 403 (así nadie puede saltarse CloudFront llamando al origen directo).
- Solo confía en los rangos de CloudFront (lista oficial `ip-ranges.json`, servicio `CLOUDFRONT`) y descarta el resto.
- Reescribe `X-Forwarded-For` con la IP real que Caddy calculó, para que la API no vea valores del cliente.

```caddyfile
{
	servers {
		trusted_proxies static <rangos de CloudFront>
		trusted_proxies_strict
	}
}

api.ejemplo.com {
	@sinSecreto not header X-Origin-Verify {env.ORIGIN_VERIFY}
	respond @sinSecreto 403

	reverse_proxy api:3100 {
		header_up X-Forwarded-For {client_ip}
		header_up -X-Origin-Verify
	}
}
```

`trusted_proxies_strict` hace que Caddy lea `X-Forwarded-For` de derecha a izquierda y se detenga en el primer valor
que no sea un proxy de confianza: lo que el cliente ponga a la izquierda no cuenta. Mantén la lista de CloudFront
actualizada (cambia con el tiempo).

### 3. API
- Variable `TRUST_PROXY` = la red Docker de Caddy (p. ej. `172.18.0.0/16`) o `1` (un salto). Con un solo salto, la API
  debe ser alcanzable **únicamente** desde Caddy.
- **Sin puerto publicado en el host**: en `docker-compose` usa `expose: ["3100"]`, nunca `ports:`. Solo la red interna
  Docker comparte Caddy y la API.
- El límite agrupa las IPv6 por /64.

### 4. Firewall de Lightsail
Solo entran **443** y **80** (80 solo para redirigir/ACME). Cierra 22 salvo desde tu IP, y nunca expongas 3100 ni 5432.

## Turnstile
- `TURNSTILE_SECRET` y `TURNSTILE_HOSTNAMES` (dominios del sitio) son obligatorios en producción.
- El widget debe declarar `action: "reservar"`; la API rechaza otras acciones y hostnames fuera de la lista.
- Sin secreto en desarrollo se usa un verificador falso y la API lo advierte en el log. Con `NODE_ENV=test` y
  `TURNSTILE_SECRET` definido la API no arranca.

## Límite de peticiones
`RATE_LIMIT_RESERVAS_MAX` (10) y `RATE_LIMIT_RESERVAS_VENTANA_MS` (60000). El contador está en memoria: con más de una
instancia de la API hace falta un store compartido (Redis).
