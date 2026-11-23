# Historias · RSN · Reseñas y fidelización

### H-RSN-1: pedir reseña después del tour
Como agencia quiero pedir una reseña al día siguiente del tour para conseguir más reseñas públicas.
Criterios de aceptación:
- Dado una reserva `completada`, cuando pasa 1 día, entonces el turista recibe un correo en su idioma con enlace a dejar reseña (Google / TripAdvisor, P-12).
- Dado una reserva cancelada o `no_show`, cuando pasa el día, entonces no se envía.
- Dado un cliente que se dio de baja del marketing, cuando corresponde enviar, entonces sí se envía (es mensaje de servicio) solo si la agencia lo decide así (P-12); si no, no se envía.
Fase: 3 · Prioridad: podría · Estado: [PROPUESTA]

### H-RSN-2: mostrar reseñas en el sitio
Como visitante quiero leer opiniones de otros viajeros en la página del tour.
Criterios de aceptación:
- Dado reseñas aprobadas por el administrador, cuando veo el tour, entonces aparecen con nombre de pila, país y fecha.
- Dado una reseña no aprobada, cuando veo el tour, entonces no aparece.
Fase: 3 · Prioridad: podría · Estado: [PROPUESTA]

### H-RSN-3: descuento para cliente que vuelve
Como cliente recurrente quiero un beneficio por volver a reservar.
Criterios de aceptación:
- Dado un cliente con al menos 1 viaje completado, cuando reserva de nuevo con el mismo correo, entonces se le ofrece el descuento de cliente frecuente que defina la agencia.
- Dado un cliente sin viajes completados, cuando reserva, entonces no se le ofrece.
Fase: 3 · Prioridad: podría · Estado: [PROPUESTA]
