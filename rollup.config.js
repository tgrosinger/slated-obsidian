import svelte from 'rollup-plugin-svelte';
import autoPreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
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
      emitCss: false,
      preprocess: autoPreprocess(),
    }),
    typescript({ sourceMap: true }),
    nodeResolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    commonjs({
      include: 'node_modules/**',
    }),
  ],
};
