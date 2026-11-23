import { describe, expect, it } from 'vitest';
import { capturar, Entorno, prepararSuite } from '../ayudas-db';

describe('BD: cierre_reserva, hora de Guatemala e idempotencia', () => {
  const env = new Entorno();
  prepararSuite(env);

  const cierre = async (salidaId: string) =>
    (await env.app.query(`select ga.cierre_reserva($1) as c`, [salidaId])).rows[0].c as Date | null;

  describe('8. cierre_reserva', () => {
    it('con hora_salida y horas_corte propias (Guatemala es UTC-6 todo el año)', async () => {
      const { salidaId } = await env.escenario({ fecha: '2030-06-15', horaSalida: '08:00', horasCorte: 6 });
      // 15-jun 08:00 GT = 14:00Z; menos 6 h = 08:00Z
      expect((await cierre(salidaId))?.toISOString()).toBe('2030-06-15T08:00:00.000Z');
    });

    it('con hora_salida y corte por defecto', async () => {
      const { salidaId } = await env.escenario({ fecha: '2030-12-15', horaSalida: '08:00' });
      const h = (await env.app.query(`select ga.config_int('horas_corte_defecto') as h`)).rows[0].h as number;
      const esperado = Date.parse('2030-12-15T14:00:00Z') - h * 3600_000;
      expect((await cierre(salidaId))?.getTime()).toBe(esperado);
    });

    it('sin hora_salida usa medianoche de Guatemala', async () => {
      const { salidaId } = await env.escenario({ fecha: '2030-06-15', horasCorte: 0 });
      expect((await cierre(salidaId))?.toISOString()).toBe('2030-06-15T06:00:00.000Z');
      const { salidaId: s2 } = await env.escenario({ fecha: '2030-06-15', horasCorte: 24 });
      expect((await cierre(s2))?.toISOString()).toBe('2030-06-14T06:00:00.000Z');
    });

    it('horas_corte = 0 se respeta (no cae al valor por defecto)', async () => {
      const { salidaId } = await env.escenario({ fecha: '2030-06-15', horaSalida: '10:30', horasCorte: 0 });
      expect((await cierre(salidaId))?.toISOString()).toBe('2030-06-15T16:30:00.000Z');
    });

    it('salida inexistente devuelve null', async () => {
      expect(await cierre('00000000-0000-0000-0000-000000000000')).toBeNull();
    });

    it('horas_corte fuera de 0..168 se rechaza', async () => {
      const { tourId } = await env.escenario();
      for (const v of [-1, 169]) {
        const e = await capturar(env.app.query(`update ga.tours set horas_corte = $2 where id = $1`, [tourId, v]));
        expect(e?.code).toBe('23514');
      }
    });
  });

  describe('9. hoy_gt / ahora_gt', () => {
    it('coinciden con la conversión explícita, sin importar la zona de la sesión', async () => {
      for (const zona of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
        const c = await env.app.connect();
        try {
          await c.query('begin');
          await c.query(`set local time zone '${zona}'`);
          const r = await c.query(`
            select ga.hoy_gt()::text as hoy, (now() at time zone 'America/Guatemala')::date::text as hoy_ref,
                   ga.ahora_gt()::text as ahora, (now() at time zone 'America/Guatemala')::text as ahora_ref,
                   (now() at time zone 'UTC' - interval '6 hours')::text as utc6`);
          const x = r.rows[0];
          expect(x.hoy).toBe(x.hoy_ref);
          expect(x.ahora).toBe(x.ahora_ref);
          expect(x.ahora).toBe(x.utc6);
          await c.query('rollback');
        } finally {
          c.release();
        }
      }
    });

    it('cerca de la medianoche UTC sigue siendo el día anterior en Guatemala (lógica de la función)', async () => {
      // 2030-06-16 03:00Z = 2030-06-15 21:00 GT: la fecha de Guatemala es el 15, no el 16.
      const r = await env.app.query(`select ('2030-06-16T03:00:00Z'::timestamptz at time zone 'America/Guatemala')::date::text as d`);
      expect(r.rows[0].d).toBe('2030-06-15');
    });
  });

  describe('10. client_ref', () => {
    it('duplicado falla, vacío falla, null repetido se permite', async () => {
      const { salidaId } = await env.escenario({ cupo: 50 });
      const ref = `ref-${Date.now()}-${Math.random()}`;
      await env.reservar(salidaId, 1, 'confirmada', { client_ref: ref });
      const dup = await capturar(env.reservar(salidaId, 1, 'confirmada', { client_ref: ref }));
      expect(dup?.code).toBe('23505');
      const vacio = await capturar(env.reservar(salidaId, 1, 'confirmada', { client_ref: '' }));
      expect(vacio?.code).toBe('23514');
      const largo = await capturar(env.reservar(salidaId, 1, 'confirmada', { client_ref: 'x'.repeat(101) }));
      expect(largo?.code).toBe('23514');
      await env.reservar(salidaId, 1, 'confirmada', { client_ref: 'x'.repeat(100) });
      await env.reservar(salidaId, 1, 'confirmada', { client_ref: null });
      await env.reservar(salidaId, 1, 'confirmada', { client_ref: null });
    });
  });
});
