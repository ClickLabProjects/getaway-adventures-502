// Mantener igual que packages/contratos/src/codigos-error.ts (hay una prueba que lo comprueba).
export const CODIGOS_ERROR = [
  'GA_ERROR_INTERNO',
  'GA_NO_AUTENTICADO',
  'GA_SIN_PERMISO',
  'GA_NO_ENCONTRADO',
  'GA_PETICION_INVALIDA',
  'GA_VALIDACION',
  'GA_SERVICIO_NO_DISPONIBLE',
  'GA_CUPO_INSUFICIENTE',
  'GA_CUPO_MENOR_A_OCUPADO',
  'GA_SALIDA_CERRADA',
  'GA_FUERA_DE_PLAZO',
  'GA_TOUR_NO_ENCONTRADO',
  'GA_PROMO_INVALIDA',
] as const;

export type CodigoError = (typeof CODIGOS_ERROR)[number];
