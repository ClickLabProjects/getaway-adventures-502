import { describe, expect, it } from 'vitest';
import { capturar, detalle, Entorno, prepararSuite, pausa } from '../ayudas-db';

// Se omite (no falla) si no hay Postgres local migrado. Ver db/README.md.
describe('BD: cupo, vencimiento de pendientes y concurrencia', () => {
  const env = new Entorno();
  prepararSuite(env);

  const expectCupo = (e: Awaited<ReturnType<typeof capturar>>, disponibles: number) => {
    expect(e?.code).toBe('GA001');
    expect(e?.message).toBe('GA_CUPO_INSUFICIENTE');
    expect(detalle(e)).toEqual({ disponibles });
  };

  describe('1. expira_at de pendientes', () => {
    it('= ahora + horas configuradas y cambia con la configuración', async () => {
      const { salidaId } = await env.escenario({ cupo: 50 });
      const horas = async () => {
        const id = await env.reservar(salidaId, 1, 'pendiente');
        const r = await env.app.query(
          `select extract(epoch from (expira_at - created_at)) / 3600 as h, expira_at is not null as ok
           from ga.reservaciones where id = $1`,
          [id],
        );
        return r.rows[0] as { h: number; ok: boolean };
      };
      const antes = await horas();
      expect(antes.ok).toBe(true);
      expect(Number(antes.h)).toBeCloseTo(24, 1);

      const original = (await env.app.query(`select valor from ga.configuracion where clave = 'horas_vencimiento_pendiente'`))
        .rows[0].valor;
      try {
        await env.app.query(`update ga.configuracion set valor = '48' where clave = 'horas_vencimiento_pendiente'`);
        expect(Number((await horas()).h)).toBeCloseTo(48, 1);
      } finally {
        await env.app.query(`update ga.configuracion set valor = $1 where clave = 'horas_vencimiento_pendiente'`, [
          JSON.stringify(original),
        ]);
        await env.dev.query(`delete from ga.configuracion_historial where clave = 'horas_vencimiento_pendiente'`);
      }
    });

    it('no pisa un expira_at explícito ni lo fija en otros estados', async () => {
      const { salidaId } = await env.escenario({ cupo: 50 });
      const a = await env.reservar(salidaId, 1, 'pendiente', { expira_at: '2031-01-01T00:00:00Z' });
      const b = await env.reservar(salidaId, 1, 'confirmada');
      const r = await env.app.query(`select id, expira_at from ga.reservaciones where id = any($1)`, [[a, b]]);
      const por = new Map(r.rows.map((x) => [x.id, x.expira_at as Date | null]));
      expect(por.get(a)?.toISOString()).toBe('2031-01-01T00:00:00.000Z');
      expect(por.get(b)).toBeNull();
    });
  });

  describe('2. insertar por encima del cupo', () => {
    it.each(['confirmada', 'pagada', 'pendiente'])('estado %s sin lugar falla con GA001 y disponibles', async (estado) => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      await env.reservar(salidaId, 3, 'confirmada');
      expectCupo(await capturar(env.reservar(salidaId, 3, estado)), 2);
      await expect(env.reservar(salidaId, 2, estado)).resolves.toBeTruthy(); // exactamente el último lugar
      expectCupo(await capturar(env.reservar(salidaId, 1, estado)), 0);
    });
  });

  describe('3. canceladas y vencidas', () => {
    it.each(['cancelada', 'vencida'])('%s no ocupa cupo, y reactivarla sin lugar falla', async (estado) => {
      const { salidaId } = await env.escenario({ cupo: 3 });
      const id = await env.reservar(salidaId, 3, estado); // no ocupa cupo
      await env.reservar(salidaId, 3, 'confirmada'); // el cupo sigue libre
      const e = await capturar(env.app.query(`update ga.reservaciones set estado = 'confirmada' where id = $1`, [id]));
      expectCupo(e, 0);
      const e2 = await capturar(env.app.query(`update ga.reservaciones set estado = 'pendiente', expira_at = null where id = $1`, [id]));
      expectCupo(e2, 0);
    });

    it('una cancelada más grande que el cupo se acepta', async () => {
      const { salidaId } = await env.escenario({ cupo: 2 });
      await expect(env.reservar(salidaId, 10, 'cancelada')).resolves.toBeTruthy();
    });
  });

  describe('4. pendientes expiradas', () => {
    it('no ocupan cupo y al volver a vigentes revalidan', async () => {
      const { salidaId } = await env.escenario({ cupo: 2 });
      const vieja = await env.reservar(salidaId, 2, 'pendiente', { expira_at: new Date(Date.now() - 3600_000).toISOString() });
      await env.reservar(salidaId, 2, 'confirmada'); // cabe porque la pendiente expiró
      const e = await capturar(
        env.app.query(`update ga.reservaciones set expira_at = now() + interval '1 hour' where id = $1`, [vieja]),
      );
      expectCupo(e, 0);
    });

    it('si hay lugar, volver a vigente funciona', async () => {
      const { salidaId } = await env.escenario({ cupo: 2 });
      const vieja = await env.reservar(salidaId, 2, 'pendiente', { expira_at: new Date(Date.now() - 3600_000).toISOString() });
      await env.app.query(`update ga.reservaciones set expira_at = now() + interval '1 hour' where id = $1`, [vieja]);
    });
  });

  describe('5. update revalida sin contar la propia fila', () => {
    it('personas', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const id = await env.reservar(salidaId, 3, 'confirmada');
      await env.reservar(salidaId, 1, 'confirmada');
      await env.app.query(`update ga.reservaciones set personas = 4 where id = $1`, [id]); // 4 + 1 = 5
      await env.app.query(`update ga.reservaciones set personas = 4 where id = $1`, [id]); // idempotente
      expectCupo(await capturar(env.app.query(`update ga.reservaciones set personas = 5 where id = $1`, [id])), 4); // disponibles sin contar la propia fila
    });

    it('salida', async () => {
      const { tourId, salidaId } = await env.escenario({ cupo: 5 });
      const otra = await env.salida(tourId, 2, '2030-06-16');
      await env.reservar(otra, 2, 'confirmada');
      const id = await env.reservar(salidaId, 1, 'confirmada');
      expectCupo(await capturar(env.app.query(`update ga.reservaciones set salida_id = $2 where id = $1`, [id, otra])), 0);
      const libre = await env.salida(tourId, 3, '2030-06-17');
      await env.app.query(`update ga.reservaciones set salida_id = $2 where id = $1`, [id, libre]);
    });

    it('estado', async () => {
      const { salidaId } = await env.escenario({ cupo: 2 });
      const id = await env.reservar(salidaId, 2, 'pendiente');
      await env.app.query(`update ga.reservaciones set estado = 'confirmada' where id = $1`, [id]); // no se cuenta doble
      await env.app.query(`update ga.reservaciones set estado = 'pagada' where id = $1`, [id]);
      await env.app.query(`update ga.reservaciones set estado = 'cancelada' where id = $1`, [id]);
      await env.reservar(salidaId, 2, 'confirmada');
      expectCupo(await capturar(env.app.query(`update ga.reservaciones set estado = 'pagada' where id = $1`, [id])), 0);
    });
  });

  describe('6. concurrencia', () => {
    it('dos transacciones por el último lugar: solo una entra', async () => {
      const { salidaId } = await env.escenario({ cupo: 1 });
      const a = await env.app.connect();
      const b = await env.app.connect();
      try {
        await a.query('begin');
        await b.query('begin');
        await env.reservar(salidaId, 1, 'confirmada', {}, a); // A toma el lugar y mantiene el candado
        let terminada = false;
        const pb = capturar(env.reservar(salidaId, 1, 'confirmada', {}, b)).then((e) => {
          terminada = true;
          return e;
        });
        await pausa(400);
        expect(terminada).toBe(false); // B espera a A
        await a.query('commit');
        expectCupo(await pb, 0);
      } finally {
        await a.query('rollback').catch(() => undefined);
        await b.query('rollback').catch(() => undefined);
        a.release();
        b.release();
      }
      const n = await env.app.query(`select count(*)::int as n from ga.reservaciones where salida_id = $1`, [salidaId]);
      expect(n.rows[0].n).toBe(1);
    });

    it('si la primera se revierte, la segunda sí entra', async () => {
      const { salidaId } = await env.escenario({ cupo: 1 });
      const a = await env.app.connect();
      const b = await env.app.connect();
      try {
        await a.query('begin');
        await env.reservar(salidaId, 1, 'confirmada', {}, a);
        const pb = capturar(env.reservar(salidaId, 1, 'confirmada', {}, b));
        await pausa(300);
        await a.query('rollback');
        expect(await pb).toBeNull();
      } finally {
        a.release();
        b.release();
      }
    });

    it('10 inserciones paralelas de 1 persona en cupo 5: exactamente 5 entran', async () => {
      const { salidaId } = await env.escenario({ cupo: 5 });
      const res = await Promise.all(
        Array.from({ length: 10 }, () => capturar(env.reservar(salidaId, 1, 'confirmada'))),
      );
      expect(res.filter((e) => e === null)).toHaveLength(5);
      const fallos = res.filter((e) => e !== null);
      expect(fallos.every((e) => e?.code === 'GA001')).toBe(true);
      const r = await env.app.query(`select coalesce(sum(personas),0)::int as n from ga.reservaciones where salida_id = $1`, [salidaId]);
      expect(r.rows[0].n).toBe(5);
    });
  });

  describe('7. bajar el cupo', () => {
    it('bajo lo ocupado falla con GA002; igual o mayor funciona', async () => {
      const { salidaId } = await env.escenario({ cupo: 10 });
      await env.reservar(salidaId, 4, 'confirmada');
      await env.reservar(salidaId, 2, 'pendiente');
      await env.reservar(salidaId, 9, 'cancelada'); // no cuenta
      const e = await capturar(env.app.query(`update ga.salidas set cupo = 5 where id = $1`, [salidaId]));
      expect(e?.code).toBe('GA002');
      expect(e?.message).toBe('GA_CUPO_MENOR_A_OCUPADO');
      expect(detalle(e)).toEqual({ ocupados: 6 });
      await env.app.query(`update ga.salidas set cupo = 6 where id = $1`, [salidaId]);
      await env.app.query(`update ga.salidas set cupo = 20 where id = $1`, [salidaId]);
    });
  });
});
