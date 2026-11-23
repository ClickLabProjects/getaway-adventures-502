import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class PromocionDto {
  @ApiProperty() id!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty({ nullable: true, type: String }) titulo_en!: string | null;
  @ApiProperty() descripcion!: string;
  @ApiProperty({ nullable: true, type: String }) descripcion_en!: string | null;
  @ApiProperty({ nullable: true, type: String }) imagen_url!: string | null;
  @ApiProperty({ nullable: true, type: String }) codigo!: string | null;
  @ApiProperty() descuento_pct!: number;
  @ApiProperty() aplica_todos!: boolean;
  @ApiProperty({
    nullable: true,
    type: 'object',
    properties: { slug: { type: 'string' }, nombre: { type: 'string' } },
    description: 'Tour al que aplica (null si aplica_todos)',
  })
  tour!: { slug: string; nombre: string } | null;
}

/** Mayúsculas y sin espacios (los códigos nunca los llevan). */
export const validarPromoEsquema = z.object({
  codigo: z
    .string()
    .max(60)
    .transform((s) => s.replace(/\s+/g, '').toUpperCase())
    .pipe(z.string().min(1)),
  tour_slug: z.string().trim().min(1).max(120),
});
export type ValidarPromoEntrada = z.infer<typeof validarPromoEsquema>;

export class ValidarPromoEntradaDto {
  @ApiProperty({ example: 'verano10' }) codigo!: string;
  @ApiProperty({ example: 'antigua-guatemala' }) tour_slug!: string;
}

export class PromoValidaDto {
  @ApiProperty({ example: true }) valida!: true;
  @ApiProperty() descuento_pct!: number;
  @ApiProperty() titulo!: string;
  @ApiProperty({ nullable: true, type: String }) titulo_en!: string | null;
}
