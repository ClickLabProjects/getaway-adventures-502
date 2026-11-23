import { SetMetadata } from '@nestjs/common';

export const ROLES_PANEL = ['dueno', 'admin', 'personal', 'guia'] as const;
export type Rol = (typeof ROLES_PANEL)[number];

export const META_PUBLICO = 'ga:publico';
export const META_ROLES = 'ga:roles';

/** Marca una ruta como pública (sin token). Por omisión toda ruta exige autenticación. */
export const Publico = () => SetMetadata(META_PUBLICO, true);

/** Roles que pueden usar la ruta. Una ruta autenticada sin @Roles se niega. */
export const Roles = (...roles: Rol[]) => SetMetadata(META_ROLES, roles);

export interface UsuarioAutenticado {
  sub: string;
  rol: Rol;
}
