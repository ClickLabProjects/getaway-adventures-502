/** Cotizador puro: todo en centavos enteros para no arrastrar errores de punto flotante. */

export interface EntradaCotizacion {
  /** Precio por persona del tour (numeric de Postgres, p. ej. "650.00"). */
  precioTour: string | number;
  /** Precio especial de la salida; null si no tiene. */
  precioSalida: string | number | null;
  personas: number;
  /** Porcentaje de descuento (p. ej. "10.00"); null o 0 si no hay promo. */
  descuentoPct: string | number | null;
}

export interface Cotizacion {
  precioUnitarioQ: number;
  subtotalQ: number;
  descuentoQ: number;
  totalQ: number;
}

const aCentavos = (v: string | number): number => Math.round(Number(v) * 100);

/**
 * Misma regla que la RPC anterior: subtotal = precio * personas;
 * descuento = round(subtotal * pct / 100, 2) (mitad hacia arriba, como `numeric` de Postgres); total = subtotal - descuento.
 */
export function cotizar(e: EntradaCotizacion): Cotizacion {
  if (!Number.isInteger(e.personas) || e.personas < 1) throw new RangeError('personas inválido');
  const unitario = aCentavos(e.precioSalida ?? e.precioTour);
  if (!Number.isFinite(unitario) || unitario < 0) throw new RangeError('precio inválido');
  const pct100 = e.descuentoPct === null ? 0 : Math.round(Number(e.descuentoPct) * 100); // centésimas de %
  if (!Number.isFinite(pct100) || pct100 < 0 || pct100 > 10_000) throw new RangeError('descuento inválido');

  const subtotal = unitario * e.personas;
  // round(subtotal * pct100 / 10000) con mitades hacia arriba, en enteros.
  const descuento = Math.min(subtotal, Math.floor((subtotal * pct100 * 2 + 10_000) / 20_000));
  const total = Math.max(subtotal - descuento, 0);
  return {
    precioUnitarioQ: unitario / 100,
    subtotalQ: subtotal / 100,
    descuentoQ: descuento / 100,
    totalQ: total / 100,
  };
}
