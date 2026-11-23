import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Publico } from '../auth/decoradores';
import { DbService } from '../db/db.service';
import { ErrorNegocio } from '../errores/error-negocio';

export class SaludDto {
  @ApiProperty({ example: 'ok' }) estado!: 'ok';
}

@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly db: DbService) {}

  @Get()
  @Publico()
  @ApiOkResponse({ type: SaludDto })
  async salud(): Promise<SaludDto> {
    try {
      await this.db.comprobarConexion();
    } catch {
      throw new ErrorNegocio('GA_SERVICIO_NO_DISPONIBLE', 503, 'La base de datos no responde.');
    }
    return { estado: 'ok' };
  }
}
