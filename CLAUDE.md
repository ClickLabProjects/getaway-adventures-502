# Getaway Adventures 502: cómo trabajamos con IA

Sitio de reservaciones de tours (Vite + React + TypeScript en `src/`, Supabase en `supabase/`).
El proyecto ya está vendido y va a producción. La revisión previa está en `docs/revision-pre-produccion.md`.

## Roles

La sesión principal (Opus) es el **líder técnico**. Su trabajo es pensar, dividir, revisar y decidir.
**No escribe código de más de unas pocas líneas.** El código lo escriben los agentes programadores, que usan
modelos más baratos. Así se ahorran tokens de Opus.

| Agente | Modelo | Para qué |
|---|---|---|
| `dev-backend` | Sonnet | Migraciones SQL, RLS, funciones, triggers, Edge Functions |
| `dev-frontend` | Sonnet | Páginas, componentes, CSS, i18n, panel admin |
| `dev-pruebas` | Sonnet | pgTAP, Vitest, Playwright, CI de pruebas |
| `dev-mecanico` | Haiku | Cambios repetitivos que ya están especificados al detalle |
| `product-owner` | Opus | Define el producto: módulos, roles, historias, reglas y fases (escribe solo en `docs/producto/`) |
| `arquitecto` | Opus | Diseño, estructura y capas, escalabilidad (solo lectura) |
| `seguridad` | Opus | RLS, funciones `security definer`, datos personales (solo lectura) |
| `revisor` | Opus | Verifica los hallazgos de los demás y la cobertura (solo lectura) |
| `calidad` | Sonnet | Bugs y plan de pruebas (solo lectura) |
| `ux-diseno` | Sonnet | Móvil, accesibilidad, idiomas (solo lectura) |
| `despliegue` | Sonnet | CI/CD, migraciones, respaldos (solo lectura) |

## Flujo de cada funcionalidad

0. **Producto:** toda funcionalidad nueva parte de `docs/producto/`. Si no está definida ahí, primero pasa por el
   `product-owner`, que trabaja por rondas: entrega un borrador y preguntas, el dueño responde y el agente actualiza.
   Las decisiones de negocio las toma el dueño o el cliente, nunca un agente.
1. **Diseño:** para algo nuevo o que toca varias capas, primero el `arquitecto` propone a partir de `docs/producto/`.
   El líder decide.
2. **Encargos:** el líder parte el trabajo en tareas pequeñas, cada una para un agente, con el formato de abajo.
3. **Programar:** se lanzan los `dev-*`.
   - Si dos tareas tocan archivos distintos, van en paralelo y cada una con `isolation: "worktree"`.
   - Si tocan los mismos archivos, van una detrás de otra.
4. **Pruebas:** `dev-pruebas` cubre el comportamiento nuevo. Nada se integra con pruebas en rojo.
5. **Revisión:** el líder lee los reportes y el `git diff --stat`, y abre solo lo que tenga riesgo.
   - Si el cambio toca SQL, RLS, dinero o datos personales, pasa por `seguridad`.
   - Si es grande, pasa por `revisor`.
6. **Integrar:** el líder hace el commit en una rama. Nunca se hace push directo a `main`, porque eso publica el sitio.

## Formato del encargo (obligatorio)

```
OBJETIVO: qué debe quedar funcionando, en una o dos frases.
CONTEXTO: decisiones ya tomadas y por qué (lo mínimo para no explorar el repo).
ARCHIVOS: los que puede crear o modificar. Cualquier otro, prohibido.
NO HACER: lo que queda fuera de esta tarea.
TERMINADO CUANDO: comprobaciones concretas (pruebas que pasan, comando, comportamiento).
```

Un buen encargo ahorra más tokens que cualquier modelo barato. Si el agente tiene que explorar el proyecto para
entender qué hacer, el encargo estaba incompleto.

## Reglas de seguridad

- Ningún agente ejecuta `npm run db:*`, `make-admin`, `supabase db push` ni nada contra la base de producción.
  Esos pasos los hace una persona.
- Nadie lee ni muestra `.env`.
- Las reglas de dinero, cupo y permisos viven en Postgres o en el servidor, nunca solo en React.
- Las migraciones ya aplicadas no se editan: siempre se crea una nueva en `supabase/migrations/`.

## Seguimiento de agentes y modelos

`node .claude/scripts/uso-agentes.mjs` lista cada agente de la sesión más reciente con su modelo real, sus tokens y
su estado. Para todas las sesiones del proyecto, agrega `--todas`.

Claude Code vigila `.claude/agents/`. Los agentes nuevos y los cambios de `model:` se aplican solos, sin reiniciar,
pero tardan unos segundos: el agente que se lance justo después de editar todavía puede salir con la configuración
anterior. Con el script se verifica qué modelo usó realmente cada agente.

El modelo se decide en este orden (gana el primero que exista):
1. El parámetro `model` que el líder pasa al lanzar el agente.
2. El campo `model:` del archivo del agente.
3. La variable `CLAUDE_CODE_SUBAGENT_MODEL`.
4. El modelo de la sesión.

El líder no pasa `model` al lanzar un agente, salvo que quiera cambiarlo a propósito para esa tarea.
