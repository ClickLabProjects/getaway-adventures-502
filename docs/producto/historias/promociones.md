# Historias · PRO · Promociones

### H-PRO-1: ver promociones vigentes en la portada
Como visitante quiero ver las ofertas actuales para aprovecharlas.
Criterios de aceptación:
- Dado una promo activa con vigencia que incluye hoy (hora de Guatemala), cuando abro la portada, entonces la veo con imagen, % y código, en mi idioma.
- Dado una promo vencida, pausada o programada para el futuro, cuando abro la portada, entonces no la veo.
- Dado que veo la promo en inglés, cuando no tiene título en inglés, entonces se muestra en español.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL]

### H-PRO-2: aplicar un código
Como visitante quiero que mi código se aplique aunque no presione "Apply".
Criterios de aceptación:
- Dado que escribo un código válido y presiono Enter, cuando lo hago, entonces se aplica (no envía la reserva).
- Dado que escribo un código válido y envío sin presionar "Apply", cuando se procesa, entonces la reserva se crea con el descuento.
- Dado que escribo un código inválido y envío, cuando se procesa, entonces no se crea la reserva y veo "código no válido; quítalo o corrígelo" (R17).
- Dado que escribo el código con espacios o en minúsculas, cuando se valida, entonces funciona igual.
- Dado una promo para otro tour, cuando la uso, entonces veo "no válido para este tour".
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] (validación) / [PROPUESTA] (Enter, sin Apply, inválido)

### H-PRO-3: promo vencida al reservar
Como visitante quiero saber si la promo venció entre que la apliqué y envié.
Criterios de aceptación:
- Dado que apliqué una promo que vence hoy, cuando envío después de medianoche (hora de Guatemala), entonces el servidor rechaza el código y veo el mensaje; no se cobra el precio completo sin avisar.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-PRO-4: enlace de reserva con promo
Como visitante quiero que el botón "Reservar con promo" me lleve al tour con el código ya puesto.
Criterios de aceptación:
- Dado el enlace `/tour/acatenango?promo=CODIGO`, cuando lo abro, entonces el código aparece aplicado.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL]

### H-PRO-5: administrar promociones
Como administrador quiero crear, pausar y editar promociones con imagen, código, %, tour y vigencia.
Criterios de aceptación:
- Dado una promo nueva con 15% para Atitlán del 1 al 15, cuando la guardo, entonces se ve "Vigente", "Programada" o "Vencida" según la fecha.
- Dado que pongo 100% de descuento, cuando guardo, entonces se pide confirmación explícita.
- Dado que pongo 0%, cuando guardo, entonces se avisa que solo sirve como anuncio y el código no dará descuento.
- Dado que borro un tour con promociones, cuando se borra, entonces sus promociones quedan pausadas (R18).
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] (crear/editar) / [PROPUESTA] (resto)

### H-PRO-6: promociones privadas y límite de usos
Como administrador quiero códigos que no salgan en la portada y que se puedan usar un número limitado de veces.
Criterios de aceptación:
- Dado una promo marcada privada, cuando abro la portada, entonces no aparece, pero el código funciona al reservar.
- Dado una promo con límite de 20 usos ya usada 20 veces, cuando alguien la usa, entonces se rechaza.
- Dado una reserva con promo que se cancela, cuando se cancela, entonces se libera el uso.
Fase: 2 · Prioridad: debería · Estado: [PROPUESTA]

### H-PRO-7: descuento de monto fijo y por cantidad
Como administrador quiero descuentos de monto fijo (Q100) o por grupo (4+ personas).
Criterios de aceptación:
- Dado una promo de Q100 y una reserva de Q450, cuando se aplica, entonces el total es Q350; nunca queda menor a Q0.
- Dado una promo "4+ personas 10%", cuando reservo 3, entonces no aplica y se explica por qué.
Fase: 2 · Prioridad: podría · Estado: [PROPUESTA]
