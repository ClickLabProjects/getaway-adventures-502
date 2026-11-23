import { describe, expect, it } from 'vitest';
import { CODIGOS_ERROR as contratos } from '../../../packages/contratos/src/codigos-error';
import { CODIGOS_ERROR as api } from '../src/plataforma/errores/codigos';
import { cargarConfig } from '../src/plataforma/config/config';
import { RelojService } from '../src/plataforma/reloj/reloj.service';

describe('códigos de error', () => {
  it('API y @ga/contratos están sincronizados', () => {
    expect([...contratos]).toEqual([...api]);
  });
});

describe('config', () => {
  it('en producción falla sin variables obligatorias, sin mostrar valores', () => {
    expect(() => cargarConfig({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
  });
  it('en test usa valores de prueba', () => {
    expect(cargarConfig({ NODE_ENV: 'test' }).cognito.region).toBe('us-east-1');
  });
});

describe('reloj', () => {
  it('hoyGuatemala usa UTC-6 (a las 03:00Z todavía es el día anterior)', () => {
    const r = new RelojService();
    expect(r.fechaGuatemala(new Date('2026-03-10T03:00:00Z'))).toBe('2026-03-09');
    expect(r.fechaGuatemala(new Date('2026-03-10T06:00:00Z'))).toBe('2026-03-10');
  });
});
