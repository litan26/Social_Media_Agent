import { spawn } from 'node:child_process';

let shuttingDown = false;
const npmCommand = 'npm';
const useShell = process.platform === 'win32';

const processes = [
  ['backend', ['--prefix', 'ai-social-platform-backend', 'run', 'dev']],
  ['frontend', ['--prefix', 'ai-social-platform-frontend', 'run', 'dev']],
].map(([name, args]) => {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: useShell,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`[${name}] exited${signal ? ` by ${signal}` : ` with code ${code}`}`);
    stopAll(code ?? 1);
  });

  return child;
});

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) child.kill('SIGTERM');
  }

  setTimeout(() => process.exit(exitCode), 300);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
