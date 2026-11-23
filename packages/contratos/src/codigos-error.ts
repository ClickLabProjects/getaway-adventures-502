// Códigos estables de error de la API (problem+json, campo `code`).
// Mantener igual que apps/api/src/plataforma/errores/codigos.ts (una prueba lo comprueba).
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
