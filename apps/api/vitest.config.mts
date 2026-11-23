import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC es necesario para que Nest reciba la metadata de decoradores (emitDecoratorMetadata).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
});
