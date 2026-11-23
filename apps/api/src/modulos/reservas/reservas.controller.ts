import { Body, Controller, Headers, HttpCode, Ip, Post, Res } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RouteConfig } from '@nestjs/platform-fastify';
import type { FastifyReply } from 'fastify';
import { Publico } from '../../plataforma/auth/decoradores';
import { ErrorNegocio } from '../../plataforma/errores/error-negocio';
import { ZodPipe } from '../../plataforma/validacion/zod.pipe';
import {
  crearReservaEsquema,
  CrearReservaEntradaDto,
  idempotencyKeyEsquema,
  ReservaDto,
  type CrearReservaEntrada,
} from './reservas.dto';
import { ReservasService } from './reservas.service';

@ApiTags('reservaciones')
@Controller('reservaciones')
export class ReservasController {
  constructor(private readonly servicio: ReservasService) {}

  @Post()
  @Publico()
  @HttpCode(201)
  // Activa el límite por IP (plugin @fastify/rate-limit, registrado con global:false; ver limite-tasa.ts).
  @RouteConfig({ rateLimit: {} })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID generado por el cliente' })
  @ApiBody({ type: CrearReservaEntradaDto })
  @ApiCreatedResponse({ type: ReservaDto })
  @ApiOkResponse({ type: ReservaDto, description: 'Repetición idempotente: la misma reservación' })
  @ApiResponse({ status: 400, description: 'GA_VALIDACION | GA_CAPTCHA' })
  @ApiResponse({ status: 409, description: 'GA_CUPO_INSUFICIENTE | GA_SALIDA_CERRADA | GA_FUERA_DE_PLAZO | GA_IDEMPOTENCIA_CONFLICTO' })
  @ApiResponse({ status: 422, description: 'GA_LIMITE_PERSONAS | GA_LIMITE_CONTACTO | GA_PROMO_INVALIDA' })
  @ApiResponse({ status: 429, description: 'GA_DEMASIADAS_SOLICITUDES' })
  async crear(
    @Body(new ZodPipe(crearReservaEsquema)) cuerpo: CrearReservaEntrada,
    @Headers('idempotency-key') clave: string | undefined,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<ReservaDto> {
    const k = idempotencyKeyEsquema.safeParse(clave);
    if (!k.success) {
      throw new ErrorNegocio('GA_VALIDACION', 400, 'Falta la cabecera Idempotency-Key (UUID) o no es válida.');
    }
    void res.header('cache-control', 'no-store');
    const r = await this.servicio.crear(cuerpo, k.data, ip);
    if (!r.creada) void res.status(200);
    return r.reserva;
  }
}
