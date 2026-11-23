import { describe, expect, it } from 'vitest';
import { capturar, detalle, Entorno, prepararSuite } from '../ayudas-db';

const pasado = () => new Date(Date.now() - 3600_000).toISOString();
const futuro = () => new Date(Date.now() + 3600_000).toISOString();

describe('BD: ocupa_lugar, salida cerrada, plazo, aislamiento, sobreventa, pendientes', () => {
  const env = new Entorno();
  prepararSuite(env);

  describe('b. ocupa_lugar', () => {
    it.each([
      ['pendiente', futuro(), true],
      ['pendiente', pasado(), false],
      ['confirmada', null, true],
      ['pagada', null, true],
      ['cancelada', null, false],
      ['vencida', null, false],
      ['cancelada', futuro(), false],
      ['confirmada', pasado(), true], // expira_at solo importa en pendientes
      ['estado_desconocido', null, true], // modo cerrado: lo desconocido ocupa
    ])('%s con expira_at %s -> %s', async (estado, exp, esperado) => {
      const r = await env.app.query(`select ga.ocupa_lugar($1, $2::timestamptz) as v`, [estado, exp]);
      expect(r.rows[0].v).toBe(esperado);
    });

    it('pendiente sin expira_at ocupa (modo cerrado)', async () => {
      const r = await env.app.query(`select ga.ocupa_lugar('pendiente', null) as v`);
      expect(r.rows[0].v).toBe(true);
    });

    it('ocupados() coincide con cada estado', async () => {
      const { salidaId } = await env.escenario({ cupo: 50 });
      await env.reservar(salidaId, 1, 'pendiente', { expira_at: futuro() });
      await env.reservar(salidaId, 2, 'pendiente', { expira_at: pasado() });
      await env.reservar(salidaId, 4, 'confirmada');
      await env.reservar(salidaId, 8, 'pagada');
      await env.reservar(salidaId, 16, 'cancelada');
      await env.reservar(salidaId, 3, 'vencida');
      const r = await env.app.query(`select ga.ocupados($1) as n`, [salidaId]);
      expect(r.rows[0].n).toBe(1 + 4 + 8);
    });
  });

  describe('c. salida inactiva', () => {
    it('insertar falla con GA003 / GA_SALIDA_CERRADA, también con permitir_fuera_de_plazo', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      await env.dev.query(`update ga.salidas set activo = false where id = $1`, [salidaId]);
      const e = await capturar(env.reservar(salidaId, 1, 'confirmada'));
      expect(e?.code).toBe('GA003');
      expect(e?.message).toBe('GA_SALIDA_CERRADA');

      const c = await env.app.connect();
      try {
        await c.query('begin');
        await c.query(`set local ga.permitir_fuera_de_plazo = 'on'`);
        const e2 = await capturar(env.reservar(salidaId, 1, 'confirmada', {}, c));
        expect(e2?.code).toBe('GA003');
      } finally {
        await c.query('rollback').catch(() => undefined);
        c.release();
      }
    });

    it('una cancelada sí se puede insertar en salida inactiva (no ocupa lugar)', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      await env.dev.query(`update ga.salidas set activo = false where id = $1`, [salidaId]);
      await expect(env.reservar(salidaId, 1, 'cancelada')).resolves.toBeTruthy();
    });

    it('actualizar una reservación existente de una salida inactiva no falla por inactiva', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const id = await env.reservar(salidaId, 1, 'pendiente');
      await env.dev.query(`update ga.salidas set activo = false where id = $1`, [salidaId]);
      await env.app.query(`update ga.reservaciones set estado = 'confirmada' where id = $1`, [id]);
    });
  });

  describe('d. fuera de plazo', () => {
    // Fecha de ayer en Guatemala: el cierre ya pasó.
    const ayerGt = async () =>
      (await env.app.query(`select (ga.hoy_gt() - 1)::text as d`)).rows[0].d as string;

    it('insertar falla con GA004 y entra con ga.permitir_fuera_de_plazo = on', async () => {
      const { salidaId } = await env.escenario({ cupo: 5, fecha: await ayerGt() });
      const e = await capturar(env.reservar(salidaId, 1, 'confirmada'));
      expect(e?.code).toBe('GA004');
      expect(e?.message).toBe('GA_FUERA_DE_PLAZO');

      const c = await env.app.connect();
      try {
        await c.query('begin');
        await c.query(`set local ga.permitir_fuera_de_plazo = 'on'`);
        await expect(env.reservar(salidaId, 1, 'confirmada', {}, c)).resolves.toBeTruthy();
        await c.query('commit');
      } finally {
        await c.query('rollback').catch(() => undefined);
        c.release();
      }
      // La excepción es local a la transacción: la siguiente vuelve a fallar.
      expect((await capturar(env.reservar(salidaId, 1, 'confirmada')))?.code).toBe('GA004');
    });

    it('otro valor distinto de on no abre el plazo', async () => {
      const { salidaId } = await env.escenario({ cupo: 5, fecha: await ayerGt() });
      const c = await env.app.connect();
      try {
        await c.query('begin');
        await c.query(`set local ga.permitir_fuera_de_plazo = 'si'`);
        expect((await capturar(env.reservar(salidaId, 1, 'confirmada', {}, c)))?.code).toBe('GA004');
      } finally {
        await c.query('rollback').catch(() => undefined);
        c.release();
      }
    });

    it('el límite es el cierre_reserva: justo antes entra, justo después no', async () => {
      // Salida de hoy en Guatemala con hora_salida muy temprana vs muy tardía, corte 0.
      const hoy = (await env.app.query(`select ga.hoy_gt()::text as d`)).rows[0].d as string;
      const pasada = await env.escenario({ cupo: 5, fecha: hoy, horaSalida: '00:00', horasCorte: 0 });
      const hora = (await env.app.query(`select to_char(ga.ahora_gt(), 'HH24:MI') as h`)).rows[0].h as string;
      if (hora !== '00:00') {
        expect((await capturar(env.reservar(pasada.salidaId, 1, 'confirmada')))?.code).toBe('GA004');
      }
      const manana = (await env.app.query(`select (ga.hoy_gt() + 1)::text as d`)).rows[0].d as string;
      const futura = await env.escenario({ cupo: 5, fecha: manana, horaSalida: '00:00', horasCorte: 0 });
      await expect(env.reservar(futura.salidaId, 1, 'confirmada')).resolves.toBeTruthy();
    });

    it('una cancelada fuera de plazo se acepta (no ocupa lugar)', async () => {
      const { salidaId } = await env.escenario({ cupo: 5, fecha: await ayerGt() });
      await expect(env.reservar(salidaId, 1, 'cancelada')).resolves.toBeTruthy();
    });
  });

  describe('e. aislamiento', () => {
    it.each(['repeatable read', 'serializable'])('insertar en una transacción %s falla', async (nivel) => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const c = await env.app.connect();
      try {
        await c.query(`begin isolation level ${nivel}`);
        const e = await capturar(env.reservar(salidaId, 1, 'confirmada', {}, c));
        expect(e?.message).toMatch(/READ COMMITTED/);
      } finally {
        await c.query('rollback').catch(() => undefined);
        c.release();
      }
      const n = await env.app.query(`select count(*)::int as n from ga.reservaciones where salida_id = $1`, [salidaId]);
      expect(n.rows[0].n).toBe(0);
    });

    it('una cancelada en repeatable read no necesita validar cupo', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const c = await env.app.connect();
      try {
        await c.query('begin isolation level repeatable read');
        await expect(env.reservar(salidaId, 1, 'cancelada', {}, c)).resolves.toBeTruthy();
      } finally {
        await c.query('rollback').catch(() => undefined);
        c.release();
      }
    });
  });

  describe('f. salida sobrevendida', () => {
    /** Crea como dueño (con triggers desactivados en su sesión) una salida de cupo 2 con 4 personas confirmadas. */
    async function sobrevendida() {
      const { salidaId } = await env.escenario({ cupo: 2 });
      const c = await env.dev.connect();
      const ids: string[] = [];
      try {
        await c.query(`set session_replication_role = replica`);
        ids.push(await env.reservar(salidaId, 2, 'confirmada', {}, c));
        ids.push(await env.reservar(salidaId, 2, 'confirmada', {}, c));
        ids.push(await env.reservar(salidaId, 1, 'pendiente', { expira_at: futuro() }, c));
      } finally {
        await c.query(`set session_replication_role = origin`).catch(() => undefined);
        c.release();
      }
      return { salidaId, ids };
    }

    it('confirmar y pagar funcionan; subir personas o insertar fallan con GA001', async () => {
      const { salidaId, ids } = await sobrevendida();
      const o = await env.app.query(`select ga.ocupados($1) as n`, [salidaId]);
      expect(o.rows[0].n).toBe(5);
      await env.app.query(`update ga.reservaciones set estado = 'confirmada' where id = $1`, [ids[2]]); // pendiente -> confirmada
      await env.app.query(`update ga.reservaciones set estado = 'pagada' where id = $1`, [ids[0]]);
      await env.app.query(`update ga.reservaciones set personas = 1 where id = $1`, [ids[1]]); // bajar siempre se puede
      const e = await capturar(env.app.query(`update ga.reservaciones set personas = 3 where id = $1`, [ids[1]]));
      expect(e?.code).toBe('GA001');
      expect(detalle(e)).toEqual({ disponibles: 0 });
      expect((await capturar(env.reservar(salidaId, 1, 'confirmada')))?.code).toBe('GA001');
    });

    it('cancelar una sobrevendida y reactivarla sí revalida', async () => {
      const { ids } = await sobrevendida();
      await env.app.query(`update ga.reservaciones set estado = 'cancelada' where id = $1`, [ids[0]]);
      // vuelve a ocupar: 2 + 1 (otras) + 2 > 2
      const e = await capturar(env.app.query(`update ga.reservaciones set estado = 'confirmada' where id = $1`, [ids[0]]));
      expect(e?.code).toBe('GA001');
    });

    it('bajar el cupo de una sobrevendida sigue prohibido', async () => {
      const { salidaId } = await sobrevendida();
      const e = await capturar(env.app.query(`update ga.salidas set cupo = 1 where id = $1`, [salidaId]));
      expect(e?.code).toBe('GA002');
    });
  });

  describe('g. pendientes y expira_at', () => {
    it('pasar a pendiente sin expira_at le fija uno vigente', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const id = await env.reservar(salidaId, 1, 'confirmada');
      await env.app.query(`update ga.reservaciones set estado = 'pendiente' where id = $1`, [id]);
      const r = await env.app.query(`select expira_at > now() as vigente from ga.reservaciones where id = $1`, [id]);
      expect(r.rows[0].vigente).toBe(true);
    });

    it('reactivar una cancelada con plazo viejo vencido renueva el plazo', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const id = await env.reservar(salidaId, 1, 'cancelada', { expira_at: pasado() });
      await env.app.query(`update ga.reservaciones set estado = 'pendiente' where id = $1`, [id]);
      const r = await env.app.query(`select expira_at > now() + interval '1 hour' as vigente from ga.reservaciones where id = $1`, [id]);
      expect(r.rows[0].vigente).toBe(true);
    });

    it('si se da un expira_at nuevo al pasar a pendiente, se respeta', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const id = await env.reservar(salidaId, 1, 'confirmada');
      await env.app.query(`update ga.reservaciones set estado = 'pendiente', expira_at = '2031-01-01T00:00:00Z' where id = $1`, [id]);
      const r = await env.app.query(`select expira_at from ga.reservaciones where id = $1`, [id]);
      expect((r.rows[0].expira_at as Date).toISOString()).toBe('2031-01-01T00:00:00.000Z');
    });

    it('el CHECK impide una pendiente con expira_at nulo', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const id = await env.reservar(salidaId, 1, 'pendiente');
      const e = await capturar(env.app.query(`update ga.reservaciones set expira_at = null where id = $1`, [id]));
      expect(e?.code).toBe('23514');
      expect(e?.message).toMatch(/reservaciones_pendiente_expira_check/);
    });

    it('insertar pendiente con expira_at nulo explícito recibe plazo (no falla)', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const id = await env.reservar(salidaId, 1, 'pendiente', { expira_at: null });
      const r = await env.app.query(`select expira_at is not null as ok from ga.reservaciones where id = $1`, [id]);
      expect(r.rows[0].ok).toBe(true);
    });
  });
});
