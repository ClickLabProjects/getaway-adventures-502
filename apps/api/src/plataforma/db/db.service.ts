import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import { Pool } from 'pg';
import { CONFIG, type Config } from '../config/config';

// Se irá llenando cuando existan las tablas del esquema `ga`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BaseDatos {}

export type Tx = Transaction<BaseDatos>;

@Injectable()
export class DbService implements OnApplicationShutdown {
  private readonly pool: Pool;
  readonly kysely: Kysely<BaseDatos>;

  constructor(@Inject(CONFIG) config: Config) {
    this.pool = new Pool({ connectionString: config.databaseUrl, max: 10, connectionTimeoutMillis: 3000 });
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
