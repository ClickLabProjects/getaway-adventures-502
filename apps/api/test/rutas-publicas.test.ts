import { RequestMethod } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, ModulesContainer, Reflector } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { expect, it } from 'vitest';
import { META_PUBLICO } from '../src/plataforma/auth/decoradores';
import { PREFIJO_GLOBAL } from '../src/openapi';
import { crearApp } from './ayudas';
import { RUTAS_PUBLICAS } from './matriz-autorizacion';

it('las rutas públicas declaradas existen y son @Publico(), y no hay otras (salvo /salud)', async () => {
  const app = await crearApp();
  const reflector = app.get(Reflector);
  const escaner = new MetadataScanner();
  const publicas: string[] = [];
  for (const { instance, metatype } of new DiscoveryService(app.get(ModulesContainer)).getControllers()) {
    if (!instance || !metatype) continue;
    const base = String(Reflect.getMetadata(PATH_METADATA, metatype) ?? '');
    const proto = Object.getPrototypeOf(instance);
    for (const nombre of escaner.getAllMethodNames(proto)) {
      const handler = proto[nombre];
      const metodo = Reflect.getMetadata(METHOD_METADATA, handler);
      if (metodo === undefined) continue;
      if (!reflector.getAllAndOverride(META_PUBLICO, [handler, metatype])) continue;
      const ruta = String(Reflect.getMetadata(PATH_METADATA, handler) ?? '');
      publicas.push(`${RequestMethod[metodo]} /${[PREFIJO_GLOBAL, base, ruta].flatMap((p) => p.split('/')).filter(Boolean).join('/')}`);
    }
  }
  await app.close();
  expect(publicas.filter((r) => !r.endsWith('/salud')).sort()).toEqual([...RUTAS_PUBLICAS].sort());
});
