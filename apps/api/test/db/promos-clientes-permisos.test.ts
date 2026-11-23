import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { capturar, Entorno, prepararSuite } from '../ayudas-db';

describe('BD: promociones, vista clientes y permisos', () => {
  const env = new Entorno();
  prepararSuite(env);

  async function promo(tourId: string | null, aplicaTodos = false): Promise<string> {
    const r = await env.app.query(
      `insert into ga.promociones (titulo, tour_id, aplica_todos) values ('Promo de prueba', $1, $2) returning id`,
      [tourId, aplicaTodos],
    );
    env.registrarPromo(r.rows[0].id);
    return r.rows[0].id;
  }
  const estadoPromo = async (id: string) =>
    (await env.app.query(`select activo, tour_id, aplica_todos from ga.promociones where id = $1`, [id])).rows[0];

  describe('11. borrar tours y promociones', () => {
    it('sin reservas: desactiva sus promos y no las vuelve globales', async () => {
      const { tourId } = await env.escenario();
      const otro = await env.escenario();
      const p = await promo(tourId);
      const pOtro = await promo(otro.tourId);
      const global = await promo(null, true);
      await env.app.query(`delete from ga.tours where id = $1`, [tourId]);
      expect(await estadoPromo(p)).toEqual({ activo: false, tour_id: null, aplica_todos: false });
      expect(await estadoPromo(pOtro)).toMatchObject({ activo: true, tour_id: otro.tourId });
      expect(await estadoPromo(global)).toMatchObject({ activo: true, aplica_todos: true });
    });

    it('con reservas lo impide la FK y la promo queda intacta', async () => {
      const { tourId, salidaId } = await env.escenario();
      await env.reservar(salidaId, 1, 'confirmada');
      const p = await promo(tourId);
      const e = await capturar(env.app.query(`delete from ga.tours where id = $1`, [tourId]));
      expect(e?.code).toBe('23503');
      expect(await estadoPromo(p)).toMatchObject({ activo: true, tour_id: tourId });
    });

    it('aplica_todos con tour_id a la vez se rechaza', async () => {
      const { tourId } = await env.escenario();
      const e = await capturar(promo(tourId, true));
      expect(e?.code).toBe('23514');
    });

    it('activa sin tour y sin aplica_todos se rechaza; inactiva sí se permite', async () => {
      const e = await capturar(promo(null, false));
      expect(e?.code).toBe('23514');
      const r = await env.app.query(
        `insert into ga.promociones (titulo, activo) values ('Promo inactiva de prueba', false) returning id`,
      );
      env.registrarPromo(r.rows[0].id);
      // Una promo con tour no puede quedar activa sin alcance al quitarle el tour.
      const { tourId } = await env.escenario();
      const p = await promo(tourId);
      const e2 = await capturar(env.app.query(`update ga.promociones set tour_id = null where id = $1`, [p]));
      expect(e2?.code).toBe('23514');
    });
  });

  describe('12. vista clientes: acepta_promos', () => {
    const acepta = async (email: string) => {
      const r = await env.app.query(`select acepta_promos from ga.clientes where email = lower($1)`, [email]);
      expect(r.rows).toHaveLength(1);
      return r.rows[0].acepta_promos as boolean;
    };
    // Una baja siempre lleva acepta = false; un alta viene del panel.
    const consent = (email: string, ok: boolean, cuando: string) =>
      env.app.query(`insert into ga.consentimientos (email, acepta, origen, creado_en) values ($1, $2, $3, $4)`, [
        email,
        ok,
        ok ? 'panel' : 'baja',
        cuando,
      ]);

    it('solo la reserva: manda su acepta_promos', async () => {
      const { salidaId } = await env.escenario();
      const email = env.email();
      await env.reservar(salidaId, 1, 'confirmada', { email, acepta_promos: true });
      expect(await acepta(email)).toBe(true);
      const email2 = env.email();
      await env.reservar(salidaId, 1, 'confirmada', { email: email2, acepta_promos: false });
      expect(await acepta(email2)).toBe(false);
    });

    it('consentimiento más nuevo que la reserva gana (baja)', async () => {
      const { salidaId } = await env.escenario();
      const email = env.email();
      await env.reservar(salidaId, 1, 'confirmada', { email, acepta_promos: true, created_at: '2030-01-01T00:00:00Z' });
      await consent(email, false, '2030-02-01T00:00:00Z');
      expect(await acepta(email)).toBe(false);
    });

    it('consentimiento más viejo que la reserva pierde', async () => {
      const { salidaId } = await env.escenario();
      const email = env.email();
      await consent(email, false, '2029-01-01T00:00:00Z');
      await env.reservar(salidaId, 1, 'confirmada', { email, acepta_promos: true, created_at: '2030-01-01T00:00:00Z' });
      expect(await acepta(email)).toBe(true);
    });

    it('gana el más reciente entre varios consentimientos y reservas', async () => {
      const { salidaId } = await env.escenario();
      const email = env.email();
      await env.reservar(salidaId, 1, 'confirmada', { email, acepta_promos: false, created_at: '2030-01-01T00:00:00Z' });
      await consent(email, true, '2030-02-01T00:00:00Z');
      await consent(email, false, '2030-03-01T00:00:00Z');
      await env.reservar(salidaId, 1, 'confirmada', { email, acepta_promos: true, created_at: '2030-04-01T00:00:00Z' });
      expect(await acepta(email)).toBe(true);
      await consent(email, false, '2030-05-01T00:00:00Z');
      expect(await acepta(email)).toBe(false);
    });

    it('correos con mayúsculas distintas son la misma persona', async () => {
      const { salidaId } = await env.escenario();
      const base = `Mixto-${randomUUID()}@Prueba.Test`;
      await env.reservar(salidaId, 1, 'confirmada', { email: base.toUpperCase(), acepta_promos: true, created_at: '2030-01-01T00:00:00Z' });
      await env.reservar(salidaId, 1, 'confirmada', { email: base.toLowerCase(), acepta_promos: true, created_at: '2030-01-02T00:00:00Z' });
      await consent(base.toLowerCase(), false, '2030-03-01T00:00:00Z');
      const r = await env.app.query(`select reservas, acepta_promos from ga.clientes where email = lower($1)`, [base]);
      expect(r.rows).toEqual([{ reservas: 2, acepta_promos: false }]);
    });

    it('empate exacto: gana el consentimiento sobre la reserva, y dentro acepta = false', async () => {
      const { salidaId } = await env.escenario();
      const t = '2030-01-01T00:00:00Z';
      const a = env.email();
      await env.reservar(salidaId, 1, 'confirmada', { email: a, acepta_promos: true, created_at: t });
      await consent(a, false, t);
      expect(await acepta(a)).toBe(false); // consentimiento (baja) gana a la reserva
      const b = env.email();
      await env.reservar(salidaId, 1, 'confirmada', { email: b, acepta_promos: false, created_at: t });
      await consent(b, true, t);
      expect(await acepta(b)).toBe(true); // consentimiento gana a la reserva
      const c = env.email();
      await consent(c, true, t);
      await consent(c, false, t);
      await env.reservar(salidaId, 1, 'confirmada', { email: c, acepta_promos: true, created_at: t });
      for (let i = 0; i < 3; i++) expect(await acepta(c)).toBe(false); // entre consentimientos, false
    });

    it('CHECK de consentimientos: baja con acepta, correo con mayúsculas o espacios se rechazan', async () => {
      const ins = (email: string, acepta: boolean, origen: string) =>
        capturar(env.app.query(`insert into ga.consentimientos (email, acepta, origen) values ($1, $2, $3)`, [email, acepta, origen]));
      expect((await ins(env.email(), true, 'baja'))?.code).toBe('23514');
      expect((await ins('Mayus@prueba.test', false, 'baja'))?.code).toBe('23514');
      expect((await ins(' espacio@prueba.test', false, 'baja'))?.code).toBe('23514');
      expect(await ins(env.email(), false, 'baja')).toBeNull();
    });

    it('vencidas y canceladas no cuentan como activas', async () => {
      const { salidaId } = await env.escenario();
      const email = env.email();
      await env.reservar(salidaId, 2, 'confirmada', { email });
      await env.reservar(salidaId, 3, 'cancelada', { email });
      await env.reservar(salidaId, 4, 'vencida', { email });
      const r = await env.app.query(`select reservas, reservas_activas, viajeros from ga.clientes where email = $1`, [email]);
      expect(r.rows).toEqual([{ reservas: 3, reservas_activas: 1, viajeros: 2 }]);
    });
  });

  describe('13. permisos', () => {
    const permiso = async (pool: 'app' | 'lectura', sql: string) => (await capturar(env[pool].query(sql)))?.code;

    it('ga_app: sin INSERT/DELETE en configuracion', async () => {
      expect(await permiso('app', `insert into ga.configuracion (clave, valor, descripcion) values ('x_prueba', '1', 'x')`)).toBe('42501');
      expect(await permiso('app', `delete from ga.configuracion where clave = 'x_prueba'`)).toBe('42501');
      expect(await permiso('app', `select 1 from ga.configuracion`)).toBeUndefined();
      expect(await permiso('app', `update ga.configuracion set valor = valor where clave = 'x_prueba'`)).toBeUndefined();
    });

    it('ga_app: consentimientos solo INSERT y SELECT', async () => {
      expect(await permiso('app', `update ga.consentimientos set acepta = true where false`)).toBe('42501');
      expect(await permiso('app', `delete from ga.consentimientos where false`)).toBe('42501');
      expect(await permiso('app', `select 1 from ga.consentimientos`)).toBeUndefined();
    });

    it('ga_app: historial de configuración solo SELECT/INSERT', async () => {
      expect(await permiso('app', `select 1 from ga.configuracion_historial limit 1`)).toBeUndefined();
      expect(await permiso('app', `update ga.configuracion_historial set clave = clave where false`)).toBe('42501');
      expect(await permiso('app', `delete from ga.configuracion_historial where false`)).toBe('42501');
    });

    it('ga_app: nunca DELETE en reservaciones', async () => {
      expect(await permiso('app', `delete from ga.reservaciones where false`)).toBe('42501');
    });

    it('ga_lectura: solo lee', async () => {
      for (const t of ['reservaciones', 'configuracion', 'consentimientos', 'clientes', 'tours', 'salidas', 'promociones']) {
        expect(await permiso('lectura', `select 1 from ga.${t} limit 1`)).toBeUndefined();
      }
      expect(await permiso('lectura', `update ga.configuracion set valor = valor`)).toBe('42501');
      expect(await permiso('lectura', `update ga.reservaciones set nombre = nombre where false`)).toBe('42501');
      expect(await permiso('lectura', `delete from ga.reservaciones where false`)).toBe('42501');
      expect(await permiso('lectura', `insert into ga.consentimientos (email, acepta, origen) values ('a@b.test', true, 'baja')`)).toBe('42501');
      expect(await permiso('lectura', `delete from ga.tours where false`)).toBe('42501');
    });
  });
});
