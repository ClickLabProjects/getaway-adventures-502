# Historias · CTA · Cuentas e inicio de sesión

### H-CTA-1: entrar al panel
Como administrador quiero entrar a /admin con mi correo y contraseña.
Criterios de aceptación:
- Dado un usuario administrador, cuando entra con la contraseña correcta, entonces ve el panel.
- Dado un usuario que existe pero no es administrador, cuando entra, entonces ve "Sin acceso" y ningún dato.
- Dado una contraseña incorrecta, cuando intenta, entonces ve un error sin indicar si el correo existe.
- Dado que la red falla al revisar el permiso, cuando ocurre, entonces ve "error de conexión, reintentar", no "Sin acceso".
Fase: 1 · Prioridad: debe · Estado: [ACTUAL] (los tres primeros) / [PROPUESTA] (red)

### H-CTA-2: sin registro público
Como dueño quiero que nadie pueda crearse una cuenta por su cuenta.
Criterios de aceptación:
- Dado un visitante, cuando intenta registrarse por la vía de autenticación, entonces se rechaza; solo una persona de la agencia da de alta usuarios.
Fase: 1 · Prioridad: debe · Estado: [PROPUESTA]

### H-CTA-3: segundo factor para el panel
Como dueño quiero que entrar al panel pida un segundo factor, porque ahí están los datos de los clientes.
Criterios de aceptación:
- Dado un administrador con segundo factor activo, cuando entra con contraseña, entonces se le pide el código de su app autenticadora antes de ver datos.
- Dado que el código es incorrecto, cuando lo ingresa, entonces no entra.
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-CTA-4: recuperar contraseña
Como administrador quiero restablecer mi contraseña si la olvido.
Criterios de aceptación:
- Dado mi correo de administrador, cuando pido restablecer, entonces recibo un enlace que vence en 1 hora.
- Dado un correo que no es de administrador, cuando lo pido, entonces veo el mismo mensaje (no revela si existe).
Fase: 1 · Prioridad: debería · Estado: [PROPUESTA]

### H-CTA-5: roles personal y dueño
Como dueño quiero dar acceso al personal sin que vean finanzas ni exporten clientes.
Criterios de aceptación:
- Dado un usuario personal, cuando entra, entonces ve Reservaciones, Salidas y registro de pagos, y no ve Dashboard financiero, exportar CSV de clientes, reembolsos ni edición de precios (tabla de `roles.md`).
- Dado que un usuario personal intenta una acción prohibida directamente contra el servidor, cuando la intenta, entonces se rechaza.
Fase: 2 · Prioridad: debería · Estado: [PROPUESTA]

### H-CTA-6: administrar usuarios del panel
Como dueño quiero invitar, cambiar el rol y quitar el acceso a usuarios del panel sin pedírselo al programador.
Criterios de aceptación:
- Dado el correo de un empleado, cuando lo invito como personal, entonces recibe un correo para crear su contraseña.
- Dado que le quito el acceso, cuando intenta entrar, entonces ya no ve datos.
- Dado que soy el único dueño, cuando intento quitarme el rol, entonces no se permite.
Fase: 2 · Prioridad: debería · Estado: [PROPUESTA]

### H-CTA-7: cuenta de cliente
Como turista quiero crear una cuenta con mi correo para ver mis reservas y reservar más rápido.
Criterios de aceptación:
- Dado mi correo, cuando me registro, entonces recibo un enlace de verificación; hasta verificar no veo reservas.
- Dado que tengo cuenta, cuando reservo, entonces mis datos vienen llenos.
- Dado que reservé antes sin cuenta con el mismo correo, cuando verifico, entonces veo esas reservas (H-RES-17).
- Dado que pido borrar mi cuenta, cuando confirmo, entonces se aplica la anonimización (R39).
- Dado que tengo cuenta, cuando entro, entonces no veo nada del panel ni datos de otros clientes.
Fase: 3 · Prioridad: podría · Estado: [PROPUESTA]
