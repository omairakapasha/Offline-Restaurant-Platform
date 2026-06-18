import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@workspace/db': path.resolve(__dirname, '../../lib/db/src/index.ts'),
    },
    extensions: ['.ts', '.js', '.tsx', '.jsx', '.json'],
  },
});
