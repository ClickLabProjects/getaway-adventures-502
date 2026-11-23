/**
 * Normalización SOLO para contar pendientes por contacto (no cambia lo que se guarda).
 * Debe coincidir con la normalización en SQL de `ReservasRepo.pendientesDelContacto`.
 */

export function normalizarTelefono(telefono: string): string {
  const d = telefono.replace(/\D/g, '');
  return d.length === 11 && d.startsWith('502') ? d.slice(3) : d;
}

export function normalizarEmail(email: string): string {
  const e = email.trim().toLowerCase();
  const i = e.lastIndexOf('@');
  if (i < 0) return e;
  let local = e.slice(0, i).split('+')[0]!;
  let dominio = e.slice(i + 1);
  if (dominio === 'gmail.com' || dominio === 'googlemail.com') {
    local = local.replaceAll('.', '');
    dominio = 'gmail.com';
  }
  return `${local}@${dominio}`;
}
