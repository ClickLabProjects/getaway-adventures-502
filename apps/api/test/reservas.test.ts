import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PREFIJO_GLOBAL } from '../src/openapi';
import { trustProxyParaFastify } from '../src/plataforma/config/config';
import { registrarLimiteTasa } from '../src/plataforma/limite/limite-tasa';
import { VERIFICADOR_CAPTCHA, type VerificadorCaptcha } from '../src/modulos/reservas/captcha';
import { Entorno, hayBaseLista, prepararSuite, URL_APP } from './ayudas-db';

// Integración contra la base local como ga_app (se omite si no hay base migrada).
Logger.overrideLogger(false);
const env = new Entorno();
prepararSuite(env);

async function construir(
  max: number,
  opts: { trustProxy?: number | boolean; captcha?: VerificadorCaptcha } = {},
): Promise<NestFastifyApplication> {
  process.env['DATABASE_URL'] = URL_APP;
  let b = Test.createTestingModule({ imports: [AppModule] });
  if (opts.captcha) b = b.overrideProvider(VERIFICADOR_CAPTCHA).useValue(opts.captcha);
  const modulo = await b.compile();
  const a = modulo.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ trustProxy: trustProxyParaFastify(opts.trustProxy ?? false) }),
  );
  a.setGlobalPrefix(PREFIJO_GLOBAL);
  await registrarLimiteTasa(a, { max, ventanaMs: 60_000 });
  await a.init();
  await a.getHttpAdapter().getInstance().ready();
  return a;
}

let app: NestFastifyApplication | undefined;
const PCT = 'pct_max_cupo_pendiente_web';
const fijarPct = (v: number) =>
  env.dev.query(`update ga.configuracion set valor = $2::jsonb where clave = $1`, [PCT, String(v)]);
beforeAll(async () => {
  if (!(await hayBaseLista())) return;
  app = await construir(10_000);
  // Solo este archivo lee el tope de cupo retenido: se sube a 100 para las pruebas de cupo y se restaura al final.
  await fijarPct(100);
});
afterAll(async () => {
  if (app) await fijarPct(60);
  await app?.close();
});

async function mas(dias: number): Promise<string> {
  return (await env.dev.query(`select (ga.hoy_gt() + $1::int)::text as h`, [dias])).rows[0].h as string;
}

interface Opciones { key?: string | null; cuerpo?: Record<string, unknown>; a?: NestFastifyApplication }
function cuerpoBase(salidaId: string, extra: Record<string, unknown> = {}) {
  return {
    salida_id: salidaId, nombre: 'Cliente Falso', email: env.email('res'), telefono: '5555-0000', personas: 2,
    acepta_promos: false, idioma: 'es', turnstile_token: 'token-ok', ...extra,
  };
}
const post = (cuerpo: Record<string, unknown>, o: Opciones = {}) =>
  (o.a ?? app!).inject({
    method: 'POST', url: `/${PREFIJO_GLOBAL}/reservaciones`, payload: cuerpo,
    headers: o.key === null ? {} : { 'idempotency-key': o.key ?? randomUUID() },
  });

async function promo(tourId: string | null, pct: number, aplicaTodos = false): Promise<string> {
  const codigo = `R${randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase()}`;
  const r = await env.dev.query(
    `insert into ga.promociones (titulo, codigo, descuento_pct, tour_id, aplica_todos) values ('Promo', $1, $2, $3, $4) returning id`,
    [codigo, pct, tourId, aplicaTodos],
  );
  env.registrarPromo(r.rows[0].id as string);
  return codigo;
}
const escenario = (cupo = 5) => env.escenario({ cupo, fecha: undefined, horasCorte: 0 }).then(async (e) => {
  await env.dev.query(`update ga.salidas set fecha = ga.hoy_gt() + 10 where id = $1`, [e.salidaId]);
  return e;
});

