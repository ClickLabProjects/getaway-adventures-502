import type { Rol } from '../src/plataforma/auth/decoradores';

/**
 * Matriz de autorización: toda ruta que NO sea @Publico() debe estar aquí con los roles
 * que pueden usarla. La prueba `matriz-autorizacion.test.ts` falla si falta alguna
 * (o si lo declarado aquí no coincide con @Roles).
 * Clave: "MÉTODO /ruta completa".
 */
export const MATRIZ_AUTORIZACION: Record<string, Rol[]> = {
  'GET /api/v1/yo': ['dueno', 'admin', 'personal', 'guia'],
};
