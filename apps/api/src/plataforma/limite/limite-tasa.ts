import rateLimit from '@fastify/rate-limit';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { isIPv6 } from 'node:net';
import type { Config } from '../config/config';
import { ErrorNegocio } from '../errores/error-negocio';

/**
 * Clave del límite: la IP del cliente. Las IPv6 se agrupan por /64 (un cliente suele recibir un /64 completo,
 * así que cambiar de dirección dentro de él no evade el límite). Las IPv4 mapeadas (::ffff:a.b.c.d) cuentan como IPv4.
 */
export function claveIp(ip: string): string {
  const mapeada = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapeada) return mapeada[1]!;
  if (!isIPv6(ip)) return ip;
  let base = ip.split('%')[0]!.toLowerCase();
  const doble = base.indexOf('::');
  let grupos: string[];
  if (doble >= 0) {
    const izq = base.slice(0, doble).split(':').filter(Boolean);
    const der = base.slice(doble + 2).split(':').filter(Boolean);
    grupos = [...izq, ...Array<string>(Math.max(8 - izq.length - der.length, 0)).fill('0'), ...der];
  } else {
    grupos = base.split(':');
  }
  base = grupos.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':');
  return `${base}::/64`;
}

/**
 * Registra @fastify/rate-limit con global:false: solo limita las rutas que declaran
 * `@RouteConfig({ rateLimit: {} })`. Llamar ANTES de `app.init()`. La IP sale de `req.ip`, que Fastify calcula
 * según `trustProxy` (TRUST_PROXY): sin proxies de confianza declarados, X-Forwarded-For se ignora.
 * Contador en memoria: vale para una sola instancia; con varias hay que pasar un store compartido.
 */
export async function registrarLimiteTasa(
  app: NestFastifyApplication,
  limite: Config['limiteReservas'],
): Promise<void> {
  const logger = new Logger('LimiteTasa');
  await app.register(rateLimit, {
    global: false,
    max: limite.max,
    timeWindow: limite.ventanaMs,
    keyGenerator: (req) => claveIp(req.ip),
    errorResponseBuilder: () => {
      logger.warn('GA_DEMASIADAS_SOLICITUDES');
      return new ErrorNegocio('GA_DEMASIADAS_SOLICITUDES', 429, 'Demasiadas solicitudes. Intenta de nuevo en un momento.');
    },
  });
}
