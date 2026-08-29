import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// O tsc emite `from './group-log'` sem extensão, que o Node em modo ESM não resolve.
// Este passo roda depois da compilação e devolve o `.js` que o Node exige.
const dir = 'tmpjs/src/app';
for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const path = join(dir, file);
  const fixed = readFileSync(path, 'utf8').replace(
    /from '(\.\/[^']+?)'/g,
    (match, spec) => (spec.endsWith('.js') ? match : `from '${spec}.js'`),
  );
  writeFileSync(path, fixed);
}
console.log('imports ESM ajustados');
