import { Injectable } from '@nestjs/common';
import type { Rol } from './decoradores';

export const USUARIOS_PANEL = Symbol('USUARIOS_PANEL');

export interface UsuariosPanelService {
  /** Rol del usuario (sub de Cognito) o null si no es del panel. */
  rolDe(sub: string): Promise<Rol | null>;
}

/** Implementación temporal vacía; la tabla real llega después. */
@Injectable()
export class UsuariosPanelEnMemoria implements UsuariosPanelService {
  private readonly roles = new Map<string, Rol>();

  asignar(sub: string, rol: Rol): void {
    this.roles.set(sub, rol);
  }

  async rolDe(sub: string): Promise<Rol | null> {
    return this.roles.get(sub) ?? null;
  }
}
