import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'packages'),
    },
    extensions: ['.js', '.json', '.ts'],
  },
  plugins: [
    vue(),
    dts({
      outputDir: 'dist/es',
      tsConfigFilePath: './tsconfig.json',
    }),
    dts({
      outputDir: 'dist/lib',
      tsConfigFilePath: './tsconfig.json',
    }),
  ],
  build: {
    outDir: 'dist/es',
    lib: {
      entry: resolve(__dirname, 'packages/index.ts'),
      name: 'VueGridLayout',
      fileName: 'VueGridLayout',
    },
    rollupOptions: {
      input: ['packages/index.ts'],
      output: [
        {
          format: 'es',
          dir: 'dist/es',
          entryFileNames: '[name].js',
          exports: 'named',
          preserveModules: true,
        },
        {
          format: 'cjs',
          dir: 'dist/lib',
          entryFileNames: '[name].js',
          exports: 'named',
          preserveModules: true,
        },
      ],
      external: ['vue'],
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    reportCompressedSize: false,
    sourcemap: false,
  },
});
