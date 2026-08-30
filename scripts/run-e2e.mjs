import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({
  base: '/dustline-tactical16/',
  configFile: false,
  logLevel: 'error',
  root: projectRoot,
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
});

let exitCode = 1;
try {
  await server.listen();
  const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');
  const child = spawn(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
} finally {
  await server.close();
}

process.exitCode = exitCode;
