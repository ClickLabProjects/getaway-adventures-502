import { isIP } from 'node:net';
import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  DATABASE_URL: z.string().min(1),
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_REGION: z.string().min(1),
  TURNSTILE_SECRET: z.string().min(1).optional(),
  TURNSTILE_HOSTNAMES: z.string().optional(),
  VERSION_AVISO_PRIVACIDAD: z.string().min(1).max(40).default('2026-11-24'),
  TRUST_PROXY: z.string().optional(),
  RATE_LIMIT_RESERVAS_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_RESERVAS_VENTANA_MS: z.coerce.number().int().min(1000).default(60_000),
});

export type Config = {
  entorno: 'development' | 'test' | 'production';
  puerto: number;
  databaseUrl: string;
  cognito: { userPoolId: string; clientId: string; region: string };
  /** Secreto de Cloudflare Turnstile. Obligatorio en producción; sin él (dev/test) se usa un verificador falso. */
  turnstileSecret?: string;
  /** Hostnames que Turnstile debe devolver (p. ej. el dominio del sitio). Obligatorio en producción. */
  turnstileHostnames: string[];
  /** Versión del aviso de privacidad que se guarda con el consentimiento. */
  versionAviso: string;
  /** Opción `trustProxy` de Fastify: false, número de saltos o lista de IP/CIDR. Nunca `true`. */
  trustProxy: boolean | number | string[];
  /** Límite por IP de POST /reservaciones. */
  limiteReservas: { max: number; ventanaMs: number };
};

export const CONFIG = Symbol('CONFIG');

// Valores falsos: solo se usan cuando NODE_ENV=test.
const VALORES_DE_PRUEBA = {
  DATABASE_URL: 'postgres://ga_dev:ga_dev_clave_falsa@localhost:5432/ga_dev',
  COGNITO_USER_POOL_ID: 'us-east-1_PRUEBA',
  COGNITO_CLIENT_ID: 'cliente-de-prueba',
  COGNITO_REGION: 'us-east-1',
};

export function cargarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const limpio = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  const base = limpio['NODE_ENV'] === 'test' ? { ...VALORES_DE_PRUEBA, ...limpio } : limpio;
  const r = esquema.safeParse(base);
  if (!r.success) {
    // Solo nombres de variables, nunca valores.
    const campos = [...new Set(r.error.issues.map((i) => i.path.join('.')))].join(', ');
    throw new Error(`Configuración inválida o incompleta. Revisa las variables: ${campos}`);
  }
  const e = r.data;
  const hostnames = (e.TURNSTILE_HOSTNAMES ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  const trustProxy = parsearTrustProxy(e.TRUST_PROXY);
  if (e.NODE_ENV === 'production') {
    exigirTlsVerificado(e.DATABASE_URL);
    if (!e.TURNSTILE_SECRET) throw new Error('Configuración inválida o incompleta. Revisa las variables: TURNSTILE_SECRET');
    if (hostnames.length === 0) throw new Error('Configuración inválida o incompleta. Revisa las variables: TURNSTILE_HOSTNAMES');
  }
  if (e.NODE_ENV === 'test' && e.TURNSTILE_SECRET) {
    throw new Error('Configuración inválida. TURNSTILE_SECRET no debe definirse con NODE_ENV=test');
  }
  return {
    entorno: e.NODE_ENV,
    puerto: e.PORT,
    databaseUrl: e.DATABASE_URL,
    cognito: { userPoolId: e.COGNITO_USER_POOL_ID, clientId: e.COGNITO_CLIENT_ID, region: e.COGNITO_REGION },
    ...(e.TURNSTILE_SECRET ? { turnstileSecret: e.TURNSTILE_SECRET } : {}),
    turnstileHostnames: hostnames,
    versionAviso: e.VERSION_AVISO_PRIVACIDAD,
    trustProxy,
    limiteReservas: { max: e.RATE_LIMIT_RESERVAS_MAX, ventanaMs: e.RATE_LIMIT_RESERVAS_VENTANA_MS },
  };
}

/** En producción la conexión a la base exige TLS verificado. Nunca se muestra la URL. */
function exigirTlsVerificado(url: string): void {
  let modo: string | null = null;
  try {
    modo = new URL(url).searchParams.get('sslmode');
  } catch {
    throw new Error('Configuración inválida. Revisa las variables: DATABASE_URL');
  }
  if (modo !== 'verify-full') {
    throw new Error('Configuración inválida. DATABASE_URL en producción debe incluir sslmode=verify-full');
  }
}

/**
 * TRUST_PROXY: vacío o "false" → false (la IP es la del socket). Un entero ≥ 1 → número de saltos de proxy de
 * confianza. Una lista separada por comas de IP o CIDR → solo esos proxies son de confianza. `true` se rechaza:
 * confiaría en cualquier X-Forwarded-For.
 */
export function parsearTrustProxy(valor: string | undefined): boolean | number | string[] {
  const v = (valor ?? '').trim();
  if (v === '' || v.toLowerCase() === 'false' || v === '0') return false;
  if (/^\d+$/.test(v)) return Number(v);
  const partes = v.split(',').map((p) => p.trim()).filter(Boolean);
  const validas = partes.length > 0 && partes.every((p) => {
    const [ip, mascara, ...resto] = p.split('/');
    if (resto.length || !ip || isIP(ip) === 0) return false;
    if (mascara === undefined) return true;
    const max = isIP(ip) === 4 ? 32 : 128;
    return /^\d+$/.test(mascara) && Number(mascara) <= max;
  });
  if (!validas) throw new Error('Configuración inválida. Revisa las variables: TRUST_PROXY');
  return partes;
}

/**
 * Valor para la opción `trustProxy` de Fastify. Fastify 5 trata un número como "no confiar en nadie" (falla cerrado),
 * así que los saltos se convierten en una función: se confía en los primeros `n` saltos desde el socket
 * (n = 1: solo el proxy que se conecta a la API). Solo es seguro si la API NO es alcanzable más que a través
 * de ese proxy (ver DESPLIEGUE.md).
 */
export function trustProxyParaFastify(tp: boolean | number | string[]): boolean | string[] | ((addr: string, i: number) => boolean) {
  return typeof tp === 'number' ? (_addr: string, i: number) => i < tp : tp;
}
