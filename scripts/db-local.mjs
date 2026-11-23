// Envoltorio de dbmate SOLO para la base LOCAL. Uso: node scripts/db-local.mjs <migrate|rollback|status|...>
// - Lee db/.env.local (o usa la URL local por defecto con GA_DB_PORT).
// - Aborta si el host no es local.
// - Quita DATABASE_URL del entorno del hijo y pasa la URL con --url (una DATABASE_URL del shell no cuenta).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archivo = resolve(raiz, 'db/.env.local');
let url = `postgres://ga_migrator:ga_migrator_local_falsa@localhost:${process.env.GA_DB_PORT || 5432}/ga_dev?sslmode=disable`;

if (existsSync(archivo)) {
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/);
    if (m) url = m[1].replace(/^(['"])(.*)\1$/, '$2');
  }
}

let host;
try {
  host = new URL(url).hostname;
} catch {
  console.error('db-local: la URL de db/.env.local no es válida.');
  process.exit(1);
}
if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)) {
  console.error(`db-local: el host "${host}" no es local. Este script solo opera sobre el Postgres local.`);
  process.exit(1);
}

const entorno = { ...process.env };
delete entorno.DATABASE_URL;
const args = [
  '--url', url,
  '--migrations-dir', resolve(raiz, 'db/migrations'),
  '--migrations-table', 'ga_meta.schema_migrations',
  '--no-dump-schema',
  ...process.argv.slice(2),
];
const r = spawnSync(resolve(raiz, 'node_modules/.bin/dbmate'), args, { stdio: 'inherit', env: entorno });
process.exit(r.status ?? 1);
