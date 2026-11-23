import { afterEach, describe, expect, it } from 'vitest';
import { capturar, Entorno, prepararSuite } from '../ayudas-db';

// Solo se tocan claves que ningún otro archivo de prueba lee (los archivos corren en paralelo).
const CLAVE = 'max_personas_reserva_web'; // 1..30, original 10
const CLAVE2 = 'max_pendientes_por_contacto'; // 1..20, original 2

describe('BD: configuracion e historial', () => {
  const env = new Entorno();
  prepararSuite(env);

  const valor = async (clave: string) =>
    (await env.app.query(`select valor from ga.configuracion where clave = $1`, [clave])).rows[0].valor;
  const historial = async (clave: string) =>
    (
      await env.app.query(
        `select valor_anterior, valor_nuevo, cambiado_por, cambiado_en from ga.configuracion_historial
         where clave = $1 order by cambiado_en, id`,
        [clave],
      )
    ).rows;
  const poner = (clave: string, v: string) =>
    env.app.query(`update ga.configuracion set valor = $2::jsonb where clave = $1`, [clave, v]);

  afterEach(async () => {
    await env.dev.query(`update ga.configuracion set valor = '10' where clave = $1`, [CLAVE]);
    await env.dev.query(`update ga.configuracion set valor = '2' where clave = $1`, [CLAVE2]);
    await env.dev.query(`delete from ga.configuracion_historial where clave in ($1, $2)`, [CLAVE, CLAVE2]);
  });

  it.each([
    [CLAVE, '0'],
    [CLAVE, '31'],
    [CLAVE, '-1'],
    [CLAVE2, '21'],
    ['horas_vencimiento_pendiente', '0'],
    ['horas_vencimiento_pendiente', '169'],
    ['horas_corte_defecto', '169'],
    [CLAVE, '1.5'],
    [CLAVE, '5.0'],
    [CLAVE, '"10"'],
    [CLAVE, 'true'],
    [CLAVE, 'null'],
    [CLAVE, '[]'],
    [CLAVE, '{"a":1}'],
    [CLAVE, '1000000'],
  ])('valor inválido %s = %s falla con CHECK y no cambia nada', async (clave, v) => {
    const antes = await valor(clave);
    const e = await capturar(poner(clave, v));
    expect(e?.code).toBe('23514');
    expect(await valor(clave)).toEqual(antes);
  });

  it('valor SQL null falla (not null)', async () => {
    const e = await capturar(env.app.query(`update ga.configuracion set valor = null where clave = $1`, [CLAVE]));
    expect(e?.code).toBe('23502');
  });

  it('los límites válidos se aceptan', async () => {
    await poner(CLAVE, '1');
    await poner(CLAVE, '30');
    await poner('horas_corte_defecto', '12'); // sin cambio de valor
    expect(await valor(CLAVE)).toBe(30);
  });

  it('claves no permitidas se rechazan (insert como dueño) y ga_app no cambia clave ni inserta', async () => {
    const e = await capturar(
      env.dev.query(`insert into ga.configuracion (clave, valor, descripcion) values ('clave_inventada', '1', 'x')`),
    );
    expect(e?.code).toBe('23514');
    const e2 = await capturar(env.app.query(`update ga.configuracion set clave = 'clave_inventada' where clave = $1`, [CLAVE2]));
    expect(e2?.code).toBe('42501');
    const e3 = await capturar(env.app.query(`update ga.configuracion set descripcion = 'x' where clave = $1`, [CLAVE2]));
    expect(e3?.code).toBe('42501');
  });

  it('cada UPDATE deja una fila de historial con anterior y nuevo, y actualiza actualizado_en', async () => {
    const antes = (await env.app.query(`select actualizado_en from ga.configuracion where clave = $1`, [CLAVE])).rows[0].actualizado_en as Date;
    await poner(CLAVE, '12');
    await poner(CLAVE, '15');
    const h = await historial(CLAVE);
    expect(h).toHaveLength(2);
    expect(h[0]).toMatchObject({ valor_anterior: 10, valor_nuevo: 12, cambiado_por: null });
    expect(h[1]).toMatchObject({ valor_anterior: 12, valor_nuevo: 15, cambiado_por: null });
    const despues = (await env.app.query(`select actualizado_en from ga.configuracion where clave = $1`, [CLAVE])).rows[0].actualizado_en as Date;
    expect(despues.getTime()).toBeGreaterThan(antes.getTime());
  });

  it('set local ga.actor queda en cambiado_por y no se filtra a la siguiente transacción', async () => {
    const c = await env.app.connect();
    try {
      await c.query('begin');
      await c.query(`select set_config('ga.actor', 'actor-falso-123', true)`);
      await c.query(`update ga.configuracion set valor = '7' where clave = $1`, [CLAVE]);
      await c.query('commit');
      await c.query(`update ga.configuracion set valor = '8' where clave = $1`, [CLAVE]); // sin actor
    } finally {
      c.release();
    }
    const h = await historial(CLAVE);
    expect(h.map((x) => x.cambiado_por)).toEqual(['actor-falso-123', null]);
    expect(h.map((x) => x.valor_nuevo)).toEqual([7, 8]);
  });

  it('un cambio rechazado no deja historial', async () => {
    await capturar(poner(CLAVE, '999'));
    expect(await historial(CLAVE)).toHaveLength(0);
  });
});
