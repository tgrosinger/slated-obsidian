import svelte from 'rollup-plugin-svelte';
import autoPreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import { resolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default',
  },
  external: ['obsidian'],
  plugins: [
    svelte({
      preprocess: autoPreprocess(),
    }),
    typescript({ sourceMap: env.env === 'DEV' }),
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    commonjs({
      include: 'node_modules/**',
    }),
  ],
};
