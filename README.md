# Mesa do Mês

Aplicação Angular para escolher quem define o jogo da vez de um clube — e para guardar o
que o clube jogou. Hospedada de graça no GitHub Pages, com Firestore no plano gratuito.

**Este README é o contrato de trabalho do repositório.** Ele vale para quem escreve o
código e, principalmente, para a AI que escreve código aqui. Quem abrir este projeto num
assistente — Claude Code, Codex, Gemini CLI, Cursor, o que for — tem que fazer o
assistente ler este arquivo antes de tocar em qualquer linha.

---

## Como a AI deve se comportar aqui

### 1. Todo trabalho de front-end passa pela skill `impeccable`. Sem exceção.

Não existe "é só um ajuste de CSS". Trocar um espaçamento, mudar uma cor, mexer numa
animação, corrigir um bug visual, adicionar um estado vazio — **tudo** entra pela skill:

```
/impeccable <comando> <alvo>
```

E entra **por inteiro**, não pela metade:

1. `node .claude/skills/impeccable/scripts/context.mjs --target <arquivo>` uma vez por
   sessão. Ele carrega `PRODUCT.md`, `DESIGN.md` e o briefing da superfície. Siga as
   diretivas que ele devolve.
2. Carregue o **playbook do comando** (`optimize` para performance, `polish` para
   acabamento, `animate` para movimento, `critique`/`audit` para avaliar, e assim por
   diante). Se dois comandos servem, pergunte uma vez e escolha.
3. Carregue `reference/craft-floor.md` **imediatamente antes** de editar UI.
4. Construa. O hook do detector roda sozinho depois de editar arquivo de UI — trate os
   achados dele como parte do trabalho, não como aviso.
5. **Verifique em rodadas fechadas**, não em loop: construa inteiro, inspecione uma vez
   com desktop e celular juntos, corrija tudo num lote, confirme com no máximo mais uma
   rodada, e pare. Auto-QA infinito queima dinheiro do usuário.
6. **Atualize o `DESIGN.md`** quando a mudança criar ou alterar uma regra do sistema
   visual. Um comportamento novo que não está no DESIGN.md volta a ser quebrado no mês
   seguinte por quem não sabia dele.

O que **não** é aceitável: editar `.scss`, `.html` de componente ou desenho em canvas/SVG
sem passar por isso, "porque era simples". As decisões visuais deste projeto são
justificadas e medidas; uma mudança avulsa desfaz justificativa que custou trabalho.

### 2. Toda mudança de back-end é testada até não sobrar dúvida.

Back-end aqui é `group-log.ts` (o replay), `group-store.ts` (a camada Firestore),
`usage-guard.ts` (o orçamento), `naming.ts`, `palette.ts` e `firestore.rules`.

Regras:

- **Rode a suíte inteira, não a parte que você mexeu.** As sete estão listadas abaixo.
- **Todo bug corrigido ganha um teste que falha sem a correção.** Se você não consegue
  escrever esse teste, você ainda não entendeu o bug.
- **Nada de teste contra a produção.** O emulador existe para isso, e as suítes de rules e
  de integração sobem o próprio.
- **Um teste que erra é para consertar o teste, não o código** — e para dizer isso em voz
  alta, com o motivo.
- **Campo novo em evento entra opcional na rule.** Uma aba aberta no minuto do deploy não
  manda a chave nova, e recusá-la quebra quem está com o app na tela.
- Mexeu em `firestore.rules`? **As rules vão ao ar antes do site.** Na ordem inversa, todo
  mundo recebe uma interface cujas escritas o servidor recusa.

### 3. Meça. Não presuma.

Este projeto tem histórico de decisão medida: o contraste da paleta é calculado, as camadas
do SVG foram lidas do DOM, o alcance das cápsulas saiu da geometria, e o custo do confete
foi cronometrado num Chrome de verdade antes e depois da correção (`148ms` → `8.3ms` por
quadro). Quando você afirmar que algo ficou mais rápido, mais legível ou mais acessível,
**mostre o número**.

### 4. Escreva em português.

O produto, o código, os comentários, os nomes de teste e as mensagens de commit. Não
traduza o que já existe sem motivo, e não introduza inglês novo.

### 5. Comentário explica *por quê*, nunca *o quê*.

