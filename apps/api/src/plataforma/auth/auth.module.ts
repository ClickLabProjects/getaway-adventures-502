import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GuardaAuth } from './guarda-auth';
import { USUARIOS_PANEL, UsuariosPanelEnMemoria } from './usuarios-panel.service';
import { VERIFICADOR_TOKEN, VerificadorCognito } from './verificador-token';
import { YoController } from './yo.controller';

@Global()
@Module({
  controllers: [YoController],
  providers: [
    { provide: VERIFICADOR_TOKEN, useClass: VerificadorCognito },
    { provide: USUARIOS_PANEL, useClass: UsuariosPanelEnMemoria },
    { provide: APP_GUARD, useClass: GuardaAuth },
  ],
  exports: [VERIFICADOR_TOKEN, USUARIOS_PANEL],
})
export class AuthModule {}
