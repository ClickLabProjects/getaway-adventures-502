import { Injectable } from '@nestjs/common';

export const ZONA_GUATEMALA = 'America/Guatemala';

@Injectable()
export class RelojService {
  ahora(): Date {
    return new Date();
  }

  /** Fecha de negocio de hoy en Guatemala, formato AAAA-MM-DD. */
  hoyGuatemala(): string {
    return this.fechaGuatemala(this.ahora());
  }

  fechaGuatemala(fecha: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_GUATEMALA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(fecha);
  }
}