describe('POST /reservaciones: camino feliz', () => {
  it('201 sin promo; total calculado en el servidor; sin consentimiento si no acepta', async () => {
    const e = await escenario();
    const body = cuerpoBase(e.salidaId);
    const r = await post(body);
    expect(r.statusCode).toBe(201);
    expect(r.headers['cache-control']).toBe('no-store');
    const j = r.json();
    expect(j).toMatchObject({
      estado: 'pendiente', fecha: await mas(10), personas: 2, subtotal_q: 200, descuento_q: 0, total_q: 200,
      tour: { slug: e.slug, nombre: 'Tour de prueba', nombre_en: null },
    });
    expect(j.codigo).toMatch(/^GA-[0-9A-F]{6}$/);
    expect(new Date(j.expira_at).getTime()).toBeGreaterThan(Date.now());
    expect(Object.keys(j).sort()).toEqual(['codigo', 'descuento_q', 'estado', 'expira_at', 'fecha', 'personas', 'subtotal_q', 'total_q', 'tour']);
    const c = await env.dev.query(`select count(*)::int n from ga.consentimientos where lower(email) = $1`, [body.email.toLowerCase()]);
    expect(c.rows[0].n).toBe(0);
  });

  it('201 con promo (minúsculas y espacios), precio especial y consentimiento al aceptar', async () => {
    const e = await escenario();
    await env.dev.query(`update ga.salidas set precio_q = 150 where id = $1`, [e.salidaId]);
    const cod = await promo(e.tourId, 10);
    const body = cuerpoBase(e.salidaId, { email: env.email('Res').toUpperCase(), codigo_promo: ` ${cod.toLowerCase()} `, acepta_promos: true, personas: 3 });
    const r = await post(body);
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ subtotal_q: 450, descuento_q: 45, total_q: 405 });
    const fila = (await env.dev.query(`select email, promo_id, client_ref, acepta_promos, id from ga.reservaciones where codigo = $1`, [r.json().codigo])).rows[0];
    expect(fila.email).toBe(body.email.toLowerCase());
    expect(fila.promo_id).not.toBeNull();
    expect(fila.acepta_promos).toBe(true);
    const c = (await env.dev.query(`select email, acepta, origen, reservacion_id, version_aviso from ga.consentimientos where reservacion_id = $1`, [fila.id])).rows;
    expect(c).toEqual([{ email: body.email.toLowerCase(), acepta: true, origen: 'reserva', reservacion_id: fila.id, version_aviso: '2026-11-24' }]);
  });

  it('promo de otro tour → 422 GA_PROMO_INVALIDA y no crea reservación', async () => {
    const a = await escenario();
    const b = await escenario();
    const cod = await promo(b.tourId, 10);
    const r = await post(cuerpoBase(a.salidaId, { codigo_promo: cod }));
    expect(r.statusCode).toBe(422);
    expect(r.json().code).toBe('GA_PROMO_INVALIDA');
    expect((await env.dev.query(`select count(*)::int n from ga.reservaciones where salida_id = $1`, [a.salidaId])).rows[0].n).toBe(0);
    const todos = await promo(null, 20, true);
    expect((await post(cuerpoBase(a.salidaId, { codigo_promo: todos }))).json()).toMatchObject({ descuento_q: 40, total_q: 160 });
  });
});

describe('POST /reservaciones: validación y captcha', () => {
  it('captcha que falla → 400 GA_CAPTCHA, sin reservación', async () => {
    const e = await escenario();
    const r = await post(cuerpoBase(e.salidaId, { turnstile_token: 'invalido' }));
    expect(r.statusCode).toBe(400);
    expect(r.json().code).toBe('GA_CAPTCHA');
    expect((await env.dev.query(`select count(*)::int n from ga.reservaciones where salida_id = $1`, [e.salidaId])).rows[0].n).toBe(0);
  });

  it('Idempotency-Key ausente o inválida → 400 GA_VALIDACION', async () => {
    const e = await escenario();
    for (const key of [null, 'no-es-uuid']) {
      const r = await post(cuerpoBase(e.salidaId), { key });
      expect(r.statusCode).toBe(400);
      expect(r.json().code).toBe('GA_VALIDACION');
    }
  });

  it('Idempotency-Key que no es UUID v4 → 400', async () => {
    const e = await escenario();
    for (const key of ['6ba7b810-9dad-11d1-80b4-00c04fd430c8', '00000000-0000-0000-0000-000000000000']) {
      expect((await post(cuerpoBase(e.salidaId), { key })).statusCode, key).toBe(400);
    }
  });

  it('nombre y notas rechazan caracteres de control y de formato Unicode', async () => {
    const e = await escenario();
    for (const extra of [
      { nombre: 'Ana\u0000 Pérez' }, { nombre: 'Ana\nPérez' }, { nombre: 'Ana\u200BPérez' }, { nombre: 'Ana\u202EPérez' },
      { notas: 'hola\u0007' }, { notas: 'hola\u200Bmundo' }, { notas: 'a\tb' },
    ]) {
      const r = await post(cuerpoBase(e.salidaId, extra));
      expect(r.statusCode, JSON.stringify(extra)).toBe(400);
      expect(r.json().code).toBe('GA_VALIDACION');
    }
    const ok = await post(cuerpoBase(e.salidaId, { notas: 'línea 1\nlínea 2' }));
    expect(ok.statusCode).toBe(201);
  });

  it('rechaza campos de precio enviados por el cliente (cuerpo estricto) y datos inválidos', async () => {
    const e = await escenario();
    for (const extra of [{ total_q: 1 }, { precio_q: 1 }, { descuento_q: 999 }, { email: 'no-es-correo' }, { personas: 0 },
      { personas: 1.5 }, { telefono: 'abc' }, { acepta_promos: 'si' }, { idioma: 'fr' }, { salida_id: 'x' }]) {
      const r = await post(cuerpoBase(e.salidaId, extra));
      expect(r.statusCode, JSON.stringify(extra)).toBe(400);
      expect(r.json().code).toBe('GA_VALIDACION');
    }
    expect((await env.dev.query(`select count(*)::int n from ga.reservaciones where salida_id = $1`, [e.salidaId])).rows[0].n).toBe(0);
  });
});

