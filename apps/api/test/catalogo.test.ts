import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PREFIJO_GLOBAL } from '../src/openapi';
import { Entorno, hayBaseLista, prepararSuite, URL_APP } from './ayudas-db';

// Integración contra la base local como ga_app (se omite si no hay base migrada).
Logger.overrideLogger(false);
const env = new Entorno();
prepararSuite(env);

let app: NestFastifyApplication | undefined;
beforeAll(async () => {
  if (!(await hayBaseLista())) return;
  process.env['DATABASE_URL'] = URL_APP; // la config lo lee al crear el módulo
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix(PREFIJO_GLOBAL);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(async () => {
  await app?.close();
});

const get = (url: string) => app!.inject({ method: 'GET', url: `/${PREFIJO_GLOBAL}${url}` });
const validar = (codigo: unknown, tour_slug: unknown) =>
  app!.inject({ method: 'POST', url: `/${PREFIJO_GLOBAL}/promociones/validar`, payload: { codigo, tour_slug } });

async function hoy(): Promise<string> {
  return (await env.dev.query(`select ga.hoy_gt()::text as h`)).rows[0].h as string;
}
async function mas(dias: number): Promise<string> {
  return (await env.dev.query(`select (ga.hoy_gt() + $1::int)::text as h`, [dias])).rows[0].h as string;
}
const codigoPromo = () => `T${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

async function promo(o: {
  tourId?: string | null; aplicaTodos?: boolean; desde?: string | null; hasta?: string | null;
  activo?: boolean; pct?: number; codigo?: string;
}): Promise<string> {
  const codigo = o.codigo ?? codigoPromo();
  const r = await env.dev.query(
    `insert into ga.promociones (titulo, titulo_en, codigo, descuento_pct, tour_id, aplica_todos, desde, hasta, activo)
     values ('Promo de prueba', 'Test promo', $1, $2, $3, $4, $5, $6, $7) returning id`,
    [codigo, o.pct ?? 10, o.tourId ?? null, o.aplicaTodos ?? false, o.desde ?? null, o.hasta ?? null, o.activo ?? true],
  );
  env.registrarPromo(r.rows[0].id as string);
  return codigo;
}

describe('GET /tours', () => {
  it('lista solo activos, con DTO explícito', async () => {
    const a = await env.escenario();
    const inactivo = await env.escenario();
    await env.dev.query(`update ga.tours set activo = false where id = $1`, [inactivo.tourId]);
    const r = await get('/tours');
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('public, max-age=60');
    const lista = r.json() as Record<string, unknown>[];
    const slugs = lista.map((t) => t['slug']);
    expect(slugs).toContain(a.slug);
    expect(slugs).not.toContain(inactivo.slug);
    const t = lista.find((x) => x['slug'] === a.slug)!;
    expect(Object.keys(t).sort()).toEqual([
      'descripcion', 'descripcion_en', 'destino', 'destino_en', 'duracion', 'duracion_en', 'galeria', 'horario',
      'horario_en', 'hora_salida', 'id', 'imagen_url', 'incluye', 'incluye_en', 'lat', 'lng', 'nombre', 'nombre_en',
      'precio_q', 'punto_salida', 'punto_salida_en', 'slug',
    ].sort());
    expect(t['precio_q']).toBe(100);
  });
});

describe('GET /tours/:slug', () => {
  it('devuelve el tour con hora_salida como HH:MM', async () => {
    const a = await env.escenario({ horaSalida: '08:30:00' });
    const r = await get(`/tours/${a.slug}`);
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('public, max-age=60');
    expect(r.json().hora_salida).toBe('08:30');
  });
  it('404 GA_TOUR_NO_ENCONTRADO si no existe', async () => {
    const r = await get('/tours/no-existe-' + randomUUID());
    expect(r.statusCode).toBe(404);
    expect(r.json().code).toBe('GA_TOUR_NO_ENCONTRADO');
  });
  it('404 si el tour está inactivo (también en salidas)', async () => {
    const e = await env.escenario();
    await env.dev.query(`update ga.tours set activo = false where id = $1`, [e.tourId]);
    expect((await get(`/tours/${e.slug}`)).json().code).toBe('GA_TOUR_NO_ENCONTRADO');
    const s = await get(`/tours/${e.slug}/salidas`);
    expect(s.statusCode).toBe(404);
    expect(s.json().code).toBe('GA_TOUR_NO_ENCONTRADO');
  });
});

describe('GET /tours/:slug/salidas', () => {
  it('excluye inactivas, pasadas y fuera de plazo; no-store', async () => {
    const e = await env.escenario({ fecha: await mas(5), horaSalida: '08:00', horasCorte: 0 }); // abierta
    const inactiva = await env.salida(e.tourId, 5, await mas(6));
    await env.dev.query(`update ga.salidas set activo = false where id = $1`, [inactiva]);
    await env.salida(e.tourId, 5, await mas(-1)); // pasada
    const r = await get(`/tours/${e.slug}/salidas`);
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('no-store');
    expect((r.json() as { fecha: string }[]).map((s) => s.fecha)).toEqual([await mas(5)]);
  });
  it('plazo por tour: salida de mañana 23:59 abierta con corte 0, cerrada con corte 168', async () => {
    const abierta = await env.escenario({ fecha: await mas(1), horaSalida: '23:59', horasCorte: 0 });
    const cerrada = await env.escenario({ fecha: await mas(1), horaSalida: '23:59', horasCorte: 168 });
    expect((await get(`/tours/${abierta.slug}/salidas`)).json()).toHaveLength(1);
    expect((await get(`/tours/${cerrada.slug}/salidas`)).json()).toHaveLength(0);
  });
  it('calcula disponibles con reservas de varios estados y el precio especial', async () => {
    const e = await env.escenario({ cupo: 10, fecha: await mas(5), horasCorte: 0 });
    await env.reservar(e.salidaId, 2, 'pendiente');
    await env.reservar(e.salidaId, 3, 'confirmada');
    await env.reservar(e.salidaId, 1, 'pagada');
    await env.reservar(e.salidaId, 4, 'cancelada'); // no ocupa
    await env.reservar(e.salidaId, 2, 'vencida'); // no ocupa
    const llena = await env.salida(e.tourId, 2, await mas(6));
    await env.reservar(llena, 2, 'pagada');
    const especial = await env.salida(e.tourId, 4, await mas(7));
    await env.dev.query(`update ga.salidas set precio_q = 150.50 where id = $1`, [especial]);
    const s = (await get(`/tours/${e.slug}/salidas`)).json() as { cupo: number; disponibles: number; precio_q: number }[];
    expect(s.map((x) => [x.cupo, x.disponibles, x.precio_q])).toEqual([
      [10, 4, 100],
      [2, 0, 100],
      [4, 4, 150.5],
    ]);
    expect(Object.keys(s[0]!).sort()).toEqual(['cupo', 'disponibles', 'fecha', 'id', 'precio_q']);
  });
  it('rango por omisión de 60 días y desde/hasta validados', async () => {
    const e = await env.escenario({ fecha: await mas(10), horasCorte: 0 });
    await env.salida(e.tourId, 5, await mas(61));
    await env.salida(e.tourId, 5, await mas(100));
    expect(((await get(`/tours/${e.slug}/salidas`)).json() as unknown[]).length).toBe(1);
    const amplio = await get(`/tours/${e.slug}/salidas?hasta=${await mas(120)}`);
    expect((amplio.json() as unknown[]).length).toBe(3);
    const desde = await get(`/tours/${e.slug}/salidas?desde=${await mas(50)}&hasta=${await mas(110)}`);
    expect((desde.json() as unknown[]).length).toBe(2);
    for (const q of ['desde=hoy', 'desde=2030-02-30', `hasta=${await mas(121)}`, `desde=${await mas(5)}&hasta=${await mas(3)}`, 'otro=1']) {
      const r = await get(`/tours/${e.slug}/salidas?${q}`);
      expect(r.statusCode, q).toBe(400);
      expect(r.json().code).toBe('GA_VALIDACION');
    }
  });
});

describe('promociones', () => {
  it('GET /promociones: solo vigentes y activas, con tour o aplica_todos', async () => {
    const e = await env.escenario();
    const h = await hoy();
    const ok = await promo({ tourId: e.tourId });
    const todos = await promo({ aplicaTodos: true, desde: h, hasta: h });
    const vencida = await promo({ tourId: e.tourId, hasta: await mas(-1) });
    const futura = await promo({ tourId: e.tourId, desde: await mas(1) });
    const inactiva = await promo({ tourId: e.tourId, activo: false });
    const r = await get('/promociones');
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('public, max-age=60');
    const lista = r.json() as { codigo: string; tour: { slug: string; nombre: string } | null; aplica_todos: boolean; descuento_pct: number }[];
    const codigos = lista.map((p) => p.codigo);
    expect(codigos).toContain(ok);
    expect(codigos).toContain(todos);
    for (const c of [vencida, futura, inactiva]) expect(codigos).not.toContain(c);
    expect(lista.find((p) => p.codigo === ok)).toMatchObject({
      tour: { slug: e.slug, nombre: 'Tour de prueba' }, aplica_todos: false, descuento_pct: 10,
    });
    expect(lista.find((p) => p.codigo === todos)).toMatchObject({ tour: null, aplica_todos: true });
  });

  it('vigencia en los bordes del día de Guatemala (inclusive)', async () => {
    const e = await env.escenario();
    const h = await hoy();
    const hastaHoy = await promo({ tourId: e.tourId, hasta: h });
    const desdeHoy = await promo({ tourId: e.tourId, desde: h });
    const hastaAyer = await promo({ tourId: e.tourId, hasta: await mas(-1) });
    const desdeManana = await promo({ tourId: e.tourId, desde: await mas(1) });
    expect((await validar(hastaHoy, e.slug)).statusCode).toBe(200);
    expect((await validar(desdeHoy, e.slug)).statusCode).toBe(200);
    for (const c of [hastaAyer, desdeManana]) {
      const r = await validar(c, e.slug);
      expect(r.statusCode).toBe(422);
      expect(r.json().code).toBe('GA_PROMO_INVALIDA');
    }
  });

  it('validar: devuelve datos; no-store; normaliza minúsculas y espacios', async () => {
    const e = await env.escenario();
    const c = await promo({ tourId: e.tourId, pct: 15 });
    const r = await validar(`  ${c.toLowerCase().slice(0, 4)} ${c.toLowerCase().slice(4)} `, e.slug);
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.json()).toEqual({ valida: true, descuento_pct: 15, titulo: 'Promo de prueba', titulo_en: 'Test promo' });
  });

  it('validar: promo de otro tour o inexistente dan el mismo 422; aplica_todos sí valida', async () => {
    const a = await env.escenario();
    const b = await env.escenario();
    const deA = await promo({ tourId: a.tourId });
    const todos = await promo({ aplicaTodos: true });
    const otro = await validar(deA, b.slug);
    const inexistente = await validar(codigoPromo(), b.slug);
    const tourFalso = await validar(deA, 'no-existe-' + randomUUID());
    for (const r of [otro, inexistente, tourFalso]) expect(r.statusCode).toBe(422);
    expect(otro.json()).toEqual(inexistente.json());
    expect(otro.json()).toEqual(tourFalso.json());
    expect((await validar(deA, a.slug)).statusCode).toBe(200);
    expect((await validar(todos, b.slug)).statusCode).toBe(200);
  });

  it('validar: descuento 0 o promo inactiva no valida; cuerpo inválido es 400', async () => {
    const e = await env.escenario();
    const cero = await promo({ tourId: e.tourId, pct: 0 });
    const inactiva = await promo({ tourId: e.tourId, activo: false });
    expect((await validar(cero, e.slug)).statusCode).toBe(422);
    expect((await validar(inactiva, e.slug)).statusCode).toBe(422);
    for (const [c, s] of [['', e.slug], ['  ', e.slug], [123, e.slug], ['ABC', '']] as const) {
      const r = await validar(c, s);
      expect(r.statusCode).toBe(400);
      expect(r.json().code).toBe('GA_VALIDACION');
    }
  });
});
