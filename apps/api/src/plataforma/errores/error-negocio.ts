import type { CodigoError } from './codigos';

/** Error esperado con código estable; el filtro global lo convierte en problem+json. */
export class ErrorNegocio extends Error {
  constructor(
    readonly code: CodigoError,
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail);
    this.name = 'ErrorNegocio';
  }
}
