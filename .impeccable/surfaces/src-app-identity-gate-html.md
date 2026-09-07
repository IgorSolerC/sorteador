---
version: 1
slug: "src-app-identity-gate-html"
primary_target: "src/app/identity-gate.html"
related_targets: ["src/app/identity-gate.ts","src/styles.scss"]
---

## Scope and mode

A porta (`src/app/identity-gate.html`), a primeira tela do produto e a única que não pode ser
pulada. Visitor mode: Operate.

## Audience, job, action, and constraints

Quem abre o link de um clube de jogos, com ou sem crachá neste aparelho. A tarefa é dizer
quem é — porque tudo que se faz depois fica assinado num registro que o clube relê meses
adiante — e, quando o globo já a conhece, mexer na própria cápsula: a cor e o emoji que a
identificam no globo, no registro e no álbum inteiro.

Restrições: a porta é desenhada **antes** de qualquer rede, e cota estourada, grupo
inexistente ou rede caída não podem trancar a entrada. O Firebase entra por importação
dinâmica (`ROSTER_LOOKUP` para ler, `CAPSULE_PAINT` para gravar), porque a prateleira e a
oficina carregam esta tela sem ter lista nenhuma a oferecer e não podem pagar 550KB de SDK
por causa dela. Teclado, contraste medido, alvos de 44px e movimento reduzido valem aqui como
em todo o resto.

## Chosen direction and memorable moment

Esmalte azul-noite com a cápsula em 340px à esquerda e a pergunta em display à direita — a
mesma assimetria do palco da máquina. O momento é a cápsula: ela se monta letra a letra
enquanto a pessoa digita e, **quando o globo reconhece o crachá, para de ser um ensaio** e
passa a ser a dela, com a cor que ela escolheu e o emoji dentro da cúpula. Reconhecida, a
porta também repinta: a bancada de papel toma o lugar da coluna da direita, e a peça de 340px
— a maior aparição da cápsula em todo o produto — é a prévia ao vivo da escolha.

Três faces, nunca três camadas: a pergunta, a bancada, e o campo de texto que a pergunta
abre. `Esc` volta uma face por vez; a porta nunca recebe um modal por cima de si mesma.

## Unresolved decision

- A bancada só existe para quem o globo reconhece pelo crachá. Quem entra pela primeira vez
  precisa entrar, reabrir a porta pelo crachá e então repintar — a alternativa (oferecer a
  pintura junto do primeiro "quem é você") transformaria a primeira visita num painel, e ela
  é uma pergunta só de propósito.
- `roster` chega depois da rede, então a linha "Sua cápsula neste clube" nasce alguns
  instantes depois do resto. É o mesmo comportamento da fileira de cápsulas, e pelo mesmo
  motivo: a porta não espera.
