import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const PREFIJO_GLOBAL = 'api/v1';

export function crearDocumentoOpenapi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Getaway Adventures 502 API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** Sirve el JSON en /api/v1/openapi.json, sin UI. */
export function servirOpenapi(app: INestApplication) {
  const documento = crearDocumentoOpenapi(app);
  SwaggerModule.setup('openapi', app, documento, {
    ui: false,
    useGlobalPrefix: true,
    jsonDocumentUrl: 'openapi.json',
    yamlDocumentUrl: 'openapi.yaml',
  });
  return documento;
}