O bom comentário deste repositório cita o bug que a linha evita:

```ts
// Uma aba em segundo plano devolve saltos enormes; travar o passo evita que as
// partículas atravessem a tela inteira num quadro só quando ela volta.
const delta = Math.min((now - previous) / 1000, 0.05);
```

Comentário que repete o código é lixo — apague em vez de manter.

### 6. Entregue inteiro.

Código **+** testes **+** documentação **+** o que for preciso para publicar. Não peça
permissão para terminar o que já foi pedido, e não entregue metade dizendo que o resto é
fácil. Se alguma parte ficou de fora, diga **qual** e **por quê** — encolher o escopo é
decisão de quem pediu, não de quem faz.

### 7. As invariantes que ninguém quebra

Quebrar qualquer uma delas reescreve o passado de gente que está usando o app agora.

1. **O log é append-only e é a verdade.** Nenhum estado derivado é gravado. Um campo de
   vencedor gravável seria um vencedor forjável — já foi um buraco de segurança real aqui.
   Tudo sai de `replay()`, em [`group-log.ts`](src/app/group-log.ts).
2. **A única entrada imprevisível de um giro é o `request.time` do servidor.** O cliente
   não a escolhe. É isso que impede quem tem o link de escrever a si mesmo um resultado.
3. **A normalização de nomes ([`naming.ts`](src/app/naming.ts)) é congelada, com asperezas.**
   `josé silva` e `jose silva` são pessoas diferentes. Ela decide o `memberId`.
4. **A ordem de `CAPSULE_COLORS` ([`palette.ts`](src/app/palette.ts)) é congelada.** A cor
   de cada pessoa vive no log como **índice**. A paleta só cresce pelo fim, e `STRIDE` tem
   que continuar primo com o tamanho dela.
5. **Toda cor de cápsula alcança 4.5:1 com a tinta que ela escolhe.**
6. **`prefers-reduced-motion` é honrado em CSS *e* em JS.** Desligar só o CSS deixa a
   página parada esperando um timer de 4,3s.
7. **Nunca habilite faturamento no Firebase.** O projeto vive no plano Spark de propósito:
   sem conta de cobrança o Google não pode cobrar. Não há Cloud Functions nem Storage.

O detalhe de cada uma está em [HANDOFF.md](HANDOFF.md); as armadilhas que já custaram tempo
a alguém, também. **Leia antes de mexer.**

### 8. Antes de dizer que terminou

```bash
npm test -- --watch=false   # 316 unitários e de componente
npm run test:rules          # 108 rules no emulador
npm run test:store          # 45 integrações da camada de dados
npm run test:migration      # 13 verificações da migração de histórico
npm run test:a11y           # 12 telas x 3 larguras, 0 achados
npm run test:etiqueta       # 80 verificações de ponta a ponta num navegador real
node tests/e2e-flows.mjs "http://localhost:4200/?emu=1"   # 13 fluxos
npm run build -- --base-href=./
```

Verde nas sete, ou o motivo escrito de por que uma não roda nesta máquina. As contagens
acima são as desta última rodada: se a sua baixar, você apagou um teste sem querer.

As duas suítes de navegador (`test:a11y`, `test:etiqueta`, e os fluxos) precisam do emulador
**e** do `ng serve` de pé, com o grupo `demo` semeado — e o e2e da etiqueta escreve nele, então
**reseme antes de cada rodada** ou a segunda execução falha em cima do que a primeira gravou.

---

## O produto, em uma tela

Um **grupo é um link**. Quem tem o link entra, gira, mexe na lista e escreve as resenhas;
não há conta, senha nem convite. Antes de qualquer coisa o app pergunta **quem é você** — o
nome fica só no seu aparelho e acompanha tudo que você fizer no registro do grupo.

Cada pessoa é uma **cápsula**, com uma cor escolhida numa roda de 24 e um emoji que sai
como confete quando ela é sorteada. Uma rodada termina quando todos saíram; a próxima abre
com o globo cheio de novo.

O vencedor **não é lido de um campo**: ele é derivado de um log de eventos que ninguém pode
reescrever nem apagar, e a única entrada imprevisível é o carimbo de hora do servidor, que
o cliente não escolhe. Abrir a página encena a entrega de novo, e clicar no globo a encena
outra vez — sempre parando na mesma cápsula, porque encenar não é decidir.

