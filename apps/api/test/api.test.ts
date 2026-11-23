import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from './ayudas';

let app: NestFastifyApplication;
beforeAll(async () => {
  app = await crearApp({ roles: { 'usuario-con-rol': 'admin' } });
});
afterAll(() => app.close());

const get = (url: string, token?: string) =>
  app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('salud', () => {
  it('responde 200 sin token', async () => {
    const r = await get('/api/v1/salud');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ estado: 'ok' });
  });
});

describe('GET /api/v1/yo (ruta protegida)', () => {
  it('401 sin token', async () => {
    const r = await get('/api/v1/yo');
    expect(r.statusCode).toBe(401);
    expect(r.json().code).toBe('GA_NO_AUTENTICADO');
  });
  it('401 con token inválido', async () => {
    expect((await get('/api/v1/yo', 'basura')).statusCode).toBe(401);
  });
  it('403 con token válido sin rol', async () => {
    const r = await get('/api/v1/yo', 'valido:usuario-sin-rol');
    expect(r.statusCode).toBe(403);
    expect(r.json().code).toBe('GA_SIN_PERMISO');
  });
  it('200 con rol', async () => {
    const r = await get('/api/v1/yo', 'valido:usuario-con-rol');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ sub: 'usuario-con-rol', rol: 'admin' });
  });
});

describe('filtro de errores', () => {
  it('devuelve problem+json con los campos requeridos', async () => {
    const r = await get('/api/v1/yo');
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.json()).toEqual({
      type: 'urn:ga:problema:GA_NO_AUTENTICADO',
      title: 'Unauthorized',
      status: 401,
      code: 'GA_NO_AUTENTICADO',
      detail: expect.any(String),
    });
  });
  it('ruta inexistente: 404 problem+json', async () => {
    const r = await get('/api/v1/no-existe');
    expect(r.statusCode).toBe(404);
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.json().code).toBe('GA_NO_ENCONTRADO');
  });
});

describe('openapi', () => {
  it('no se sirve documento en pruebas (solo main.ts lo registra)', async () => {
    expect((await get('/api/v1/openapi.json')).statusCode).toBe(404);
  });
});
