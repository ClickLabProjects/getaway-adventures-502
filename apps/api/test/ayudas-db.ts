import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, beforeEach } from 'vitest';

// Conexiones a la base local de pruebas. DATABASE_URL_PRUEBA apunta al dueño de la base de desarrollo (ga_dev);
// de ahí se derivan las URL de ga_app (rol de la API) y ga_lectura, a menos que se den explícitas.
const urlDev =
  process.env['DATABASE_URL_PRUEBA'] ?? 'postgres://ga_dev:ga_dev_clave_falsa@localhost:5432/ga_dev';

function conRol(url: string, usuario: string, clave: string): string {
  const u = new URL(url);
  u.username = usuario;
  u.password = clave;
  return u.toString();
}

export const URL_DEV = urlDev;
export const URL_APP =
  process.env['DATABASE_URL_PRUEBA_APP'] ?? conRol(urlDev, 'ga_app', 'ga_app_local_falsa');
export const URL_LECTURA =
  process.env['DATABASE_URL_PRUEBA_LECTURA'] ?? conRol(urlDev, 'ga_lectura', 'ga_lectura_local_falsa');

export async function hayBaseLista(): Promise<boolean> {
  const pool = new Pool({ connectionString: URL_DEV, connectionTimeoutMillis: 1500 });
  try {
    // La base debe tener aplicada la migración de correcciones de negocio.
    const r = await pool.query(`select to_regclass('ga.configuracion') as t`);
    if (!r.rows[0].t) return false;
    for (const u of [URL_APP, URL_LECTURA]) {
      const p = new Pool({ connectionString: u, connectionTimeoutMillis: 1500 });
      try {
        await p.query('select 1');
      } finally {
        await p.end().catch(() => undefined);
      }
    }
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export interface ErrorPg {
  code?: string;
  message: string;
  detail?: string;
}

/** Ejecuta la promesa y devuelve el error de Postgres (o null si no falló). */
export async function capturar(p: Promise<unknown>): Promise<ErrorPg | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return e as ErrorPg;
  }
}

export function detalle(e: ErrorPg | null): Record<string, number> {
  return JSON.parse(e?.detail ?? '{}') as Record<string, number>;
}

export class Entorno {
  readonly dev = new Pool({ connectionString: URL_DEV, max: 3 });
  readonly app = new Pool({ connectionString: URL_APP, max: 15 });
  readonly lectura = new Pool({ connectionString: URL_LECTURA, max: 2 });
  private tours: string[] = [];
  private promos: string[] = [];
  private emails: string[] = [];

  /** Crea un tour y una salida propios (datos falsos, slug único). */
  async escenario(opts: {
    cupo?: number;
    fecha?: string;
    horaSalida?: string | null;
    horasCorte?: number | null;
  } = {}): Promise<{ tourId: string; salidaId: string; slug: string }> {
    const slug = `prueba-${randomUUID()}`;
    const t = await this.dev.query(
      `insert into ga.tours (slug, nombre, destino, precio_q, hora_salida, horas_corte)
       values ($1, 'Tour de prueba', 'Destino falso', 100, $2, $3) returning id`,
      [slug, opts.horaSalida ?? null, opts.horasCorte ?? null],
    );
    const tourId = t.rows[0].id as string;
    this.tours.push(tourId);
    const salidaId = await this.salida(tourId, opts.cupo ?? 5, opts.fecha ?? '2030-06-15');
    return { tourId, salidaId, slug };
  }

  async salida(tourId: string, cupo: number, fecha: string): Promise<string> {
    const s = await this.dev.query(
      `insert into ga.salidas (tour_id, fecha, cupo) values ($1, $2, $3) returning id`,
      [tourId, fecha, cupo],
    );
    return s.rows[0].id as string;
  }

  registrarPromo(id: string): void {
    this.promos.push(id);
  }
  registrarTour(id: string): void {
    this.tours.push(id);
  }
  email(prefijo = 'cliente'): string {
    const e = `${prefijo}-${randomUUID()}@prueba.test`;
    this.emails.push(e.toLowerCase());
    return e;
  }

  /** Inserta una reservación con ga_app (o con el cliente dado). Devuelve el id. */
  async reservar(
    salidaId: string,
    personas: number,
    estado = 'pendiente',
    extra: { expira_at?: string | null; client_ref?: string | null; email?: string; acepta_promos?: boolean; created_at?: string } = {},
    cliente: Pick<Pool | PoolClient, 'query'> = this.app,
  ): Promise<string> {
    const email = extra.email ?? this.email();
    if (extra.email) this.emails.push(extra.email.toLowerCase());
    const r = await cliente.query(
      `insert into ga.reservaciones
         (codigo, salida_id, nombre, email, telefono, personas, total_q, estado, expira_at, client_ref, acepta_promos, created_at)
       values ($1, $2, 'Cliente Falso', $3, '55550000', $4, $5, $6, $7, $8, $9, coalesce($10::timestamptz, now()))
       returning id`,
      [
        `T${randomUUID().slice(0, 12)}`,
        salidaId,
        email,
        personas,
        personas * 100,
        estado,
        extra.expira_at ?? null,
        extra.client_ref ?? null,
        extra.acepta_promos ?? false,
        extra.created_at ?? null,
      ],
    );
    return r.rows[0].id as string;
  }

  async limpiar(): Promise<void> {
    const t = this.tours;
    await this.dev.query(
      `delete from ga.reservaciones where salida_id in (select id from ga.salidas where tour_id = any($1))`,
      [t],
    );
    await this.dev.query(`delete from ga.reservaciones where lower(email) = any($1)`, [this.emails]);
    await this.dev.query(`delete from ga.consentimientos where lower(email) = any($1)`, [this.emails]);
    await this.dev.query(`delete from ga.promociones where id = any($1) or tour_id = any($2)`, [this.promos, t]);
    await this.dev.query(`delete from ga.tours where id = any($1)`, [t]);
    this.tours = [];
    this.promos = [];
    this.emails = [];
  }

  async cerrar(): Promise<void> {
    await this.limpiar().catch(() => undefined);
    await Promise.all([this.dev.end(), this.app.end(), this.lectura.end()]);
  }
}

export const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Registra los hooks de una suite de base de datos: si no hay Postgres local migrado, cada prueba se omite;
 * si lo hay, limpia los datos antes de cada prueba y cierra los pools al final.
 */
export function prepararSuite(env: Entorno): void {
  let disponible = false;
  beforeAll(async () => {
    disponible = await hayBaseLista();
  });
  beforeEach(async (ctx) => {
    if (!disponible) ctx.skip();
    await env.limpiar();
  });
  afterAll(() => env.cerrar());
}
