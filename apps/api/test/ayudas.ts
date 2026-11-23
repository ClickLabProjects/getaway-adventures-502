import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { PREFIJO_GLOBAL } from '../src/openapi';
import type { Rol } from '../src/plataforma/auth/decoradores';
import { USUARIOS_PANEL, type UsuariosPanelService } from '../src/plataforma/auth/usuarios-panel.service';
import { VERIFICADOR_TOKEN, type VerificadorToken } from '../src/plataforma/auth/verificador-token';
import { DbService } from '../src/plataforma/db/db.service';

/** Verificador falso: acepta "valido:<sub>"; todo lo demás es inválido. */
export const verificadorFalso: VerificadorToken = {
  async verificar(token) {
    if (token.startsWith('valido:')) return { sub: token.slice('valido:'.length) };
    throw new Error('token inválido');
  },
};

export function usuariosFalsos(roles: Record<string, Rol>): UsuariosPanelService {
  return { rolDe: async (sub) => roles[sub] ?? null };
}

Logger.overrideLogger(false); // sin ruido en las pruebas

export async function crearApp(opciones: { roles?: Record<string, Rol>; dbOk?: boolean } = {}) {
  const dbOk = opciones.dbOk ?? true;
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(VERIFICADOR_TOKEN).useValue(verificadorFalso)
    .overrideProvider(USUARIOS_PANEL).useValue(usuariosFalsos(opciones.roles ?? {}))
    .overrideProvider(DbService).useValue({
      comprobarConexion: async () => {
        if (!dbOk) throw new Error('base caída (detalle interno secreto)');
      },
    })
    .compile();
  const app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix(PREFIJO_GLOBAL);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
