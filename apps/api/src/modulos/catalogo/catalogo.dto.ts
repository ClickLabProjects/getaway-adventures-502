import { ApiProperty } from '@nestjs/swagger';

export class TourDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty({ nullable: true, type: String }) nombre_en!: string | null;
  @ApiProperty() destino!: string;
  @ApiProperty({ nullable: true, type: String }) destino_en!: string | null;
  @ApiProperty() descripcion!: string;
  @ApiProperty({ nullable: true, type: String }) descripcion_en!: string | null;
  @ApiProperty() duracion!: string;
  @ApiProperty({ nullable: true, type: String }) duracion_en!: string | null;
  @ApiProperty({ type: [String] }) incluye!: string[];
  @ApiProperty({ type: [String] }) incluye_en!: string[];
  @ApiProperty() punto_salida!: string;
  @ApiProperty({ nullable: true, type: String }) punto_salida_en!: string | null;
  @ApiProperty({ nullable: true, type: String }) horario!: string | null;
  @ApiProperty({ nullable: true, type: String }) horario_en!: string | null;
  @ApiProperty({ nullable: true, type: String }) imagen_url!: string | null;
  @ApiProperty({ type: [String] }) galeria!: string[];
  @ApiProperty() precio_q!: number;
  @ApiProperty({ nullable: true, type: Number }) lat!: number | null;
  @ApiProperty({ nullable: true, type: Number }) lng!: number | null;
  @ApiProperty({ nullable: true, type: String, example: '08:00', description: 'HH:MM, hora de Guatemala' })
  hora_salida!: string | null;
}

export class SalidaDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: '2030-06-15', description: 'Fecha de negocio (Guatemala)' }) fecha!: string;
  @ApiProperty() cupo!: number;
  @ApiProperty() disponibles!: number;
  @ApiProperty({ description: 'Precio especial de la salida o el del tour' }) precio_q!: number;
}
