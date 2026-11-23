import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIG, type Config } from '../../plataforma/config/config';
import { DbService, type Tx } from '../../plataforma/db/db.service';
import { ErrorNegocio } from '../../plataforma/errores/error-negocio';
import { PromocionesRepo } from '../promociones/promociones.repo';
import { CaptchaNoDisponible, VERIFICADOR_CAPTCHA, type VerificadorCaptcha } from './captcha';
import { normalizarEmail, normalizarTelefono } from './contacto';
import { cotizar } from './cotizador';
import type { CrearReservaEntrada, ReservaDto } from './reservas.dto';
import { aDto, ReservasRepo, type ReservaFila } from './reservas.repo';

const INTENTOS = 3;

interface ErrorPg {
  code?: string;
  constraint?: string;
  detail?: string;
}
const errPg = (e: unknown) => (e ?? {}) as ErrorPg;
const esReintentable = (e: unknown) => {
  const x = errPg(e);
  return x.code === '40P01' || x.code === '40001' || (x.code === '23505' && x.constraint === 'reservaciones_codigo_key');
};
/** Hash estable del cuerpo ya normalizado, sin el token del captcha. */
export function hashCuerpo(e: CrearReservaEntrada): string {
  const { turnstile_token: _omitido, ...resto } = e;
  const canonico = JSON.stringify(Object.entries(resto).sort(([a], [b]) => (a < b ? -1 : 1)));
  return createHash('sha256').update(canonico).digest('hex');
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ResultadoReserva {
  reserva: ReservaDto;
  /** true si se creó ahora (201); false si era una repetición idempotente (200). */
  creada: boolean;
}

@Injectable()
export class ReservasService {
  private readonly logger = new Logger('Reservas');

  constructor(
    @Inject(CONFIG) private readonly config: Config,
    private readonly db: DbService,
    private readonly repo: ReservasRepo,
    private readonly promos: PromocionesRepo,
    @Inject(VERIFICADOR_CAPTCHA) private readonly captcha: VerificadorCaptcha,
  ) {}

  async crear(e: CrearReservaEntrada, clientRef: string, ip: string | undefined): Promise<ResultadoReserva> {
    // 1. Repetición: misma reservación, sin volver a validar captcha ni crear otra.
    const previa = await this.repo.porClientRef(clientRef);
    if (previa) return this.repeticion(previa, e);

    // 2. Captcha.
    let ok: boolean;
    try {
      ok = await this.captcha.verificar(e.turnstile_token, ip, clientRef);
    } catch (err) {
      if (err instanceof CaptchaNoDisponible) {
        throw new ErrorNegocio('GA_SERVICIO_NO_DISPONIBLE', 503, 'No se pudo verificar el captcha. Intenta de nuevo.');
      }
      throw err;
    }
    if (!ok) {
      // Si otra petición con la misma clave ya creó la reservación, el token ya estaba gastado: se devuelve esa.
      const ganadora = await this.repo.porClientRef(clientRef);
      if (ganadora) return this.repeticion(ganadora, e);
      this.logger.warn(`GA_CAPTCHA salida_id=${e.salida_id}`);
      throw new ErrorNegocio('GA_CAPTCHA', 400, 'No se pudo verificar que eres una persona. Intenta de nuevo.');
    }

    // 3. Transacción con reintentos ante deadlock / serialización.
    try {
      for (let intento = 1; ; intento++) {
        try {
          const fila = await this.db.enTransaccion((tx) => this.enTransaccion(tx, e, clientRef));
          return { reserva: aDto(fila), creada: true };
        } catch (err) {
          if (intento < INTENTOS && esReintentable(err)) {
            await pausa(20 * intento + Math.floor(Math.random() * 30));
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      const x = errPg(err);
      if (x.code === '23505' && x.constraint === 'reservaciones_client_ref_key') {
        // Dos peticiones simultáneas con la misma clave: la perdedora devuelve la ganadora.
        const ganadora = await this.repo.porClientRef(clientRef);
        if (ganadora) return this.repeticion(ganadora, e);
      }
      throw this.traducir(err);
    }
  }

  private repeticion(previa: ReservaFila, e: CrearReservaEntrada): ResultadoReserva {
    // Cualquier cambio en el cuerpo (salvo el token del captcha) es un conflicto.
    const mismo = previa.cuerpo_hash !== null
      ? previa.cuerpo_hash === hashCuerpo(e)
      : previa.salida_id === e.salida_id && previa.email.toLowerCase() === e.email;
    if (!mismo) {
      throw new ErrorNegocio('GA_IDEMPOTENCIA_CONFLICTO', 409, 'La clave de idempotencia ya se usó con otra solicitud.');
    }
    return { reserva: aDto(previa), creada: false };
  }

  private async enTransaccion(tx: Tx, e: CrearReservaEntrada, clientRef: string): Promise<ReservaFila> {
    const salida = await this.repo.bloquearSalida(tx, e.salida_id);
    if (!salida) throw new ErrorNegocio('GA_NO_ENCONTRADO', 404, 'La salida seleccionada no existe.');
    if (!salida.activo || !salida.tour_activo) {
      throw new ErrorNegocio('GA_SALIDA_CERRADA', 409, 'La salida seleccionada no está disponible.');
    }

    const maxPersonas = await this.repo.configInt(tx, 'max_personas_reserva_web');
    if (e.personas > maxPersonas) {
      throw new ErrorNegocio('GA_LIMITE_PERSONAS', 422, `Máximo ${maxPersonas} personas por reservación en línea.`, {
        max_personas: maxPersonas,
      });
    }

    // Con la salida bloqueada, los conteos no pueden cambiar bajo nuestros pies.
    const maxPendientes = await this.repo.configInt(tx, 'max_pendientes_por_contacto');
    const pendientes = await this.repo.pendientesDelContacto(
      tx, salida.id, normalizarEmail(e.email), normalizarTelefono(e.telefono),
    );
    if (pendientes >= maxPendientes) {
      this.logger.warn(`GA_LIMITE_CONTACTO salida_id=${salida.id} pendientes=${pendientes} max=${maxPendientes}`);
      throw new ErrorNegocio('GA_LIMITE_CONTACTO', 422, 'Ya tienes reservaciones pendientes para esta salida.');
    }

    // Tope de cupo que pueden retener las pendientes (sin pagar) de la web.
    const pct = await this.repo.configInt(tx, 'pct_max_cupo_pendiente_web');
    const retenidas = await this.repo.personasPendientes(tx, salida.id);
    if ((retenidas + e.personas) * 100 > salida.cupo * pct) {
      this.logger.warn(`GA_CUPO_RETENIDO salida_id=${salida.id} pendientes=${retenidas} nuevas=${e.personas} cupo=${salida.cupo} pct=${pct}`);
      throw new ErrorNegocio(
        'GA_CUPO_RETENIDO', 409,
        'Esta salida tiene muchos lugares pendientes de pago. Intenta más tarde o contáctanos.',
      );
    }

    let promoId: string | null = null;
    let descuentoPct: number | null = null;
    if (e.codigo_promo) {
      const p = await this.promos.validar(e.codigo_promo, salida.tour_slug, tx);
      if (!p) throw new ErrorNegocio('GA_PROMO_INVALIDA', 422, 'El código de promoción no es válido para este tour.');
      promoId = p.id;
      descuentoPct = p.descuento_pct;
    }

    const c = cotizar({
      precioTour: salida.precio_tour,
      precioSalida: salida.precio_salida,
      personas: e.personas,
      descuentoPct,
    });

    let codigo: string;
    do {
      codigo = `GA-${randomBytes(3).toString('hex').toUpperCase()}`;
    } while (await this.repo.codigoExiste(tx, codigo));

    // Cupo, salida activa y plazo los valida el trigger de la base (GA001, GA003, GA004).
    const id = await this.repo.insertar(tx, {
      codigo,
      salidaId: salida.id,
      nombre: e.nombre,
      email: e.email,
      telefono: e.telefono,
      personas: e.personas,
      notas: e.notas,
      subtotalQ: c.subtotalQ,
      descuentoQ: c.descuentoQ,
      totalQ: c.totalQ,
      promoId,
      aceptaPromos: e.acepta_promos,
      clientRef,
      cuerpoHash: hashCuerpo(e),
    });
    if (e.acepta_promos) await this.repo.insertarConsentimiento(tx, e.email, id, this.config.versionAviso);
    return this.repo.porId(tx, id);
  }

  private traducir(err: unknown): unknown {
    if (err instanceof ErrorNegocio) return err;
    const x = errPg(err);
    switch (x.code) {
      case 'GA001': {
        let disponibles = 0;
        try {
          disponibles = Number((JSON.parse(x.detail ?? '{}') as { disponibles?: number }).disponibles ?? 0);
        } catch {
          /* detalle ilegible: se informa 0 */
        }
        return new ErrorNegocio('GA_CUPO_INSUFICIENTE', 409, `Solo quedan ${disponibles} lugares disponibles.`, { disponibles });
      }
      case 'GA003':
        return new ErrorNegocio('GA_SALIDA_CERRADA', 409, 'La salida seleccionada no está disponible.');
      case 'GA004':
        return new ErrorNegocio('GA_FUERA_DE_PLAZO', 409, 'La reserva en línea para esta salida ya cerró.');
      default:
        return err;
    }
  }
}
