import { execSync } from 'node:child_process';

// Uma execução interrompida deixa o emulador segurando a porta, e a próxima falha com
// "port taken". Este passo limpa antes de começar, para o teste não depender de sorte.
const PORTS = [8080, 9099, 4400, 4500];

for (const port of PORTS) {
  try {
    const out = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    const pids = new Set(
      out.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter((p) => p && p !== '0'),
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
        console.log(`porta ${port}: processo ${pid} encerrado`);
      } catch {
        // Já morreu ou não é nosso.
      }
    }
  } catch {
    // Nada escutando nessa porta.
  }
}