describe('POST /reservaciones: límites', () => {
  it('personas > max_personas_reserva_web → 422 GA_LIMITE_PERSONAS', async () => {
    const e = await escenario(30);
    const max = (await env.dev.query(`select ga.config_int('max_personas_reserva_web') v`)).rows[0].v as number;
    expect((await post(cuerpoBase(e.salidaId, { personas: max }))).statusCode).toBe(201);
    const r = await post(cuerpoBase(e.salidaId, { personas: max + 1 }));
    expect(r.statusCode).toBe(422);
    expect(r.json().code).toBe('GA_LIMITE_PERSONAS');
  });

  it('pendientes del mismo correo o teléfono → 422 GA_LIMITE_CONTACTO (por salida)', async () => {
    const e = await escenario(20);
    const max = (await env.dev.query(`select ga.config_int('max_pendientes_por_contacto') v`)).rows[0].v as number;
    const email = env.email('contacto');
    for (let i = 0; i < max; i++) {
      expect((await post(cuerpoBase(e.salidaId, { email, personas: 1, telefono: `5000000${i}0` }))).statusCode).toBe(201);
    }
    const porCorreo = await post(cuerpoBase(e.salidaId, { email: email.toUpperCase(), personas: 1 }));
    expect(porCorreo.statusCode).toBe(422);
    expect(porCorreo.json().code).toBe('GA_LIMITE_CONTACTO');
    // Mismo teléfono con distinto formato y otro correo.
    const tel = '4444 1111';
    for (let i = 0; i < max; i++) {
      expect((await post(cuerpoBase(e.salidaId, { personas: 1, telefono: tel }))).statusCode).toBe(201);
    }
    const porTel = await post(cuerpoBase(e.salidaId, { personas: 1, telefono: '4444-1111' }));
    expect(porTel.json().code).toBe('GA_LIMITE_CONTACTO');
    // Otra salida del mismo tour no cuenta.
    const otra = await env.salida(e.tourId, 5, await mas(11));
    expect((await post(cuerpoBase(otra, { email, personas: 1 }))).statusCode).toBe(201);
  });

  it('el conteo normaliza el contacto (+etiqueta, puntos de gmail, prefijo 502) sin cambiar lo guardado', async () => {
    const e = await escenario(30);
    const id = randomUUID().slice(0, 8);
    const envia = (salida: string, email: string, telefono: string) =>
      post(cuerpoBase(salida, { email, telefono, personas: 1 }));
    const base = `juan.perez${id}@gmail.com`;
    expect((await envia(e.salidaId, base, '7000 0001')).statusCode).toBe(201);
    expect((await envia(e.salidaId, `j.u.a.n.perez${id}@gmail.com`, '7000 0002')).statusCode).toBe(201); // 2.ª (máx 2)
    for (const otro of [`juanperez${id}+promo@gmail.com`, `juan.perez${id}@googlemail.com`]) {
      const r = await envia(e.salidaId, otro, '7000 0003');
      expect(r.statusCode, otro).toBe(422);
      expect(r.json().code).toBe('GA_LIMITE_CONTACTO');
    }
    // Lo guardado no se normaliza.
    const guardados = (await env.dev.query(`select email from ga.reservaciones where salida_id = $1 order by created_at`, [e.salidaId])).rows.map((r) => r.email);
    expect(guardados).toEqual([base, `j.u.a.n.perez${id}@gmail.com`]);
    // Fuera de gmail los puntos sí distinguen; la etiqueta no.
    const o = (n: number, local: string) => envia(e.salidaId, `${local}@otro.test`, `71000${n}00`);
    expect((await o(1, `a.b${id}`)).statusCode).toBe(201);
    expect((await o(2, `ab${id}`)).statusCode).toBe(201);
    expect((await o(3, `a.b${id}+x`)).statusCode).toBe(201); // 2.ª de a.b
    expect((await o(4, `a.b${id}+y`)).json().code).toBe('GA_LIMITE_CONTACTO');
    // Teléfono con y sin 502.
    const e2 = await escenario(30);
    const tel = (t: string, n: number) => envia(e2.salidaId, `p${n}${id}@t.test`, t);
    expect((await tel('+502 5555 1234', 1)).statusCode).toBe(201);
    expect((await tel('5555-1234', 2)).statusCode).toBe(201);
    expect((await tel('50255551234', 3)).json().code).toBe('GA_LIMITE_CONTACTO');
    expect((await tel('5555 1234', 4)).json().code).toBe('GA_LIMITE_CONTACTO');
  });

  it('las pendientes vencidas no cuentan para el límite de contacto', async () => {
    const e = await escenario(20);
    const email = env.email('venc');
    await env.reservar(e.salidaId, 1, 'pendiente', { email, expira_at: new Date(Date.now() - 3600_000).toISOString() });
    await env.reservar(e.salidaId, 1, 'pendiente', { email, expira_at: new Date(Date.now() - 7200_000).toISOString() });
    expect((await post(cuerpoBase(e.salidaId, { email }))).statusCode).toBe(201);
  });
});

