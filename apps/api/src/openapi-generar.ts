import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Generar el contrato no necesita base ni Cognito reales: se usan los valores de prueba.
process.env['NODE_ENV'] = 'test';

async function generar() {
  const { AppModule } = await import('./app.module');
  const { PREFIJO_GLOBAL, crearDocumentoOpenapi } = await import('./openapi');
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false });
  app.setGlobalPrefix(PREFIJO_GLOBAL);
  await app.init();
  const documento = crearDocumentoOpenapi(app);
  const destino = resolve(__dirname, '../../../packages/contratos/openapi.json');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(documento, null, 2) + '\n');
  await app.close();
  process.stdout.write(`OpenAPI escrito en ${destino}\n`);
}

generar().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : 'fallo'}\n`);
  process.exit(1);
});
