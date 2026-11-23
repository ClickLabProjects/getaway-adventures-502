import { Module } from '@nestjs/common';
import { PromocionesModule } from '../promociones/promociones.module';
import { proveedorCaptcha } from './captcha';
import { ReservasController } from './reservas.controller';
import { ReservasRepo } from './reservas.repo';
import { ReservasService } from './reservas.service';

@Module({
  imports: [PromocionesModule],
  controllers: [ReservasController],
  providers: [ReservasService, ReservasRepo, proveedorCaptcha],
})
export class ReservasModule {}
