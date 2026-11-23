import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { STATUS_CODES } from 'node:http';
import { ZodError } from 'zod';
import type { CodigoError } from './codigos';
import { ErrorNegocio } from './error-negocio';

export interface Problema {
  type: string;
  title: string;
  status: number;
  code: CodigoError;
  detail: string;
}

function codigoPorStatus(status: number): CodigoError {
  switch (status) {
    case 401:
      return 'GA_NO_AUTENTICADO';
    case 403:
      return 'GA_SIN_PERMISO';
    case 404:
      return 'GA_NO_ENCONTRADO';
    case 503:
      return 'GA_SERVICIO_NO_DISPONIBLE';
    default:
      return status >= 500 ? 'GA_ERROR_INTERNO' : 'GA_PETICION_INVALIDA';
  }
}

export function construirProblema(status: number, code: CodigoError, detail: string): Problema {
  return {
    type: `urn:ga:problema:${code}`,
    title: STATUS_CODES[status] ?? 'Error',
    status,
    code,
    detail,
  };
}

@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    let problema: Problema;

    if (excepcion instanceof ErrorNegocio) {
      problema = construirProblema(excepcion.status, excepcion.code, excepcion.detail);
    } else if (excepcion instanceof ZodError) {
      problema = construirProblema(400, 'GA_VALIDACION', 'Los datos enviados no son válidos.');
    } else if (excepcion instanceof HttpException) {
      const status = excepcion.getStatus();
      // Para 5xx no se expone el mensaje original.
      const detail = status >= 500 ? 'Error interno del servidor.' : excepcion.message;
      problema = construirProblema(status, codigoPorStatus(status), detail);
    } else {
      // Solo el nombre del error en el log: el mensaje podría traer datos personales.
      this.logger.error(`Error no controlado: ${excepcion instanceof Error ? excepcion.name : typeof excepcion}`);
      problema = construirProblema(500, 'GA_ERROR_INTERNO', 'Error interno del servidor.');
    }

    void reply.status(problema.status).header('content-type', 'application/problem+json; charset=utf-8').send(problema);
  }
}
