import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  DATABASE_URL: z.string().min(1),
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_REGION: z.string().min(1),
});

export type Config = {
  entorno: 'development' | 'test' | 'production';
  puerto: number;
  databaseUrl: string;
  cognito: { userPoolId: string; clientId: string; region: string };
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
  if (e.NODE_ENV === 'production') exigirTlsVerificado(e.DATABASE_URL);
  return {
    entorno: e.NODE_ENV,
    puerto: e.PORT,
    databaseUrl: e.DATABASE_URL,
    cognito: { userPoolId: e.COGNITO_USER_POOL_ID, clientId: e.COGNITO_CLIENT_ID, region: e.COGNITO_REGION },
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
