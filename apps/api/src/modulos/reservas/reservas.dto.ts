import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

// Sin caracteres de control (\p{Cc}) ni de formato Unicode (\p{Cf}: invisibles, bidi, etc.). En notas se permite \n.
const sinControlNiFormato = (s: string) => !/[\p{Cc}\p{Cf}]/u.test(s);
const sinControlSalvoSalto = (s: string) => !/[\p{Cf}]|(?![\n])\p{Cc}/u.test(s);

const normalizarCodigo = (s: string) => s.replace(/\s+/g, '').toUpperCase();

/**
 * Cuerpo de POST /reservaciones. `.strict()`: si el cliente manda campos desconocidos (p. ej. precio_q, total_q,
 * descuento_q) se rechaza con 400 en vez de ignorarlos en silencio; el total siempre lo calcula el servidor.
 */
export const crearReservaEsquema = z
  .object({
    salida_id: z.uuid(),
    nombre: z.string().trim().min(2).max(120).refine(sinControlNiFormato, 'Caracteres no permitidos'),
    email: z.string().trim().max(254).pipe(z.email()).transform((s) => s.toLowerCase()),
    telefono: z.string().trim().min(8).max(20).regex(/^[0-9+().\-\s]+$/, 'Teléfono inválido'),
    personas: z.number().int().min(1).max(30),
    notas: z.string().max(1000).refine(sinControlSalvoSalto, 'Caracteres no permitidos').nullish().transform((s) => (s?.trim() ? s.trim() : null)),
    codigo_promo: z.string().max(60).nullish().transform((s) => (s && normalizarCodigo(s) ? normalizarCodigo(s) : null)),
    acepta_promos: z.boolean(),
    idioma: z.enum(['es', 'en']),
    turnstile_token: z.string().min(1).max(2048),
  })
  .strict();
export type CrearReservaEntrada = z.infer<typeof crearReservaEsquema>;

/** Solo UUID v4 (el cliente lo genera con crypto.randomUUID()). */
export const idempotencyKeyEsquema = z.uuid({ version: 'v4' }).transform((s) => s.toLowerCase());

export class CrearReservaEntradaDto {
  @ApiProperty({ format: 'uuid' }) salida_id!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty() email!: string;
  @ApiProperty() telefono!: string;
  @ApiProperty({ minimum: 1, maximum: 30 }) personas!: number;
  @ApiProperty({ required: false, nullable: true, type: String }) notas?: string | null;
  @ApiProperty({ required: false, nullable: true, type: String }) codigo_promo?: string | null;
  @ApiProperty() acepta_promos!: boolean;
  @ApiProperty({ enum: ['es', 'en'] }) idioma!: 'es' | 'en';
  @ApiProperty({ description: 'Token de Cloudflare Turnstile' }) turnstile_token!: string;
}

export class ReservaTourDto {
  @ApiProperty() slug!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty({ nullable: true, type: String }) nombre_en!: string | null;
}

export class ReservaDto {
  @ApiProperty({ example: 'GA-1A2B3C' }) codigo!: string;
  @ApiProperty({ example: 'pendiente' }) estado!: string;
  @ApiProperty({ example: '2030-06-15' }) fecha!: string;
  @ApiProperty({ type: ReservaTourDto }) tour!: ReservaTourDto;
  @ApiProperty() personas!: number;
  @ApiProperty() subtotal_q!: number;
  @ApiProperty() descuento_q!: number;
  @ApiProperty() total_q!: number;
  @ApiProperty({ nullable: true, type: String, description: 'ISO 8601 (UTC)' }) expira_at!: string | null;
}
