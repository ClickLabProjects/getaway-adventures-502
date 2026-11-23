import type { ColumnType, Generated } from 'kysely';

// Tipos de las tablas del esquema `ga` (a mano; mantener alineado con db/migrations).
// numeric llega como string desde pg: se lee string y se escribe string | number.
type Numerico = ColumnType<string, string | number, string | number>;
type NumericoNulo = ColumnType<string | null, string | number | null, string | number | null>;
type Marca = ColumnType<Date, Date | string | undefined, Date | string>;

export interface TourTabla {
  id: Generated<string>;
  slug: string;
  nombre: string;
  destino: string;
  descripcion: Generated<string>;
  imagen_url: string | null;
  precio_q: Numerico;
  duracion: Generated<string>;
  incluye: Generated<string[]>;
  punto_salida: Generated<string>;
  activo: Generated<boolean>;
  orden: Generated<number>;
  created_at: Marca;
  horario: string | null;
  galeria: Generated<string[]>;
  lat: NumericoNulo;
  lng: NumericoNulo;
  nombre_en: string | null;
  destino_en: string | null;
  descripcion_en: string | null;
  duracion_en: string | null;
  punto_salida_en: string | null;
  horario_en: string | null;
  incluye_en: Generated<string[]>;
  hora_salida: string | null;
  horas_corte: number | null;
}

export interface SalidaTabla {
  id: Generated<string>;
  tour_id: string;
  fecha: ColumnType<string, string | Date, string | Date>;
  cupo: number;
  precio_q: NumericoNulo;
  activo: Generated<boolean>;
  created_at: Marca;
}

export interface PromocionTabla {
  id: Generated<string>;
  titulo: string;
  descripcion: Generated<string>;
  imagen_url: string | null;
  codigo: string | null;
  descuento_pct: ColumnType<string, string | number | undefined, string | number>;
  tour_id: string | null;
  desde: ColumnType<string | null, string | Date | null, string | Date | null>;
  hasta: ColumnType<string | null, string | Date | null, string | Date | null>;
  activo: Generated<boolean>;
  created_at: Marca;
  titulo_en: string | null;
  descripcion_en: string | null;
  aplica_todos: Generated<boolean>;
}

export type EstadoReservacion = 'pendiente' | 'confirmada' | 'pagada' | 'cancelada' | 'vencida';

export interface ReservacionTabla {
  id: Generated<string>;
  codigo: string;
  salida_id: string;
  nombre: string;
  email: string;
  telefono: string;
  personas: number;
  notas: string | null;
  total_q: Numerico;
  estado: Generated<EstadoReservacion>;
  created_at: Marca;
  subtotal_q: NumericoNulo;
  descuento_q: ColumnType<string, string | number | undefined, string | number>;
  promo_id: string | null;
  acepta_promos: Generated<boolean>;
  expira_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
  client_ref: string | null;
}

export type RolPanel = 'dueno' | 'admin' | 'personal' | 'guia';

export interface UsuarioPanelTabla {
  cognito_sub: string;
  email: string;
  rol: RolPanel;
  activo: Generated<boolean>;
  creado_en: Marca;
}

export interface ConfiguracionTabla {
  clave: string;
  valor: ColumnType<unknown, string, string>; // jsonb (se escribe como JSON en texto)
  pendiente_confirmar: Generated<boolean>;
  descripcion: string;
  actualizado_en: Marca;
}

export interface ConsentimientoTabla {
  id: Generated<string>;
  email: string;
  acepta: boolean;
  origen: 'reserva' | 'baja' | 'panel';
  creado_en: Marca;
  version_aviso: string | null;
  reservacion_id: string | null;
}

export interface ConfiguracionHistorialTabla {
  id: Generated<string>;
  clave: string;
  valor_anterior: unknown;
  valor_nuevo: unknown;
  cambiado_en: Marca;
  cambiado_por: string | null;
}

/** Vista de solo lectura. */
export interface ClienteVista {
  email: string;
  nombre: string;
  telefono: string;
  reservas: number;
  reservas_activas: number;
  viajeros: number;
  total_q: string;
  pagado_q: string;
  acepta_promos: boolean;
  primera_reserva: Date;
  ultima_reserva: Date;
  ultimo_viaje: string;
  tours: string[];
}

export interface BaseDatos {
  tours: TourTabla;
  salidas: SalidaTabla;
  promociones: PromocionTabla;
  reservaciones: ReservacionTabla;
  usuarios_panel: UsuarioPanelTabla;
  configuracion: ConfiguracionTabla;
  configuracion_historial: ConfiguracionHistorialTabla;
  consentimientos: ConsentimientoTabla;
  clientes: ClienteVista;
}
