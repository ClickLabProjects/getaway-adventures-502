# Historias · CAT · Catálogo de tours y salidas

### H-CAT-1: ver tours en mi idioma
Como visitante quiero ver los tours en inglés o español para entender qué compro.
Criterios de aceptación:
- Dado que entro por primera vez, cuando carga la portada, entonces está en inglés.
- Dado que elijo ES, cuando recargo o abro otro tour, entonces sigue en español.
- Dado un tour sin texto en inglés en un campo, cuando veo la versión EN, entonces se muestra el texto en español.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL]

### H-CAT-2: detalle del tour
Como visitante quiero ver fotos, qué incluye, horario, duración, punto de salida y precio para decidir.
Criterios de aceptación:
- Dado un tour activo, cuando abro su página, entonces veo nombre, destino, duración, punto de salida, horario, descripción, incluye, galería y precio por persona.
- Dado un tour dado de baja, cuando abro su enlace, entonces veo "Tour no encontrado" con enlace a todos los tours.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL]

### H-CAT-3: error de red distinto de "no existe"
Como visitante quiero saber si el problema es mi conexión para reintentar.
Criterios de aceptación:
- Dado que no hay red al abrir un tour, cuando falla la carga, entonces veo "No pudimos cargar, revisa tu conexión" con botón "Reintentar", no "Tour no encontrado" ni "No hay salidas".
- Dado que reintento con red, cuando carga, entonces veo el tour normal.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-CAT-4: punto de encuentro y qué llevar
Como visitante quiero saber exactamente dónde y a qué hora me recogen.
Criterios de aceptación:
- Dado un tour, cuando veo su página y mi comprobante, entonces aparece el punto de encuentro con dirección y enlace de mapa, y la hora de presentación.
- Dado un tour con varios puntos (por ejemplo Pacaya ATV: La Parada o Condesa), cuando reservo, entonces elijo uno y queda en la reserva.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-CAT-5: precio por conductor y acompañante en ATV
Como visitante quiero ver claramente el precio por cuatrimoto y por acompañante.
Criterios de aceptación:
- Dado un tour ATV, cuando veo el precio, entonces dice "por conductor" y muestra el precio del acompañante (R14), en EN y ES.
- Dado un tour no ATV, cuando veo el precio, entonces dice "por persona".
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-CAT-6: administrar tours
Como administrador quiero crear, editar, dar de baja y reactivar tours con fotos y versión en inglés.
Criterios de aceptación:
- Dado un tour nuevo con nombre, precio y fotos, cuando lo guardo, entonces aparece en la portada si está activo.
- Dado un tour con reservaciones, cuando intento eliminarlo, entonces no se permite (solo dar de baja).
- Dado que dejo el precio vacío, cuando guardo, entonces se pide un precio (no se guarda Q0).
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] (los dos primeros) / [PROPUESTA] (precio vacío)

### H-CAT-7: administrar salidas y cupo
Como administrador quiero abrir y cerrar fechas, cambiar el cupo y poner precios especiales.
Criterios de aceptación:
- Dado un tour, cuando genero salidas para un rango de fechas, entonces se crean con el cupo por omisión sin duplicar las existentes.
- Dado una salida con 6 personas reservadas, cuando intento bajar el cupo a 4, entonces se rechaza (R8).
- Dado que cierro una salida con reservas, cuando la cierro, entonces deja de verse en el sitio y el panel me avisa cuántas reservas tiene.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] (generar y cerrar) / [PROPUESTA] (R8 y aviso)

### H-CAT-8: hora de corte por tour
Como administrador quiero definir hasta qué hora se puede reservar cada tour.
Criterios de aceptación:
- Dado Atitlán con corte "18:00 del día anterior", cuando son las 18:01 del día anterior en Guatemala, entonces esa salida ya no se ofrece.
- Dado un tour sin corte definido, cuando se calcula, entonces usa el corte por omisión (R2).
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-CAT-9: tours privados y fechas a pedido
Como visitante quiero pedir una fecha o un tour privado que no aparece.
Criterios de aceptación:
- Dado que no hay fechas, cuando veo el tour, entonces tengo un botón para pedir fecha por WhatsApp con el nombre del tour.
- Dado un formulario de "solicitud de tour privado" [F2], cuando lo envío, entonces la agencia lo recibe y no se aparta cupo.
Fase: 1 (WhatsApp) / 2 (solicitud) · Prioridad: podría · Estado: [ACTUAL] / [PROPUESTA]
