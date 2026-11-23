// Mantener igual que packages/contratos/src/codigos-error.ts (hay una prueba que lo comprueba).
export const CODIGOS_ERROR = [
  'GA_ERROR_INTERNO',
  'GA_NO_AUTENTICADO',
  'GA_SIN_PERMISO',
  'GA_NO_ENCONTRADO',
  'GA_PETICION_INVALIDA',
  'GA_VALIDACION',
  'GA_SERVICIO_NO_DISPONIBLE',
] as const;

export type CodigoError = (typeof CODIGOS_ERROR)[number];
