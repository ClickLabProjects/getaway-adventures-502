import { Logger } from '@nestjs/common';
import { CONFIG, type Config } from '../../plataforma/config/config';

export const VERIFICADOR_CAPTCHA = Symbol('VERIFICADOR_CAPTCHA');

/** Acción que el sitio declara al renderizar el widget de Turnstile. */
export const ACCION_TURNSTILE = 'reservar';

export class CaptchaNoDisponible extends Error {}

export interface VerificadorCaptcha {
  /** true si el token es válido. Lanza CaptchaNoDisponible si no se pudo consultar al proveedor. */
  verificar(token: string, ip: string | undefined, idempotencyKey: string): Promise<boolean>;
}

/** Respuesta de siteverify (solo los campos que usamos). */
interface RespuestaSiteverify {
  success?: boolean;
  hostname?: string;
  action?: string;
}

/** Evalúa la respuesta de siteverify: éxito, hostname permitido (si hay lista) y acción esperada. */
export function respuestaValida(r: RespuestaSiteverify, hostnames: string[]): boolean {
  if (r.success !== true) return false;
  if (r.action !== ACCION_TURNSTILE) return false;
  if (hostnames.length > 0 && !hostnames.includes((r.hostname ?? '').toLowerCase())) return false;
  return true;
}

/** Cloudflare Turnstile (siteverify). El secreto viene de TURNSTILE_SECRET. */
export class VerificadorTurnstile implements VerificadorCaptcha {
  constructor(
    private readonly secreto: string,
    private readonly hostnames: string[],
  ) {}

  async verificar(token: string, ip: string | undefined, idempotencyKey: string): Promise<boolean> {
    const cuerpo = new URLSearchParams({ secret: this.secreto, response: token, idempotency_key: idempotencyKey });
    if (ip) cuerpo.set('remoteip', ip);
    try {
      const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: cuerpo,
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) throw new CaptchaNoDisponible();
      return respuestaValida((await r.json()) as RespuestaSiteverify, this.hostnames);
    } catch {
      throw new CaptchaNoDisponible(); // falla cerrado; sin detalles
    }
  }
}

/** Solo para pruebas y desarrollo sin secreto: acepta todo token salvo "invalido". */
export class VerificadorCaptchaFalso implements VerificadorCaptcha {
  async verificar(token: string): Promise<boolean> {
    return token !== 'invalido';
  }
}

export function crearVerificadorCaptcha(config: Config): VerificadorCaptcha {
  if (config.entorno === 'test' || !config.turnstileSecret) {
    if (config.entorno !== 'test') {
      new Logger('Captcha').warn('TURNSTILE_SECRET no definido: se usa el verificador FALSO de captcha (solo desarrollo).');
    }
    return new VerificadorCaptchaFalso();
  }
  return new VerificadorTurnstile(config.turnstileSecret, config.turnstileHostnames);
}

export const proveedorCaptcha = {
  provide: VERIFICADOR_CAPTCHA,
  inject: [CONFIG],
  useFactory: crearVerificadorCaptcha,
};
