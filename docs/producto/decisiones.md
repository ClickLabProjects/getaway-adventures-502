# Decisiones

Registro de decisiones de producto. Formato: `D-n · fecha · quién decidió · decisión · fuente`.
Ronda 1 (2026-11-23): solo se registran hechos que ya están en el código o que el dueño del proyecto dijo en el
encargo. Ninguna decisión de la agencia ha sido confirmada todavía.

| # | Fecha | Quién | Decisión | Fuente |
|---|---|---|---|---|
| D-1 | 2026-11-23 | Dueño del proyecto | El proyecto se vendió a la agencia y sale a producción. | Encargo ronda 1 |
| D-2 | 2026-11-23 | Dueño del proyecto | No hay pagos en línea: la reserva queda pendiente y el operador confirma por WhatsApp. | Encargo ronda 1; `TourPage.tsx`, `i18n.tsx` (`tour.fine`, `confirm.pending*`) |
| D-3 | 2026-11-23 | Dueño del proyecto | Solo existe inicio de sesión para administradores; no hay cuentas de clientes. | Encargo ronda 1; `AdminApp.tsx`, `ga_admins` |
| D-4 | 2026-11-23 | Dueño del proyecto | El producto llevará varios módulos: inicio de sesión, reservas, dashboard y otros por definir. | Encargo ronda 1 |
| D-5 | 2026-11-23 | Dueño del proyecto (técnica) | El backend es Supabase (Postgres, RLS, funciones SQL); lo que necesite secretos o servicios externos va en Edge Functions. | Encargo ronda 1 |
| D-6 | existente | Código | El sitio público es bilingüe, inglés por defecto, con selector EN/ES; si falta el texto en inglés se muestra el español. | `i18n.tsx`, README |
| D-7 | existente | Código | Precios por persona en quetzales; una salida puede tener precio especial. El total lo calcula el servidor. | `schema.sql`, `admin.sql` |
| D-8 | existente | Código | Cupo por salida validado de forma atómica en el servidor; las canceladas no ocupan cupo. | `ga_crear_reservacion` |
| D-9 | existente | Código | Estados de reserva: pendiente, confirmada, pagada, cancelada. Toda reserva nueva entra como pendiente. | `schema.sql` |
| D-10 | existente | Código | Una promoción por reserva, por porcentaje, con vigencia y para un tour o todos. | `admin.sql` |
| D-11 | existente | Código | El consentimiento de marketing es opcional y viene desmarcado. | `TourPage.tsx` |
| D-12 | existente | Código | Todos los tours salen desde Antigua Guatemala; contacto principal por WhatsApp e Instagram. | `seed.sql`, `supabase.ts` |
