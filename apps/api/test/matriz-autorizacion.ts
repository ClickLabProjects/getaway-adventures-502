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

/** Rutas públicas conocidas (sin token). `rutas-publicas.test.ts` comprueba que sean @Publico() y que no haya otras. */
export const RUTAS_PUBLICAS: string[] = [
  'GET /api/v1/tours',
  'GET /api/v1/tours/:slug',
  'GET /api/v1/tours/:slug/salidas',
  'GET /api/v1/promociones',
  'POST /api/v1/promociones/validar',
  'POST /api/v1/reservaciones',
];
