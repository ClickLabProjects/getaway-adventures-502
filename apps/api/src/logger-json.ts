import type { LoggerService } from '@nestjs/common';

/** Logger de Nest que escribe una línea JSON por evento (mismo estilo que pino). */
export class LoggerJson implements LoggerService {
  private escribir(level: string, message: unknown, contexto?: unknown) {
    const linea = { level, time: Date.now(), context: typeof contexto === 'string' ? contexto : undefined, msg: String(message) };
    process.stdout.write(JSON.stringify(linea) + '\n');
  }
  log(m: unknown, c?: unknown) { this.escribir('info', m, c); }
  error(m: unknown, ...r: unknown[]) { this.escribir('error', m, r.at(-1)); }
  warn(m: unknown, c?: unknown) { this.escribir('warn', m, c); }
  debug(m: unknown, c?: unknown) { this.escribir('debug', m, c); }
  verbose(m: unknown, c?: unknown) { this.escribir('trace', m, c); }
}
