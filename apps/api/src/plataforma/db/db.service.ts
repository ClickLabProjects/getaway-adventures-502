import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import { Pool } from 'pg';
import { CONFIG, type Config } from '../config/config';

import type { BaseDatos } from './tipos';

export type { BaseDatos };

export type Tx = Transaction<BaseDatos>;

@Injectable()
export class DbService implements OnApplicationShutdown {
  private readonly pool: Pool;
  readonly kysely: Kysely<BaseDatos>;

  constructor(@Inject(CONFIG) config: Config) {
    this.pool = new Pool({ connectionString: config.databaseUrl, max: 10,
      connectionTimeoutMillis: 3000,
      // Todo vive en el esquema `ga`: las consultas de Kysely no llevan prefijo.
      options: '-c search_path=ga',
      application_name: 'ga-api',
    });
    // Un cliente inactivo que falla no debe tumbar el proceso; solo se registra el código (sin datos).
    this.pool.on('error', (e: Error & { code?: string }) => {
      new Logger('Db').error(`Error en el pool de la base: ${e.code ?? 'desconocido'}`);
    });
    this.kysely = new Kysely<BaseDatos>({ dialect: new PostgresDialect({ pool: this.pool }) });
  }

  /** Ejecuta `fn` en una transacción; si lanza, se revierte. */
  enTransaccion<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.kysely.transaction().execute(fn);
  }

  async comprobarConexion(): Promise<void> {
    await sql`select 1`.execute(this.kysely);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.kysely.destroy();
  }
}