describe('POST /reservaciones: idempotencia', () => {
  it('mismo key y mismo cuerpo → 200 con la misma reservación, sin captcha ni duplicado', async () => {
    const e = await escenario();
    const key = randomUUID();
    const body = cuerpoBase(e.salidaId);
    const a = await post(body, { key });
    expect(a.statusCode).toBe(201);
    // El captcha ya no se consulta en la repetición: un token inválido igual devuelve la misma reserva.
    const b = await post({ ...body, turnstile_token: 'invalido' }, { key });
    expect(b.statusCode).toBe(200);
    expect(b.json()).toEqual(a.json());
    expect((await env.dev.query(`select count(*)::int n from ga.reservaciones where salida_id = $1`, [e.salidaId])).rows[0].n).toBe(1);
  });

  it('mismo key con otra salida u otro correo → 409 GA_IDEMPOTENCIA_CONFLICTO', async () => {
    const e = await escenario();
    const otra = await escenario();
    const key = randomUUID();
    const body = cuerpoBase(e.salidaId);
    expect((await post(body, { key })).statusCode).toBe(201);
    for (const cambio of [{ salida_id: otra.salidaId }, { email: env.email('otro') }]) {
      const r = await post({ ...body, ...cambio }, { key });
      expect(r.statusCode).toBe(409);
      expect(r.json().code).toBe('GA_IDEMPOTENCIA_CONFLICTO');
    }
  });

  it('mismo key con cualquier otro campo distinto → 409; solo el token del captcha puede cambiar', async () => {
    const e = await escenario();
    const key = randomUUID();
    const body = cuerpoBase(e.salidaId, { notas: 'hola' });
    expect((await post(body, { key })).statusCode).toBe(201);
    for (const cambio of [{ nombre: 'Otro Nombre' }, { personas: 3 }, { telefono: '55559999' }, { notas: 'adiós' },
      { notas: null }, { codigo_promo: 'ABC123' }, { acepta_promos: true }, { idioma: 'en' }]) {
      const r = await post({ ...body, ...cambio }, { key });
      expect(r.statusCode, JSON.stringify(cambio)).toBe(409);
      expect(r.json().code).toBe('GA_IDEMPOTENCIA_CONFLICTO');
    }
    expect((await post({ ...body, turnstile_token: 'otro-token' }, { key })).statusCode).toBe(200);
  });

  it('captcha rechazado pero la reservación con esa clave ya existe (carrera) → 200 con esa reserva', async () => {
    const e = await escenario();
    const key = randomUUID();
    const body = cuerpoBase(e.salidaId);
    const creada = await post(body, { key }); // mismo cuerpo y clave que usará la "carrera"
    expect(creada.statusCode).toBe(201);
    // Verificador que simula un token ya gastado por la petición ganadora, y una búsqueda previa que no la vio.
    const a = await construir(10_000, { captcha: { verificar: async () => false } });
    try {
      // La reservación ya existe, así que la búsqueda previa la encuentra: se devuelve 200 sin consultar captcha.
      const r = await post({ ...body, turnstile_token: 'gastado' }, { key, a });
      expect(r.statusCode).toBe(200);
      expect(r.json().codigo).toBe(creada.json().codigo);
      // Sin reservación previa, el mismo verificador da GA_CAPTCHA.
      const sin = await post({ ...body, turnstile_token: 'gastado' }, { a });
      expect(sin.statusCode).toBe(400);
      expect(sin.json().code).toBe('GA_CAPTCHA');
    } finally {
      await a.close();
    }
  });

  it('captcha que falla justo cuando otra petición acaba de crear la reserva → 200 (relectura por client_ref)', async () => {
    const e = await escenario();
    const key = randomUUID();
    const body = cuerpoBase(e.salidaId);
    const base = await post(body, { key: randomUUID() });
    expect(base.statusCode).toBe(201);
    const email2 = env.email('carrera');
    const cuerpo2 = cuerpoBase(e.salidaId, { email: email2 });
    // El verificador crea (como la petición ganadora) la reservación con la clave y luego rechaza el token.
    const a = await construir(10_000, {
      captcha: {
        verificar: async () => {
          await post(cuerpo2, { key }); // ganadora
          return false;
        },
      },
    });
    try {
      // La petición perdedora llega con el mismo cuerpo; el captcha se rechaza porque el token ya se gastó.
      const r = await post({ ...cuerpo2, turnstile_token: 'gastado' }, { key, a });
      expect(r.statusCode).toBe(200);
    } finally {
      await a.close();
    }
    expect((await env.dev.query(`select count(*)::int n from ga.reservaciones where client_ref = $1`, [key])).rows[0].n).toBe(1);
  });

  it('5 peticiones simultáneas con la misma clave → una reservación, todas devuelven el mismo código', async () => {
    const e = await escenario();
    const key = randomUUID();
    const body = cuerpoBase(e.salidaId);
    const rs = await Promise.all(Array.from({ length: 5 }, () => post(body, { key })));
    expect(rs.map((r) => r.statusCode).sort()).toEqual([200, 200, 200, 200, 201]);
    expect(new Set(rs.map((r) => r.json().codigo)).size).toBe(1);
    expect((await env.dev.query(`select count(*)::int n from ga.reservaciones where salida_id = $1`, [e.salidaId])).rows[0].n).toBe(1);
  });
});

