import { describe, expect, it } from 'vitest';
import { cotizar } from '../src/modulos/reservas/cotizador';

const base = { precioTour: '100.00', precioSalida: null, personas: 2, descuentoPct: null };

describe('cotizador', () => {
  it('sin promo: subtotal = precio × personas, total = subtotal', () => {
    expect(cotizar(base)).toEqual({ precioUnitarioQ: 100, subtotalQ: 200, descuentoQ: 0, totalQ: 200 });
  });
  it('usa el precio especial de la salida si existe (incluso 0)', () => {
    expect(cotizar({ ...base, precioSalida: '150.50' }).subtotalQ).toBe(301);
    expect(cotizar({ ...base, precioSalida: '0.00' }).totalQ).toBe(0);
  });
  it('descuento redondeado a centavos, mitades hacia arriba (como round de Postgres)', () => {
    // 33.33 × 1 × 15% = 4.9995 → 5.00
    expect(cotizar({ ...base, precioTour: '33.33', personas: 1, descuentoPct: '15' }).descuentoQ).toBe(5);
    // 0.05 × 10% = 0.005 → 0.01
    expect(cotizar({ ...base, precioTour: '0.05', personas: 1, descuentoPct: '10' }).descuentoQ).toBe(0.01);
    // 0.04 × 10% = 0.004 → 0.00
    expect(cotizar({ ...base, precioTour: '0.04', personas: 1, descuentoPct: '10' }).descuentoQ).toBe(0);
    // porcentaje con decimales: 650 × 3 × 12.5% = 243.75
    expect(cotizar({ ...base, precioTour: '650', personas: 3, descuentoPct: '12.50' })).toMatchObject({
      subtotalQ: 1950, descuentoQ: 243.75, totalQ: 1706.25,
    });
  });
  it('100% deja total 0 y nunca es negativo', () => {
    const c = cotizar({ ...base, descuentoPct: 100 });
    expect(c.descuentoQ).toBe(200);
    expect(c.totalQ).toBe(0);
  });
  it('rechaza entradas imposibles', () => {
    expect(() => cotizar({ ...base, personas: 0 })).toThrow();
    expect(() => cotizar({ ...base, personas: 1.5 })).toThrow();
    expect(() => cotizar({ ...base, descuentoPct: 101 })).toThrow();
    expect(() => cotizar({ ...base, descuentoPct: -1 })).toThrow();
    expect(() => cotizar({ ...base, precioTour: '-5' })).toThrow();
  });
});
