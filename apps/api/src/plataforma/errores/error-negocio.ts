import type { CodigoError } from './codigos';

/** Error esperado con código estable; el filtro global lo convierte en problem+json. */
export class ErrorNegocio extends Error {
  constructor(
    readonly code: CodigoError,
    readonly status: number,
    readonly detail: string,
    /** Campos extra seguros para el cliente (p. ej. `disponibles`), añadidos al problem+json. */
    readonly extensiones?: Record<string, unknown>,
  ) {
    super(detail);
    this.name = 'ErrorNegocio';
  }
}
