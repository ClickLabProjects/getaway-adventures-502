import { RequestMethod } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, ModulesContainer, Reflector } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { META_PUBLICO, META_ROLES } from '../src/plataforma/auth/decoradores';
import { PREFIJO_GLOBAL } from '../src/openapi';
import { crearApp } from './ayudas';
import { MATRIZ_AUTORIZACION } from './matriz-autorizacion';

const unir = (...partes: string[]) =>
  '/' + partes.flatMap((p) => p.split('/')).filter(Boolean).join('/');

describe('matriz de autorización', () => {
  it('toda ruta es @Publico() o está en la matriz con los mismos roles que @Roles', async () => {
    const app = await crearApp();
    const descubrimiento = new DiscoveryService(app.get(ModulesContainer));
    const escaner = new MetadataScanner();
    const reflector = app.get(Reflector);

    const rutas: { clave: string; publico: boolean; roles: unknown }[] = [];
    for (const w of descubrimiento.getControllers()) {
      const { instance, metatype } = w;
      if (!instance || !metatype) continue;
      const base = Reflect.getMetadata(PATH_METADATA, metatype) ?? '';
      const proto = Object.getPrototypeOf(instance);
      for (const nombre of escaner.getAllMethodNames(proto)) {
        const handler = proto[nombre];
        const metodo = Reflect.getMetadata(METHOD_METADATA, handler);
        if (metodo === undefined) continue;
        const ruta = Reflect.getMetadata(PATH_METADATA, handler) ?? '';
        const objetivos = [handler, metatype];
        rutas.push({
          clave: `${RequestMethod[metodo]} ${unir(PREFIJO_GLOBAL, String(base), String(ruta))}`,
          publico: !!reflector.getAllAndOverride(META_PUBLICO, objetivos),
          roles: reflector.getAllAndOverride(META_ROLES, objetivos),
        });
      }
    }
    await app.close();

    expect(rutas.length).toBeGreaterThan(0);
    const sinDeclarar = rutas.filter((r) => !r.publico && !(r.clave in MATRIZ_AUTORIZACION)).map((r) => r.clave);
    expect(sinDeclarar, `Rutas sin @Publico() ni entrada en la matriz: ${sinDeclarar.join(', ')}`).toEqual([]);

    for (const r of rutas.filter((x) => !x.publico)) {
      expect(r.roles, `@Roles de ${r.clave} no coincide con la matriz`).toEqual(MATRIZ_AUTORIZACION[r.clave]);
    }
    const existentes = new Set(rutas.map((r) => r.clave));
    const huerfanas = Object.keys(MATRIZ_AUTORIZACION).filter((k) => !existentes.has(k));
    expect(huerfanas, 'Entradas de la matriz sin ruta real').toEqual([]);
  });
});
