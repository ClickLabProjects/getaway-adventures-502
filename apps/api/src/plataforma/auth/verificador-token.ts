import { Inject, Injectable } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CONFIG, type Config } from '../config/config';

export const VERIFICADOR_TOKEN = Symbol('VERIFICADOR_TOKEN');

export interface VerificadorToken {
  /** Devuelve el `sub` si el access token es válido; lanza si no. */
  verificar(token: string): Promise<{ sub: string }>;
}

@Injectable()
export class VerificadorCognito implements VerificadorToken {
  private readonly verificador;

  constructor(@Inject(CONFIG) config: Config) {
    this.verificador = CognitoJwtVerifier.create({
      userPoolId: config.cognito.userPoolId,
      tokenUse: 'access',
      clientId: config.cognito.clientId,
    });
  }

  async verificar(token: string): Promise<{ sub: string }> {
    const payload = await this.verificador.verify(token);
    return { sub: payload.sub };
  }
}