describe('POST /reservaciones: cupo, salida y plazo', () => {
  it('salida llena → 409 GA_CUPO_INSUFICIENTE con disponibles', async () => {
    const e = await escenario(5);
    await env.reservar(e.salidaId, 4, 'pagada');
    const r = await post(cuerpoBase(e.salidaId, { personas: 2 }));
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ code: 'GA_CUPO_INSUFICIENTE', disponibles: 1 });
  });

  it('salida inactiva → 409 GA_SALIDA_CERRADA; inexistente → 404', async () => {
    const e = await escenario();
    await env.dev.query(`update ga.salidas set activo = false where id = $1`, [e.salidaId]);
    const r = await post(cuerpoBase(e.salidaId));
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe('GA_SALIDA_CERRADA');
    expect((await post(cuerpoBase(randomUUID()))).statusCode).toBe(404);
  });

  it('fuera de plazo → 409 GA_FUERA_DE_PLAZO', async () => {
    const e = await escenario();
    await env.dev.query(`update ga.tours set horas_corte = 168, hora_salida = '23:59' where id = $1`, [e.tourId]);
    await env.dev.query(`update ga.salidas set fecha = ga.hoy_gt() + 1 where id = $1`, [e.salidaId]);
    const r = await post(cuerpoBase(e.salidaId));
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe('GA_FUERA_DE_PLAZO');
  });

  it('concurrencia: 10 peticiones por 5 lugares → exactamente 5 entran y 5 reciben 409', async () => {
    const e = await escenario(5);
    const rs = await Promise.all(
      Array.from({ length: 10 }, (_, i) => post(cuerpoBase(e.salidaId, { personas: 1, telefono: `5100000${i}1` }))),
    );
    const estados = rs.map((r) => r.statusCode);
    expect(estados.filter((s) => s === 201)).toHaveLength(5);
    expect(estados.filter((s) => s === 409)).toHaveLength(5);
    // Con el tope al 100% las pendientes rechazan por retención; el trigger (GA001) cubre el resto: ambos son 409 de cupo.
    for (const r of rs.filter((x) => x.statusCode === 409)) expect(['GA_CUPO_RETENIDO', 'GA_CUPO_INSUFICIENTE']).toContain(r.json().code);
    const n = (await env.dev.query(`select coalesce(sum(personas),0)::int n from ga.reservaciones where salida_id = $1`, [e.salidaId])).rows[0].n;
    expect(n).toBe(5);
  });
});

