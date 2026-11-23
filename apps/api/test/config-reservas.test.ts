import { describe, expect, it } from 'vitest';
import { crearVerificadorCaptcha, respuestaValida, VerificadorCaptchaFalso, VerificadorTurnstile } from '../src/modulos/reservas/captcha';
import { normalizarEmail, normalizarTelefono } from '../src/modulos/reservas/contacto';
import { cargarConfig, parsearTrustProxy, trustProxyParaFastify } from '../src/plataforma/config/config';
import { claveIp } from '../src/plataforma/limite/limite-tasa';

describe('TRUST_PROXY', () => {
  it('por omisión es false; acepta saltos y listas IP/CIDR; rechaza true y basura', () => {
    expect(cargarConfig({ NODE_ENV: 'test' }).trustProxy).toBe(false);
    expect(parsearTrustProxy('')).toBe(false);
    expect(parsearTrustProxy('false')).toBe(false);
    expect(parsearTrustProxy('1')).toBe(1);
    expect(parsearTrustProxy('172.18.0.0/16, 10.0.0.1, fd00::/8')).toEqual(['172.18.0.0/16', '10.0.0.1', 'fd00::/8']);
    for (const malo of ['true', 'si', '1.2.3.4/33', '10.0.0.0/8/1', 'a,b']) {
      expect(() => parsearTrustProxy(malo), malo).toThrow(/TRUST_PROXY/);
    }
  });
});

describe('trustProxyParaFastify', () => {
  it('un número se convierte en función de saltos (Fastify 5 trataría el número como "no confiar")', () => {
    const f = trustProxyParaFastify(1) as (a: string, i: number) => boolean;
    expect([f('x', 0), f('x', 1), f('x', 2)]).toEqual([true, false, false]);
    expect(trustProxyParaFastify(false)).toBe(false);
    expect(trustProxyParaFastify(['10.0.0.0/8'])).toEqual(['10.0.0.0/8']);
  });
});

describe('config de captcha y aviso', () => {
  const prod = {
    NODE_ENV: 'production', DATABASE_URL: 'postgres://x@h/b?sslmode=verify-full', COGNITO_USER_POOL_ID: 'p',
    COGNITO_CLIENT_ID: 'c', COGNITO_REGION: 'r', TURNSTILE_SECRET: 's',
  };
  it('en producción exige TURNSTILE_SECRET y TURNSTILE_HOSTNAMES', () => {
    expect(() => cargarConfig({ ...prod, TURNSTILE_SECRET: '' })).toThrow(/TURNSTILE_SECRET/);
    expect(() => cargarConfig(prod)).toThrow(/TURNSTILE_HOSTNAMES/);
    expect(cargarConfig({ ...prod, TURNSTILE_HOSTNAMES: 'Sitio.com, www.sitio.com' }).turnstileHostnames).toEqual(['sitio.com', 'www.sitio.com']);
  });
  it('con NODE_ENV=test y TURNSTILE_SECRET definido no arranca', () => {
    expect(() => cargarConfig({ NODE_ENV: 'test', TURNSTILE_SECRET: 'real' })).toThrow(/TURNSTILE_SECRET/);
  });
  it('versión del aviso por omisión 2026-11-24', () => {
    expect(cargarConfig({ NODE_ENV: 'test' }).versionAviso).toBe('2026-11-24');
    expect(cargarConfig({ NODE_ENV: 'test', VERSION_AVISO_PRIVACIDAD: '2027-01-01' }).versionAviso).toBe('2027-01-01');
  });
  it('verificador: falso sin secreto o en test; real con secreto fuera de test', () => {
    const base = cargarConfig({ NODE_ENV: 'test' });
    expect(crearVerificadorCaptcha(base)).toBeInstanceOf(VerificadorCaptchaFalso);
    expect(crearVerificadorCaptcha({ ...base, entorno: 'development' })).toBeInstanceOf(VerificadorCaptchaFalso);
    expect(crearVerificadorCaptcha({ ...base, entorno: 'development', turnstileSecret: 's' })).toBeInstanceOf(VerificadorTurnstile);
  });
  it('siteverify: exige success, action "reservar" y hostname permitido', () => {
    const h = ['sitio.com'];
    expect(respuestaValida({ success: true, action: 'reservar', hostname: 'sitio.com' }, h)).toBe(true);
    expect(respuestaValida({ success: true, action: 'reservar', hostname: 'SITIO.com' }, h)).toBe(true);
    expect(respuestaValida({ success: false, action: 'reservar', hostname: 'sitio.com' }, h)).toBe(false);
    expect(respuestaValida({ success: true, action: 'login', hostname: 'sitio.com' }, h)).toBe(false);
    expect(respuestaValida({ success: true, hostname: 'sitio.com' }, h)).toBe(false);
    expect(respuestaValida({ success: true, action: 'reservar', hostname: 'otro.com' }, h)).toBe(false);
    expect(respuestaValida({ success: true, action: 'reservar' }, h)).toBe(false);
    expect(respuestaValida({ success: true, action: 'reservar', hostname: 'cualquiera' }, [])).toBe(true); // sin lista (dev)
  });
});

describe('clave del límite por IP', () => {
  it('IPv4 igual; IPv4 mapeada cuenta como IPv4; IPv6 se agrupa por /64', () => {
    expect(claveIp('203.0.113.9')).toBe('203.0.113.9');
    expect(claveIp('::ffff:203.0.113.9')).toBe('203.0.113.9');
    const a = claveIp('2001:db8:abcd:12::1');
    expect(a).toBe('2001:db8:abcd:12::/64');
    expect(claveIp('2001:db8:abcd:12:ffff:ffff:ffff:ffff')).toBe(a);
    expect(claveIp('2001:0db8:abcd:0012:0:0:0:5')).toBe(a);
    expect(claveIp('2001:db8:abcd:13::1')).not.toBe(a);
    expect(claveIp('::1')).toBe('0:0:0:0::/64');
  });
});

describe('normalización para contar contactos', () => {
  it('teléfono: dígitos, sin 502 solo si son 11 dígitos', () => {
    expect(normalizarTelefono('+502 5555-1234')).toBe('55551234');
    expect(normalizarTelefono('5555 1234')).toBe('55551234');
    expect(normalizarTelefono('502555512')).toBe('502555512'); // 9 dígitos: no se toca
    expect(normalizarTelefono('(502) 5555-1234')).toBe('55551234');
  });
  it('correo: sin +etiqueta; gmail/googlemail sin puntos', () => {
    expect(normalizarEmail('Juan.Perez+tag@Gmail.com')).toBe('juanperez@gmail.com');
    expect(normalizarEmail('j.p@googlemail.com')).toBe('jp@gmail.com');
    expect(normalizarEmail('a.b+x@otro.test')).toBe('a.b@otro.test');
  });
});
