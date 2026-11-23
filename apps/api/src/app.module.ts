import { Module } from '@nestjs/common';
import { AuthModule } from './plataforma/auth/auth.module';
import { ConfigModule } from './plataforma/config/config.module';
import { DbModule } from './plataforma/db/db.module';
import { ErroresModule } from './plataforma/errores/errores.module';
import { RelojModule } from './plataforma/reloj/reloj.module';
import { SaludModule } from './plataforma/salud/salud.module';

@Module({
  imports: [ConfigModule, DbModule, RelojModule, ErroresModule, AuthModule, SaludModule],
})
export class AppModule {}
