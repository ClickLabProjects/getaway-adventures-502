import { Module } from '@nestjs/common';
import { AuthModule } from './plataforma/auth/auth.module';
import { ConfigModule } from './plataforma/config/config.module';
import { DbModule } from './plataforma/db/db.module';
import { ErroresModule } from './plataforma/errores/errores.module';
import { RelojModule } from './plataforma/reloj/reloj.module';
import { SaludModule } from './plataforma/salud/salud.module';
import { CatalogoModule } from './modulos/catalogo/catalogo.module';
import { ReservasModule } from './modulos/reservas/reservas.module';
import { PromocionesModule } from './modulos/promociones/promociones.module';

@Module({
  imports: [ConfigModule, DbModule, RelojModule, ErroresModule, AuthModule, SaludModule, CatalogoModule, PromocionesModule, ReservasModule],
})
export class AppModule {}
