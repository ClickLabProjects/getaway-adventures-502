import { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { ZodError, type ZodType } from 'zod';
import { ErrorNegocio } from '../errores/error-negocio';

/** Uso: `@Body(new ZodPipe(esquema))`. Responde 400 GA_VALIDACION con los campos inválidos. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly esquema: ZodType<T>) {}

  transform(valor: unknown, _meta: ArgumentMetadata): T {
    const r = this.esquema.safeParse(valor);
    if (r.success) return r.data;
    throw new ErrorNegocio('GA_VALIDACION', 400, resumir(r.error));
  }
}

function resumir(error: ZodError): string {
  const campos = [...new Set(error.issues.map((i) => i.path.join('.') || '(raíz)'))];
  return `Datos inválidos en: ${campos.join(', ')}`;
}
