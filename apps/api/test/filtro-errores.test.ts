import { Controller, Get, Logger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { ErrorNegocio } from '../src/plataforma/errores/error-negocio';
import { FiltroErrores } from '../src/plataforma/errores/filtro-errores';

Logger.overrideLogger(false);

@Controller('x')
class PruebaController {
  @Get('negocio') negocio() { throw new ErrorNegocio('GA_VALIDACION', 400, 'Dato malo'); }
  @Get('boom') boom() { throw new Error('contraseña=secreta host=10.0.0.5'); }
}
@Module({ controllers: [PruebaController], providers: [{ provide: APP_FILTER, useClass: FiltroErrores }] })
class PruebaModule {}

async function app() {
  const m = await Test.createTestingModule({ imports: [PruebaModule] }).compile();
  const a = m.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await a.init();
  await a.getHttpAdapter().getInstance().ready();
  return a;
}

describe('FiltroErrores', () => {
  it('ErrorNegocio -> su status, code y detail', async () => {
    const a = await app();
    const r = await a.inject({ method: 'GET', url: '/x/negocio' });
    expect(r.statusCode).toBe(400);
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.json()).toMatchObject({ status: 400, code: 'GA_VALIDACION', detail: 'Dato malo' });
    await a.close();
  });
  it('error no controlado -> 500 GA_ERROR_INTERNO sin filtrar detalles', async () => {
    const a = await app();
    const r = await a.inject({ method: 'GET', url: '/x/boom' });
    expect(r.statusCode).toBe(500);
    expect(r.json().code).toBe('GA_ERROR_INTERNO');
    expect(r.body).not.toContain('secreta');
    expect(r.body).not.toContain('10.0.0.5');
    await a.close();
  });
});
