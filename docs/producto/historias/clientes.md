# Historias · CLI · Clientes y marketing

Reglas relacionadas: R35–R41.

### H-CLI-1: base de clientes
Como administrador quiero ver a cada cliente una sola vez, con sus reservas, viajeros, total y último viaje.
Criterios de aceptación:
- Dado que ana@x.com reservó 3 veces (una con "Ana@X.com"), cuando veo la base, entonces aparece una sola fila con 3 reservas.
- Dado segmentos recurrentes, nuevos (30 días) e inactivos (90 días), cuando elijo uno, entonces solo veo esos clientes.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL]

### H-CLI-2: consentimiento según la última decisión
Como cliente quiero que, si dejé de aceptar promociones, no me escriban más.
Criterios de aceptación:
- Dado que en mi primera reserva acepté promociones y en la segunda no, cuando el administrador ve la base, entonces aparezco "sin consentimiento" (R37).
- Dado que estoy "sin consentimiento", cuando el administrador filtra "solo quienes aceptan", entonces no aparezco.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-CLI-3: darse de baja
Como cliente quiero darme de baja del marketing con un clic.
Criterios de aceptación:
- Dado un correo de marketing, cuando hago clic en "darme de baja", entonces quedo sin consentimiento sin tener que iniciar sesión y veo una página de confirmación en mi idioma.
- Dado que respondo "STOP"/"baja" por WhatsApp, cuando el personal lo ve, entonces puede marcarme sin consentimiento desde el panel en un clic.
- Dado que me di de baja, cuando vuelvo a reservar y marco la casilla, entonces el consentimiento vuelve a ser sí.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-CLI-4: consentimiento no falsificable
Como agencia quiero que nadie pueda suscribir a otra persona con su correo.
Criterios de aceptación:
- Dado que alguien reserva con el correo de otra persona y marca "acepto promociones", cuando se guarda, entonces el consentimiento queda "por confirmar" hasta que el dueño del correo haga clic en el correo de comprobante (doble opt-in). [PROPUESTA: confirmar con P-10]
- Dado un consentimiento por confirmar, cuando el administrador filtra "solo quienes aceptan", entonces no aparece.
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-CLI-5: borrar mis datos
Como cliente quiero pedir que borren mis datos personales.
Criterios de aceptación:
- Dado que pido el borrado por WhatsApp o correo, cuando el administrador ejecuta "anonimizar cliente", entonces nombre, correo, teléfono y notas de todas sus reservas se reemplazan, y montos, fechas y tours se conservan (R39).
- Dado un cliente con una reserva futura activa, cuando intento anonimizarlo, entonces se avisa que primero hay que cancelarla o esperar al viaje.
- Dado que se anonimizó, cuando busco su correo, entonces no aparece.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-CLI-6: escribir a clientes por WhatsApp y correo
Como administrador quiero mandar un mensaje personalizado con una promoción a los clientes que aceptaron.
Criterios de aceptación:
- Dado 5 clientes seleccionados con consentimiento, cuando escribo "Hola {nombre}", entonces cada WhatsApp abre con su nombre.
- Dado que selecciono clientes sin consentimiento, cuando intento enviar, entonces el sistema los excluye y me dice cuántos.
- Dado 200 destinatarios por correo, cuando envío, entonces no se pierden destinatarios (se parte en lotes o se envía desde el sistema en F2).
- Dado el filtro "Enviar a clientes", cuando lo uso, entonces realmente filtra.
Fase: 1 (correcciones) / 2 (envío desde el sistema) · Prioridad: debería · Estado: [ACTUAL] (WhatsApp/CCO) / [PROPUESTA] (resto)

### H-CLI-7: exportar clientes
Como administrador quiero exportar la base a CSV de forma segura.
Criterios de aceptación:
- Dado la exportación, cuando la genero, entonces aplica la misma protección de fórmulas que H-OPE-5 e incluye la columna de consentimiento.
- Dado que soy personal (F2), cuando intento exportar, entonces no se permite.
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] / [PROPUESTA]
