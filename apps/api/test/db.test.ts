import { Pool } from 'pg';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbService } from '../src/plataforma/db/db.service';
import { cargarConfig } from '../src/plataforma/config/config';

const url =
  process.env['DATABASE_URL_PRUEBA'] ?? 'postgres://ga_dev:ga_dev_clave_falsa@localhost:5432/ga_dev';

async function hayPostgres(): Promise<boolean> {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 1500 });
  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

// Se omite (no falla) si el Postgres local del docker-compose no está levantado.
describe('DbService contra Postgres local', () => {
  const db = new DbService({ ...cargarConfig({ NODE_ENV: 'test' }), databaseUrl: url });
  let disponible = false;

  beforeAll(async () => {
    disponible = await hayPostgres();
  });
  afterAll(() => db.onApplicationShutdown());

  it('comprobarConexion funciona', async (ctx) => {
    if (!disponible) return ctx.skip();
    await expect(db.comprobarConexion()).resolves.toBeUndefined();
  });

  it('enTransaccion revierte si la función lanza', async (ctx) => {
    if (!disponible) return ctx.skip();
    await expect(
      db.enTransaccion(async (tx) => {
        await sql`create temp table t_prueba(x int)`.execute(tx);
        throw new Error('revertir');
      }),
    ).rejects.toThrow('revertir');
  });
});