describe('POST /reservaciones: tope de cupo retenido por pendientes', () => {
  it('pendientes + nueva > pct del cupo → 409 GA_CUPO_RETENIDO; las confirmadas/pagadas no cuentan', async () => {
    await fijarPct(60);
    try {
      const e = await escenario(10); // tope: 6 personas pendientes
      await env.reservar(e.salidaId, 2, 'pagada'); // no cuenta para el tope
      expect((await post(cuerpoBase(e.salidaId, { personas: 3, telefono: '60000011' }))).statusCode).toBe(201);
      expect((await post(cuerpoBase(e.salidaId, { personas: 3, telefono: '60000022' }))).statusCode).toBe(201);
      const r = await post(cuerpoBase(e.salidaId, { personas: 1, telefono: '60000033' }));
      expect(r.statusCode).toBe(409);
      expect(r.json().code).toBe('GA_CUPO_RETENIDO');
      // Una pendiente vencida deja de retener.
      await env.dev.query(`update ga.reservaciones set expira_at = now() - interval '1 hour'
                           where salida_id = $1 and personas = 3 and estado = 'pendiente'`, [e.salidaId]);
      expect((await post(cuerpoBase(e.salidaId, { personas: 1, telefono: '60000044' }))).statusCode).toBe(201);
    } finally {
      await fijarPct(100);
    }
  });
});

describe('POST /reservaciones: límite por IP', () => {
  it('excede el máximo → 429 GA_DEMASIADAS_SOLICITUDES en problem+json', async () => {
    const limitada = await construir(3);
    try {
      const mal = { nada: true };
      for (let i = 0; i < 3; i++) expect((await post(mal, { a: limitada })).statusCode).toBe(400);
      const r = await post(mal, { a: limitada });
      expect(r.statusCode).toBe(429);
      expect(r.json()).toMatchObject({ code: 'GA_DEMASIADAS_SOLICITUDES', status: 429 });
      // Otras rutas no están limitadas.
      for (let i = 0; i < 5; i++) expect((await limitada.inject({ method: 'GET', url: `/${PREFIJO_GLOBAL}/tours` })).statusCode).toBe(200);
    } finally {
      await limitada.close();
    }
  });

  it('con TRUST_PROXY=1, un X-Forwarded-For falso a la izquierda no cambia la clave del límite', async () => {
    const limitada = await construir(3, { trustProxy: 1 });
    try {
      const enviar = (falso: string) =>
        limitada.inject({
          method: 'POST', url: `/${PREFIJO_GLOBAL}/reservaciones`, payload: { nada: true }, remoteAddress: '10.0.0.5',
          headers: { 'x-forwarded-for': `${falso}, 203.0.113.9` }, // el proxy añade la IP real a la derecha
        });
      for (let i = 0; i < 3; i++) expect((await enviar(`198.51.100.${i + 1}`)).statusCode).toBe(400);
      expect((await enviar('198.51.100.200')).statusCode).toBe(429);
      // Otra IP real sí tiene su propio cupo.
      const otro = await limitada.inject({
        method: 'POST', url: `/${PREFIJO_GLOBAL}/reservaciones`, payload: {}, remoteAddress: '10.0.0.5',
        headers: { 'x-forwarded-for': '198.51.100.1, 203.0.113.77' },
      });
      expect(otro.statusCode).toBe(400);
    } finally {
      await limitada.close();
    }
  });

  it('sin TRUST_PROXY, X-Forwarded-For se ignora (la clave es la IP del socket)', async () => {
    const limitada = await construir(2);
    try {
      const enviar = (falso: string) =>
        limitada.inject({
          method: 'POST', url: `/${PREFIJO_GLOBAL}/reservaciones`, payload: { nada: true }, remoteAddress: '10.0.0.6',
          headers: { 'x-forwarded-for': falso },
        });
      expect((await enviar('1.1.1.1')).statusCode).toBe(400);
      expect((await enviar('2.2.2.2')).statusCode).toBe(400);
      expect((await enviar('3.3.3.3')).statusCode).toBe(429);
    } finally {
      await limitada.close();
    }
  });
});