> Não foi criado para loterias, premiações financeiras ou contextos que exijam
> aleatoriedade criptográfica auditada.

### Rotas

| Rota | O que é |
|---|---|
| `/` | A prateleira: as máquinas que este aparelho já abriu |
| `#/novo` | A oficina: montar uma máquina nova |
| `#/g/<id>` | A máquina de um grupo, com o registro dos giros |
| `#/g/<id>/album` | O álbum: a parede de todas as cápsulas que já saíram |

O modo por link estático — o sorteio mensal que vivia dentro do próprio endereço
(`#grupo=...&inicio=...`) — **foi removido em setembro de 2026**. Links daquele formato
caem na prateleira inicial.

### O jogo, a resenha e a mesa

Qualquer giro — o de agora ou o de um ano atrás — recebe o **jogo** que o clube jogou (nome e
descrição, de todo mundo), uma **resenha por pessoa** (nota final e completude obrigatórias;
tempo de jogo, quatro escalas, dificuldade e texto livre se ela quiser) e uma correção de
**mesa**: quem de fato jogou aquilo. Quem marca **platinado** recebe mais duas perguntas, só
dela: a diversão da platina e a dificuldade de platinar. As duas ficam fora do resumo do
cartão do álbum e aparecem, em média, na ficha do jogo. Onde só cabe uma linha, o jogo vira
`Overcooked 2 · 9,2` — o título mais a nota do clube, que é derivada das resenhas e nunca
gravada em campo nenhum.

Editar é gravar outro evento: o replay faz o último valer, e os anteriores continuam no
registro com quem escreveu cada um. Nenhum dos três altera o vencedor, e **corrigir a mesa
não alcança o globo daquele giro** — ele é imutável porque é dele que a cápsula saiu.

---

## Os quatro documentos

Nenhum deles é opcional antes de uma mudança de peso.

| Arquivo | O que responde |
|---|---|
| [PRODUCT.md](PRODUCT.md) | O quê e por quê: usuários, propósito, o que é contrato |
| [DESIGN.md](DESIGN.md) | O sistema visual: tokens, superfícies, movimento, as regras nomeadas |
| [FIREBASE.md](FIREBASE.md) | O modelo de dados, as rules e o custo por operação |
| [HANDOFF.md](HANDOFF.md) | O estado atual, as invariantes e as armadilhas já pagas |

---

## Executar localmente

Requisitos: Node.js 22.12 ou superior.

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

Para trabalhar contra o emulador em vez da produção, suba o emulador, semeie um grupo e
abra com `?emu=1`:

```bash
npx firebase emulators:start --only firestore,auth --project sorteador-ed1c9
npm run build:testjs && node tests/seed-emulator.mjs
# http://localhost:4200/?emu=1#/g/demo
```

As suítes que precisam de emulador (`test:rules`, `test:store`, `test:migration`) sobem o
seu próprio e **liberam as portas antes** — o que derruba o emulador de desenvolvimento que
estiver rodando. As que dirigem um navegador (`test:a11y`, `test:etiqueta`) esperam o
`npm start` e o emulador já de pé.

O build estático fica em `dist/sorteador/browser`.

## Publicar no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica
automaticamente os commits enviados à branch `main`. No GitHub, **Settings → Pages → Build
and deployment** precisa estar em **GitHub Actions**.

O workflow roda `npm test` antes de construir: um push com teste vermelho não publica.
As outras seis suítes pedem emulador ou navegador de pé e continuam sendo responsabilidade
de quem entrega — rode as sete antes de dar o push.

**As rules vão antes do site:**

```bash
npx firebase deploy --only firestore:rules --project sorteador-ed1c9
git push origin main   # o workflow publica o site
```

## O que fica no seu aparelho

- **Seu nome**, que assina o que você faz no registro. Não é uma conta e não tem senha.
- **As máquinas que você abriu**, para voltar a elas sem procurar o link. A lista não dá
  acesso a nada: quem abre uma máquina é o link.
- **Uma cópia do log** de cada grupo, para que abrir custe 1 leitura em vez de N.

Nada disso sai do aparelho por outro caminho, e o servidor não sabe que essas listas
existem.
