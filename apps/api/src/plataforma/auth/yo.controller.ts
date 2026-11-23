import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Roles, ROLES_PANEL } from './decoradores';
import type { PeticionAutenticada } from './guarda-auth';

export class YoDto {
  @ApiProperty() sub!: string;
  @ApiProperty({ enum: ROLES_PANEL }) rol!: string;
}

@ApiTags('auth')
@ApiBearerAuth()
@Controller('yo')
export class YoController {
  @Get()
  @Roles(...ROLES_PANEL)
  @ApiOkResponse({ type: YoDto })
  yo(@Req() req: PeticionAutenticada): YoDto {
    // El guarda ya garantizó que `usuario` existe.
    const { sub, rol } = req.usuario!;
    return { sub, rol };
  }
}
