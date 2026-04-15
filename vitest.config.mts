import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    // node-libcurl-ja3's native binding is not safe under vitest's default
    // worker_threads pool — its V8 HandleScope assumptions break on teardown.
    // Forks run each test file in a child process, which keeps libcurl happy.
    pool: 'forks',
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
