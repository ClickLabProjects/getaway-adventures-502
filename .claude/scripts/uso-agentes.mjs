#!/usr/bin/env node
// Muestra qué agentes corrieron, con qué modelo real y cuántos tokens usaron.
// Solo lee los registros locales de Claude Code (~/.claude/projects); no llama a ninguna API.
//
//   node .claude/scripts/uso-agentes.mjs           # sesión más reciente de este proyecto
//   node .claude/scripts/uso-agentes.mjs --todas   # todas las sesiones del proyecto
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const raiz = resolve(new URL('../..', import.meta.url).pathname);
const base = process.env.CLAUDE_HOME ?? join(homedir(), '.claude');
const carpeta = join(base, 'projects', raiz.replace(/[^A-Za-z0-9]/g, '-'));
if (!existsSync(carpeta)) {
  console.error(`No hay registros de Claude Code para ${raiz}\n(buscado en ${carpeta})`);
  process.exit(1);
}

/** Suma los tokens de un .jsonl, contando cada mensaje una sola vez (se registra en varias líneas). */
function leer(archivo) {
  const porMensaje = new Map();
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    if (!linea.includes('"usage"')) continue;
    let e;
    try { e = JSON.parse(linea); } catch { continue; }
    const m = e.message;
    if (!m?.usage || !m.model || m.model === '<synthetic>') continue;
    porMensaje.set(m.id ?? e.uuid, { modelo: m.model, u: m.usage });
  }
  const t = { modelos: new Set(), entrada: 0, cacheNueva: 0, cacheLeida: 0, salida: 0, llamadas: porMensaje.size };
  for (const { modelo, u } of porMensaje.values()) {
    t.modelos.add(modelo.replace(/^claude-/, ''));
    t.entrada += u.input_tokens ?? 0;
    t.cacheNueva += u.cache_creation_input_tokens ?? 0;
    t.cacheLeida += u.cache_read_input_tokens ?? 0;
    t.salida += u.output_tokens ?? 0;
  }
  return t;
}

const k = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));
const fila = (cols, anchos) => cols.map((c, i) => String(c).padEnd(anchos[i])).join('  ');

const sesiones = readdirSync(carpeta)
  .filter((f) => f.endsWith('.jsonl'))
  .map((f) => ({ id: f.slice(0, -6), mtime: statSync(join(carpeta, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);
const elegidas = process.argv.includes('--todas') ? sesiones : sesiones.slice(0, 1);

const totales = new Map(); // modelo -> tokens de salida
for (const s of elegidas) {
  const lider = leer(join(carpeta, s.id + '.jsonl'));
  console.log(`\nSesión ${s.id} · ${new Date(s.mtime).toLocaleString()}`);
  const anchos = [22, 34, 16, 6, 8, 9, 7, 10];
  console.log(fila(['agente', 'tarea', 'modelo', 'llam.', 'entrada', 'cache', 'salida', 'estado'], anchos));
  const filas = [{ agente: 'LÍDER (sesión)', tarea: '', t: lider, estado: '' }];

  const dir = join(carpeta, s.id, 'subagents');
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.meta.json'))) {
      const meta = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const jsonl = join(dir, f.replace('.meta.json', '.jsonl'));
      if (!existsSync(jsonl)) continue;
      filas.push({
        agente: meta.agentType ?? '?',
        tarea: (meta.description ?? '').slice(0, 34),
        t: leer(jsonl),
        estado: meta.finished ? 'terminado' : 'en curso',
        mtime: statSync(jsonl).mtimeMs,
      });
    }
  }
  filas.sort((a, b) => (a.mtime ?? 0) - (b.mtime ?? 0));
  for (const { agente, tarea, t, estado } of filas) {
    const modelo = [...t.modelos].join(',') || '-';
    console.log(fila([agente, tarea, modelo, t.llamadas, k(t.entrada + t.cacheNueva), k(t.cacheLeida), k(t.salida), estado], anchos));
    for (const m of t.modelos) totales.set(m, (totales.get(m) ?? 0) + t.salida);
  }
}

console.log('\nTokens de salida por modelo (lo que más pesa en los límites):');
for (const [m, n] of [...totales].sort((a, b) => b[1] - a[1])) console.log(`  ${m.padEnd(18)} ${k(n)}`);
console.log('\nentrada = contexto nuevo enviado · cache = contexto releído (más barato) · salida = lo que escribió el modelo');
