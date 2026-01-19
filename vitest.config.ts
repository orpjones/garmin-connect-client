import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import * as path from 'path';

// Load .env file from project root
config({ path: path.resolve(__dirname, '.env') });

const isDebug =
  process.execArgv.some(arg => arg.startsWith('--inspect')) ||
  process.env.VITEST_VSCODE === 'true' ||
  process.env.VITEST_DEBUG === '1';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    testTimeout: isDebug ? 0 : 30000,
    hookTimeout: isDebug ? 0 : 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*', '**/types.ts'],
    },
  },
});
