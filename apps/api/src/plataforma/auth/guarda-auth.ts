import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { ErrorNegocio } from '../errores/error-negocio';
import { META_PUBLICO, META_ROLES, type Rol, type UsuarioAutenticado } from './decoradores';
import { USUARIOS_PANEL, type UsuariosPanelService } from './usuarios-panel.service';
import { VERIFICADOR_TOKEN, type VerificadorToken } from './verificador-token';

export type PeticionAutenticada = FastifyRequest & { usuario?: UsuarioAutenticado };

/** Guarda global: niega por omisión. */
@Injectable()
export class GuardaAuth implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(VERIFICADOR_TOKEN) private readonly verificador: VerificadorToken,
    @Inject(USUARIOS_PANEL) private readonly usuarios: UsuariosPanelService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(META_PUBLICO, objetivos)) return true;

    const req = ctx.switchToHttp().getRequest<PeticionAutenticada>();
    const token = extraerBearer(req.headers.authorization);
    if (!token) throw noAutenticado();

    let sub: string;
    try {
      ({ sub } = await this.verificador.verificar(token));
    } catch {
      throw noAutenticado();
    }

    const permitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(META_ROLES, objetivos);
    const rol = await this.usuarios.rolDe(sub);
    // Sin rol, o ruta sin @Roles declarado: se niega.
    if (!rol || !permitidos || !permitidos.includes(rol)) {
      throw new ErrorNegocio('GA_SIN_PERMISO', 403, 'No tienes permiso para esta acción.');
    }

    req.usuario = { sub, rol };
    return true;
  }
}

function noAutenticado(): ErrorNegocio {
  return new ErrorNegocio('GA_NO_AUTENTICADO', 401, 'Se requiere un token de acceso válido.');
}

function extraerBearer(cabecera: string | undefined): string | null {
  if (!cabecera) return null;
  const [esquema, token, ...resto] = cabecera.split(' ');
  if (esquema?.toLowerCase() !== 'bearer' || !token || resto.length) return null;
  return token;
}
