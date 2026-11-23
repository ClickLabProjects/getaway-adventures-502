import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { LoggerJson } from './logger-json';
import { PREFIJO_GLOBAL, servirOpenapi } from './openapi';
import { CONFIG, type Config } from './plataforma/config/config';

async function arrancar() {
  const adapter = new FastifyAdapter({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
      // pino solo registra método, url y ids; el cuerpo nunca. Además se ocultan credenciales.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    trustProxy: true,
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, { bufferLogs: true });
  app.useLogger(new LoggerJson());
  app.setGlobalPrefix(PREFIJO_GLOBAL);
  app.enableShutdownHooks(); // SIGTERM/SIGINT: cierra servidor y pool de forma ordenada
  servirOpenapi(app);

  const config = app.get<Config>(CONFIG);
  await app.listen(config.puerto, '0.0.0.0');
}

arrancar().catch((e: unknown) => {
  process.stderr.write(JSON.stringify({ level: 'fatal', msg: e instanceof Error ? e.message : 'fallo al arrancar' }) + '\n');
  process.exit(1);
});
