# Melhorias de UX — auditoria contínua

**Branch:** `feat/emote-joinha-negativo-e-plano-ux` · **Aberto em:** 2026-09-07

Este arquivo é o resultado de uma auditoria de UX conduzida pela skill `impeccable` sobre o
produto inteiro. Ele é **plano, não implementação**: nada aqui foi aplicado ao código, exceto
os itens explicitamente marcados `✅ FEITO`.

Cada achado tem:

- **Onde** — arquivo e linha, clicáveis.
- **O que** — o defeito ou a oportunidade, em uma frase.
- **Por quê** — o custo para quem usa, não a preferência de quem audita.
- **Proposta** — o que fazer.
- **Peso** — `P0` quebra alguém hoje · `P1` custa tarefa · `P2` custa acabamento · `P3` ideia.
- **Custo** — `XS` minutos · `S` uma sessão · `M` um dia · `L` mais que isso.

> **Regra desta auditoria:** achado sem número medido é hipótese, e vai marcado como tal.

---

## Resumo: o que fazer primeiro

**86 entradas numeradas:** 68 achados com peso — **3 `P0`**, 21 `P1`, 25 `P2`, 19 `P3` — e
18 registros sem peso, que são decisões certas anotadas para não serem desfeitas por engano
(o mapa do foco, as superfícies do navegador, as duas barras medidas, a Regra da Platina).

**Nove achados e as sete derivas de documentação foram corrigidos nesta branch**, mais o emote pedido. O critério para corrigir
em vez de só apontar foi estreito: medido, de uma ou duas linhas, sem decisão de produto no
meio, e com as nove suítes verdes depois. Todo o resto é plano.

### Já feito nesta branch

| | O quê | Prova |
|---|---|---|
| ✅ | 👎 `Discordo`, a décima reação | 5 suítes atualizadas; a grade móvel passou a fechar 5+5 |
| ✅ | **A-01** a saída da porta em 2,74:1 | → **12,96:1**; `test:a11y` de 3 achados para **0** |
| ✅ | **T-09** metade da paleta tornava a seleção ilegível | pior caso **1,08:1** → **4,61:1** |
| ✅ | **T-17** o botão de girar não existia em alto contraste | varredura de 8 telas, de 12 peças invisíveis para **0** |
| ✅ | **T-25** a gaveta nunca recebia o foco | teste que falha sem a correção; 404/404 |
| ✅ | **M-02** o Tab terminava num botão invisível | 17 paradas → **16** |
| ✅ | **F-01** a mesma pessoa com duas cores na mesma ficha | Davi tangerina→pinho; 3 testes novos |
| ✅ | **T-32** o globo desenrolava 7 voltas para trás com rede lenta | medido a 1500ms: `rotate(0deg)` → fica parado |
| ✅ | **L-06** a cápsula sem jogo escrito também lacrava | o pôster e o recado já acertavam; a parede e a ficha, não |
| ✅ | **iniciais quebradas** em nome com emoji | `🎮 Ana` dava `\uD83CA` — meio par substituto — no crachá, no aro e no PNG |
| ✅ | **D-01 a D-07** as sete derivas de documentação | ver a seção 4: cada uma com o que dizia e o que passou a dizer |

### O que eu faria a seguir, nesta ordem

| Ordem | Achado | Por quê primeiro |
|---|---|---|
| 1 | **T-22** mensagens do Firebase em inglês na tela | `P0`. `Failed to get document because the client is offline` está na tela hoje, no caso mais comum de todos |
| 2 | **T-11** `Grupo não encontrado` em toda falha | mesma função do T-22, e o título mente em três das quatro causas |
| 3 | **F-02** o rascunho da resenha some no clique fora | `P1`, e é a perda de trabalho de quem mais colabora |
| 4 | **F-03** `Retirar o jogo` sem confirmação | `P1`, destrutivo, coletivo e a um clique |
| 5 | **T-49** a cena de materiais custa 4,9 MB e 29,6 s | `P1` medido, cobrado na tela principal e em toda primeira visita; a correção não decide nada de produto |
| 5 | **M-01** ninguém vê o giro de quem girou | `P1`, é o momento social do produto — e a conta cabe: 9 leituras numa noite, 0,6% do orçamento |
| 6 | **T-12** o aparelho parado esconde o log que tem no bolso | `P1`, e o cache já existe e já é validado |
| 7 | **T-44** quem entra pelo link não entra no globo | `P1`, e é a raiz do G-01: hoje quem digita os nomes é outra pessoa |
| 8 | **G-01** a segunda "Ana" criada em silêncio | `P1` sem conserto depois; o único achado cujo estrago é permanente |
| 9 | **T-16c** `Compartilhar` a 2.935px do topo da gaveta | `P1` medido, e o link **é** o produto |
| 10 | **T-07** a cena de 4,3 s sem saída | `P1`, cobrada em toda visita, todo dia |
| 11 | **T-02 / T-03** a rede caída mente e depois cala | `P1`, e os dois são a mesma sessão de trabalho |
| 12 | **L-01** o álbum começa 1,4 tela abaixo da parede | `P1` medido nos dois tamanhos |
| 13 | **R-01** duas pessoas com a mesma cor | `P1`, e a decisão de produto acima de 24 pessoas é sua |
| 14 | **P-01 / T-04** esquecer uma máquina sem desfazer | `P1` + a infraestrutura de desfazer serve a três achados |
| 15 | **T-18** ensinar a suíte de a11y a ver o que ela não vê | `P2`, mas é o que impede a volta de A-01, T-09, T-17 e M-02 |

### As quatro decisões que são suas, e não minhas

1. **`👍` volta?** Hoje dá para discordar e não dá para concordar com um toque. Ver a seção 1.
2. **O que a cor significa acima de 24 pessoas?** `MAX_MEMBERS` é 60 e a paleta tem 24. Num
   clube de 40 semeado para medir, **32 das 40 pessoas** dividem a cápsula com alguém.
3. **Rascunho de resenha guardado no aparelho?** Resolve F-02 de vez, e guarda texto de
   resenha no `localStorage`. É produto, não acabamento.
4. **A conta de quem é o durão** (I-03) é conversa de clube ou é placar? O produto já
   recusou um placar uma vez, de propósito.

---

---

## Índice

1. [O emote de joinha negativo (implementado)](#1-o-emote-de-joinha-negativo-implementado)
2. [Achados por superfície](#2-achados-por-superficie) — a prateleira, a porta, a máquina, a
   ficha, o álbum, a oficina, a gaveta e o pôster
3. [Achados transversais](#3-achados-transversais) — rede, cota, cores forçadas, foco, texto,
   desempenho e o clube de 40 pessoas
4. [Deriva de documentação](#4-deriva-de-documentacao)
5. [Ideias de produto](#5-ideias-de-produto)
6. [A crítica formal da máquina](#6-a-critica-formal-da-maquina-playbook-critique) — heurísticas de Nielsen, carga cognitiva e jornada

### Como esta auditoria foi feita

Pela skill `impeccable`, começando por `context.mjs` (que carrega `PRODUCT.md`, `DESIGN.md` e
os briefings de superfície) e pelos playbooks de `critique`, `audit`, `clarify`, `adapt`,
`optimize`, `harden`, `distill` e `polish`.

O que **não** foi por leitura: montei um arnês de medição sobre o mesmo transporte CDP que as
suítes do projeto usam (`tests/shot.mjs`) e rodei sondas num Chrome de verdade contra o
emulador — ordem de tabulação, contraste calculado, alturas de bloco, cores computadas, cores
forçadas, movimento reduzido, rede desligada, cota estourada, tempo até o vencedor aparecer,
e um grupo de 40 pessoas semeado só para ver o que quebra na escala que o produto permite.

Onde não consegui medir, o achado diz **"prova que falta"** e o que mediria.

---

## 1. O emote de joinha negativo (implementado)

**Status:** ✅ FEITO nesta branch.

### O que foi feito

`👎` entrou como a **décima escolha** oferecida na fileira de reações, com o rótulo
acessível **`Discordo`**.

| Arquivo | Mudança |
|---|---|
| [group-log.ts:141](src/app/group-log.ts#L141) | `REVIEW_REACTIONS` passa de 12 para 13 valores; `👎` entra **pelo fim** |
| [group-log.ts:800](src/app/group-log.ts#L800) | `REACTION_LABELS['👎'] = 'Discordo'` |
| [firestore.rules:232](firestore.rules#L232) | a lista fechada da rule aceita `👎` |
| [styles.scss:348](src/styles.scss#L348) | comentários de 9 → 10 escolhas; a fileira móvel agora fecha 5 + 5 |
| `DESIGN.md`, `PRODUCT.md`, `README.md`, `FIREBASE.md`, `HANDOFF.md` | contagem, lista e a regra nova de ordenação |
| 5 suítes | `group-log.spec`, `game-sheet.spec`, `firestore-rules.test`, `e2e-etiqueta`, `e2e-acabamento` |

### As três decisões, e o porquê de cada uma

**1. Entra pelo fim, não no meio.** A fileira é onde o dedo procura. Encaixar `👎` ao lado
de `❤️` moveria nove alvos que as pessoas já sabiam onde ficavam. É a mesma lógica da
paleta de cápsulas, que só cresce pelo fim — só que aqui o motivo é motor, não de dados.

**2. O rótulo é `Discordo`, não `Não curti`.** A reação é a uma **resenha**, não ao jogo.
"Não curti" leria como "não curti o jogo" e duplicaria a nota que a pessoa já dá no boletim.
Discordar de uma opinião não tinha símbolo nenhum antes: `🤔` é dúvida e `💀` é piada.

**3. Fecha a grade móvel — de graça.** A `A Regra da Grade que Fecha` do `DESIGN.md` diz que
o número de colunas divide o número de itens. Com nove escolhas, o celular fazia 5 + 4 e a
segunda fileira precisava ser **centrada** para a sobra não ler como engano. Com dez, são
**5 + 5**: as duas fileiras fecham. A décima escolha corrigiu um defeito de grade que existia
desde que a fileira virou popover.

### Medido

| Suíte | Antes | Depois |
|---|---|---|
| `npm test` | 399 | **400** (o teste novo do `👎`) |
| `npm run test:rules` | 118 | **118** (o `it` dos emoji ganhou a 13ª iteração) |
| `npm run test:store` | 48 | **48** |
| `npm run test:migration` | 13 | **13** |
| `npm run test:a11y` | **3 achados** (ver A-01) | **0 achados** |
| Largura do popover no desktop | 440px | 484px (`10 × 44 + 9 × 4 + 8`) — cabe em 620px |

### A rodada inteira, verde

Todas as nove verificações do [README](README.md#8-antes-de-dizer-que-terminou), nesta
máquina, com emulador (`firestore,auth`) e `ng serve` de pé e o grupo `demo` resemeado antes
de cada suíte de navegador:

| Suíte | Antes | Depois de tudo desta branch |
|---|---|---|
| `npm test -- --watch=false` | 399 | **409/409** (+10 testes novos) |
| `npm run test:rules` | 118 | **118/118** |
| `npm run test:store` | 48 | **48/48** |
| `npm run test:migration` | 13 | **13/13** |
| `npm run test:a11y` | **3 achados** | **0 achados** |
| `npm run test:etiqueta` | 86 | **86/86** |
| `node tests/e2e-flows.mjs` | 21 | **21/21** |
| `node tests/e2e-roleta.mjs` | 14 | **14/14** |
| `node tests/e2e-acabamento.mjs` | 59 | **59/59** |
| `npm run build -- --base-href=./` | ok | **ok**, 4,77s |

Os dez testes novos: o `👎` no replay e a fileira de dez, as três cores de quem resenhou, o
foco da gaveta, os três da mesma pessoa com dois crachás (T-38) e os dois da cápsula sem
jogo que não lacra (L-06). **Cinco deles falham sem a correção** — conferido tirando a linha
e rodando.

> Uma armadilha nova para o HANDOFF: `test:migration` deixou para trás um **emulador Firestore
> zumbi** — o hub morreu, o processo `java` do emulador não. Ele ficou segurando a porta 8080
> com `--project_id migracao-teste`, e as suítes de navegador falhavam com "a máquina carrega
> o grupo → FAIL" sem que nada no app estivesse errado. `Stop-Process` no `java.exe` da porta
> 8080 resolve. Ver T-01.

### ⚠ Uma coisa que precisa da sua decisão

**`👍` continua aposentado e `👎` entra.** A interface passa a oferecer o polegar para
baixo sem oferecer o para cima. Isso não é acidente do código — `👍` foi aposentado de
propósito em 2026-09-07 — mas é uma **assimetria que quem usa vai notar**: dá para discordar
com um toque e não dá para concordar com um. Três saídas:

1. **Deixar assim.** `❤️`, `🔥` e `👏` já são a concordância; `👍` era o mais apagado dos três
   e por isso saiu. Discordar é que não tinha nada. *(É o que está implementado.)*
2. **Trazer `👍` de volta** e ter o par completo. Custa `XS` (tirar do filtro em
   [review-reactions.ts:69](src/app/review-reactions.ts#L69)) — mas volta a onze escolhas, e
   onze não fecha grade nenhuma: o celular voltaria a 5 + 5 + 1, com um órfão sozinho.
3. **Trazer `👍` e aposentar outro** para ficar em dez. `🤯` ("Explodiu a cabeça") e `😯`
   ("Surpresa") dizem quase a mesma coisa.

**Recomendação: (1).** A opção 2 quebra a Regra da Grade que Fecha, e o problema que o clube
tem hoje não é falta de jeito de elogiar.

### ⚠ Antes de publicar

`firestore.rules` mudou. **As rules vão ao ar ANTES do site** — na ordem inversa, todo mundo
recebe uma interface cujo `👎` o servidor recusa:

```bash
npx firebase deploy --only firestore:rules --project sorteador-ed1c9
git push origin main
```

---

## 2. Achados por superfície

### 2.1 A prateleira (`/`) — [home.html](src/app/home.html)

#### P-01 · Esquecer uma máquina é irreversível e não avisa nem desfaz `P1` `S`

**Onde:** [home.html:64](src/app/home.html#L64) · [home.ts:57](src/app/home.ts#L57) ·
[recent-groups.ts:27](src/app/recent-groups.ts#L27)

**O que:** o `X` de cada linha chama `forgetGroup()` na hora, sem confirmação e sem desfazer.
Ele fica **dentro do mesmo `<li>` da linha inteira**, encostado nela — 44px de alvo a
`.35rem` da borda direita de um alvo de 64px que ocupa o resto.

**Por quê:** o `PRODUCT.md` diz que "o link é a credencial" e que a prateleira "não dá acesso
a nada". As duas coisas são verdade e, juntas, fazem deste o gesto mais caro do produto: a
prateleira é o **único ponteiro** que este aparelho tem para uma máquina. Quem esquecer uma
máquina cujo link se perdeu numa conversa de dois meses atrás perdeu o grupo — não há
recuperação por e-mail, não há conta, não há listagem no servidor (é proibida nas rules de
propósito). Um toque errado no celular custa um clube.

E o `DESIGN.md` já tem a regra que isso viola: *"Do escrever a consequência de um gesto
irreversível"*. Girar — que grava mas não apaga nada — pede confirmação; esquecer, que
apaga o caminho de volta, não pede nada.

**Proposta (a mais barata que resolve):** manter o clique direto e devolver um **desfazer**
pelo aviso que o produto já tem. `Notice` ([notice.ts](src/app/notice.ts)) já é o rodapé de
confirmação da máquina e do álbum, já tem relógio único e já morre com a tela.

- `Tirei Clube da Firma da lista.` + a ação `Desfazer`, por `NOTICE_MS` (5,5s).
- `forgetGroup` devolve o registro removido; desfazer é `rememberGroup(id, name)` com o `at`
  original — a lista volta na posição em que estava, e não no topo.
- Requer dar ao `Notice` uma ação opcional. Hoje ele é só texto. É a mudança de peso aqui,
  e ela serve a outros três lugares (ver T-04).

**Alternativa mais barata ainda (`XS`):** exigir um segundo toque — o `X` vira `Tirar?` por
3 segundos antes de valer. Custa um sinal e nenhuma infraestrutura, mas é pior: um confirmar
que não explica não é melhor do que um desfazer que não interrompe.

---

#### P-02 · A prateleira guarda 12 máquinas e a 13ª some sem dizer nada `P2` `XS`

**Onde:** [recent-groups.ts:11](src/app/recent-groups.ts#L11) — `const LIMIT = 12`

**O que:** `rememberGroup` corta a lista em 12 com `.slice(0, LIMIT)`. Abrir uma máquina nova
**apaga silenciosamente a mais antiga** da lista deste aparelho.

**Por quê:** é o mesmo custo do P-01 — a perda do único ponteiro para um grupo —, só que sem
gesto nenhum da pessoa. Ela abre um link novo e perde um grupo antigo, e nada na tela diz
isso. Doze é um número plausível para quem participa de vários clubes ao longo de dois anos.

**Proposta:** o contador do cabeçalho da prateleira já mostra `{{ groups().length }}`. Quando
ele bater em 12, a linha mais antiga pode dizer, em `--chrome-dim`, `a próxima máquina toma
este lugar`. Custa uma linha de template e nenhum estado novo — e transforma um apagamento
invisível numa escolha visível (a pessoa esquece outra antes).

**Ou:** subir `LIMIT` para 24. `localStorage` aguenta com folga (cada registro é `id` +
`name` + `at`, ~80 bytes; 24 são ~2KB de um orçamento de 5MB). O motivo original de 12
não está escrito em lugar nenhum, o que sugere que foi um número redondo e não uma medida.

---

#### P-03 · A saudação quebra com nome de uma palavra muito longa, e não tem plano B `P3` `XS`

**Onde:** [home.ts:32](src/app/home.ts#L32) — `this.author().split(' ')[0]`

**O que:** `greeting()` pega a primeira palavra do nome. Um crachá como
`MariaEduardaGonçalves` (sem espaço) vira uma palavra de 21 caracteres dentro de um `h1` de
escala de manchete (`clamp(2.4rem, 4.6vw, 4rem)`).

**Por quê:** o campo do crachá não impede nome sem espaço, e apelidos colados são comuns. Em
390px, 21 caracteres a `2.4rem` estouram a goteira ou forçam quebra no meio da palavra.

**Prova que falta:** não medi — a suíte de a11y usa os nomes semeados, todos curtos. É
hipótese até alguém abrir a porta com um nome de 24 caracteres. **Sugestão de teste antes da
correção**, e não correção antes do teste.

**Proposta (se confirmar):** `overflow-wrap: anywhere` no `#home-title strong`, ou truncar a
saudação em ~14 caracteres. Não cortar o nome no crachá — lá ele já tem regra própria (A
Regra das Duas Linhas da Barra).

---

#### P-04 · Não há como entrar numa máquina colando o link `P2` `S`

**Onde:** [home.html:22](src/app/home.html#L22) — `home-note`

**O que:** a prateleira diz *"Para entrar numa máquina que já existe, abra o link que o grupo
mandou"* e não oferece campo nenhum para colar esse link.

**Por quê:** o caso é real e frequente. Alguém copia o link do WhatsApp no celular, abre o
navegador que já tem a Mesa do Mês aberta numa aba, e... a instrução manda voltar para o
WhatsApp e clicar. Pior no desktop, onde o link chega por mensagem em outro aparelho e a
pessoa digita à mão o que leu no celular — e não há onde digitar.

**Proposta:** um campo em `#/novo`? Não — a oficina é para montar. Aqui mesmo, abaixo da
nota, um `<input>` que aceita **o link inteiro ou só o id** e navega. A validação é a que já
existe: o id sai do `#/g/<id>` por regex, e um id que não existe cai no recado de erro que a
máquina já tem. É uma entrada, não uma listagem — não fura a regra de que o link é a
credencial, porque quem digita o link **tem** o link.

**Contra-argumento honesto:** é uma quarta coisa na coluna esquerda de uma tela que hoje tem
três (saudação, ação, nota). Se entrar, entra **no lugar** da nota, e não junto dela.

---

### 2.2 A porta (`identity-gate`) — [identity-gate.html](src/app/identity-gate.html)

#### G-01 · O caminho de digitar ainda cria a segunda "Ana" em silêncio `P1` `S`

**Onde:** [identity-gate.ts:352](src/app/identity-gate.ts#L352) — `submit()` ·
[identity-gate.html:181](src/app/identity-gate.html#L181)

**O que:** a porta oferece as cápsulas do globo primeiro — e é o próprio briefing dela que
explica por quê:

> *"digitar `Ana` onde o globo diz `Ana Paula` cria uma segunda pessoa em silêncio, porque a
> normalização de nomes é congelada e decide a identidade; o clube só descobre meses depois,
> com o álbum dividido ao meio."*

Mas o caminho de digitar continua existindo — tem que existir, quem chegou agora não está na
lista — e **ele não confere nada contra a lista que a porta acabou de carregar**. `submit()`
normaliza (`NFKC` + espaços) e grava. `participantKey('Ana')` é `ana`;
`participantKey('Ana Paula')` é `ana paula`. Duas pessoas.

**Por quê:** o defeito que a fileira de cápsulas foi feita para resolver **não foi
resolvido — foi tornado menos provável**. E ele é o mais caro do produto: não há conserto
depois. A normalização é invariante congelada, o log é append-only, e o histórico da pessoa
fica partido em dois nomes para sempre.

Quem cai nele é exatamente quem não deveria: a pessoa que abre o link no celular, vê uma
fileira de nomes completos e formais (`Ana Paula Ribeiro`), não se reconhece de imediato, e
usa o caminho de baixo para escrever `Ana`, que é como todo mundo a chama.

**Proposta — um aviso macio antes de gravar, nunca um bloqueio.** Com a lista carregada e o
nome digitado *parecido com* uma cápsula existente, `Entrar na mesa` não grava; mostra:

> **O globo já tem `Ana Paula Ribeiro`.** [cápsula] É você? · *Não, sou outra pessoa*

O primeiro botão é a cápsula de verdade e chama o mesmo `choose()`. O segundo grava o nome
digitado como está, e não pergunta de novo naquela sessão.

**Como decidir "parecido", sem inventar linguística.** Três regras baratas, todas sobre a
chave já normalizada:

1. um é **prefixo de palavra** do outro (`ana` ⊂ `ana paula ribeiro`);
2. o **primeiro nome coincide** e um dos dois tem uma palavra só;
3. as chaves são iguais **ignorando acentos** (`jose silva` vs `josé silva` — a aspereza que
   o `HANDOFF` documenta como intencional; ela continua intencional, mas passa a ser
   *perguntada* em vez de silenciosa).

Nada de distância de edição: `Bruno` e `Breno` são duas pessoas plausíveis no mesmo clube, e
um falso positivo aqui custa mais caro que um falso negativo.

**Onde não mexer:** `naming.ts` é congelado (invariante 3 do README). Esta proposta **não o
toca** — é uma pergunta a mais antes do `remember()`, e a chave continua sendo a de sempre.

**Prova que falta:** nenhum teste cobre hoje "digitar um nome parecido com um da lista". Se a
proposta entrar, entra com esse teste.

---

#### G-02 · A porta não diz de qual clube ela é a porta `P2` `S`

**Onde:** [identity-gate.html:2](src/app/identity-gate.html#L2) — a plaqueta diz
`Mesa do Mês nº 01`, sempre.

**O que:** ao abrir `#/g/<id>` sem crachá, a primeira tela pergunta "Quem é você?" sem dizer
**onde**. A única pista é a fileira de cápsulas — que chega depois da rede, e que não chega
se a rede falhar.

**Por quê:** quem está em dois clubes recebe dois links parecidos. A porta é a tela em que se
decide entrar, e ela é idêntica para todos os grupos. Pior no modo `changing()`, onde a
pergunta é "Quem está **na mesa?**" — *qual* mesa? E pior ainda quando a busca falha: sem
cápsulas e sem nome, a porta de um grupo é indistinguível da porta da prateleira.

**Proposta:** `ROSTER_LOOKUP` já carrega o `snapshot` inteiro — o nome do grupo está ali, de
graça, sem uma leitura a mais. A plaqueta (`.gate-plate`, mono, canto superior) troca
`nº 01` pelo nome do grupo quando há um. É a peça certa: ela já é a **etiqueta de
identificação da máquina**, e identificar a máquina é exatamente o que falta.

**Dois cuidados, e o segundo derruba metade da proposta:**

1. Nome de grupo é conteúdo de usuário e a plaqueta é mono `.62rem`. Precisa de teto de
   largura e `text-overflow: ellipsis`, ou um clube chamado *"Os Cavaleiros da Mesa Redonda
   de Sexta-Feira"* atravessa o título.
2. **A plaqueta some abaixo de 620px.** `.machine-plate { display: none }` dentro do
   `@media (max-width: 620px)` ([styles.scss:638](src/styles.scss#L638)) — e a Regra do
   Decalque de Bancada explica por quê: *"por ser plaqueta de identificação, não conteúdo"*.

   **Conferido na captura da porta a ~500px:** ela não está lá. A tela mostra a cápsula
   grande, `Quem é você?`, seis cápsulas com nome e a linha de escrever o nome — e nenhuma
   pista do clube.

   Ou seja: pôr o nome do grupo na plaqueta o entrega **só no desktop**, e o problema é do
   celular, que é onde o link é aberto. Se o nome do grupo entrar, ele precisa de um lugar
   que sobreviva à quebra — e o candidato honesto é o rótulo acima da fileira,
   `TOQUE NA SUA CÁPSULA` virando `QUEM É VOCÊ NO CLUBE DA FIRMA`, ou uma linha própria
   abaixo do título.

   Isso muda a proposta de `XS` para `S`, e transforma "identificação de máquina" em
   conteúdo — que é uma decisão de desenho, não um ajuste.

---

#### G-03 · A fileira de cápsulas empurra o formulário quando chega `P2` `S`

**Onde:** [identity-gate.ts:170](src/app/identity-gate.ts#L170) — `lookForCapsules()`

**O que:** a porta desenha primeiro e a lista entra quando a rede responde — decisão certa e
documentada. Mas a lista entra **acima** do formulário e o bloco `gate-mine` entra abaixo:
tudo que está no meio desce no instante em que a resposta chega.

**Por quê:** quem agiu naquele meio segundo — abriu o campo, mirou em `Não estou na lista` —
vê o alvo se mover debaixo do dedo. É o mecanismo clássico de toque errado por deslocamento.

**Prova que falta:** não medi CLS nem o tempo típico de resposta. Contra o emulador local a
janela é curta demais para reproduzir; num 3G ela é de segundos. **Medir antes de mexer:**
`PerformanceObserver` de `layout-shift` na porta, com a rede estrangulada no DevTools.

**Proposta (se confirmar):** reservar a altura de uma fileira enquanto `looking()` for
verdadeiro. Não um esqueleto cinza animado — a Regra do Momento Único proíbe o segundo
movimento —, só o espaço. O texto `Vendo quem já está no globo deste grupo…` já ocupa aquele
lugar: basta que ele tenha a **altura da fileira que vai substituí-lo**, e não a de uma
linha de texto.

---

#### G-04 · "Cole outro" aceita uma letra como emoji, sem dizer nada `P3` `XS`

**Onde:** [identity-gate.ts:300](src/app/identity-gate.ts#L300) — `typeEmoji()` ·
[group-log.ts:714](src/app/group-log.ts#L714) — `emojiText()`

**O que:** o campo corta o que for colado no primeiro grafema. Colar `abc` deixa `a`. A
cápsula passa a ter a letra `a` dentro — que é exatamente o formato das iniciais, o plano B
de quem **não** escolheu emoji.

**Por quê:** o símbolo vira confete quando a pessoa é sorteada. Uma letra caindo do globo lê
como defeito de renderização, não como escolha.

**A pergunta antes da correção:** isso é bug ou liberdade? Alguém pode querer `★`, `♥` ou
`ツ` de propósito, e nenhum é emoji. Se for liberdade, o rótulo devia dizer
`Ou cole outro símbolo` — hoje o campo se chama Emoji e tem `placeholder="🙂"`.

**Proposta mínima:** trocar o rótulo. Custa uma palavra, alinha a expectativa e não tira
liberdade de ninguém. Filtrar por faixa Unicode é mais caro, mais frágil (bandeiras, ZWJ,
seletores de variação) e proibiria `★` sem ganho nenhum.

---

#### G-05 · Foco automático no campo: considerado e **rejeitado**

Registrado para ninguém "consertar" isto depois.

Numa tela de campo único o reflexo é dar `autofocus`. Aqui **não**: no celular o teclado sobe
na hora e cobre a cápsula de 340px, que é o momento memorável da porta — a peça que ensina,
em um segundo, que neste produto uma pessoa é uma cápsula. E com a lista carregada o campo
nem está na tela: o caminho principal é tocar numa cápsula, e roubar o foco para um campo
escondido seria promover o caminho secundário.

O foco **é** movido, nos dois lugares certos: `openField()` foca o campo quando alguém pede
por ele, e `openPaint()` foca a saída da bancada. Está certo como está.

---

#### G-06 · `openField()` usa o `document` global em vez do injetado `P3` `XS`

**Onde:** [identity-gate.ts:190](src/app/identity-gate.ts#L190)

`window.setTimeout(() => document.getElementById('gate-name')?.focus(), 0)` — a mesma classe
injeta `DOCUMENT` e o usa nas outras três chamadas (`openPaint`, `closePaint`, `savePaint`).
Não é bug hoje; é a inconsistência que vira bug no dia em que isto rodar fora do navegador.
Uma palavra: `this.document`.

---

### 2.3 A máquina (`#/g/<id>`) — [synced-group.html](src/app/synced-group.html)

#### M-01 · O clube inteiro na mesma sala, e só quem girou vê o resultado `P1` `M`

**Onde:** [synced-group.ts:178](src/app/synced-group.ts#L178) — o efeito de carga ·
[synced-group.ts:633](src/app/synced-group.ts#L633) — `refresh()`

**O que:** a máquina lê o grupo em quatro momentos, e **nenhum deles é "o servidor mudou"**:

1. ao montar;
2. quando a aba volta a ficar visível (com intervalo mínimo);
3. depois de cada escrita **desta** pessoa;
4. quando alguém aperta `Atualizar`.

Não há `onSnapshot`. Numa noite de clube, cinco pessoas com o link aberto na mesma sala:
uma gira, e **as outras quatro continuam vendo o vencedor anterior** até tocarem em
`Atualizar` — um botão que mora no cabeçalho do *registro*, abaixo da dobra no celular, e
não ao lado do nome gigante que está errado.

**Por quê:** este é o momento social do produto. O `PRODUCT.md` diz que "abrir a página
encena a entrega de novo" e que "qualquer pessoa com o link reproduz o mesmo resultado" — e
é verdade, **desde que ela recarregue**. A tela não diz que pode estar velha; ela diz um
nome, em `6rem`, com toda a confiança do mundo.

O sinal que existe — `lido há 3 min`, ao lado de `Atualizar` — está no lugar errado (outra
seção, outro assunto) e na forma errada (um fato sobre a busca, não um convite).

**Por que não foi feito assim:** custo. O projeto vive no Spark e o `UsageGuard` dá 1.500
leituras por aparelho por dia. Abrir com cache em dia custa **1 leitura**
([FIREBASE.md](FIREBASE.md#custo-de-leitura-agora-que-o-log-é-a-verdade)), e a arquitetura
inteira foi desenhada em volta disso.

**Proposta, e a conta que a sustenta.** Um `onSnapshot` **só no doc do grupo** — o mesmo doc
que `load()` já lê para descobrir o `versaoLog`
([group-store.ts:111](src/app/group-store.ts#L111)) —, aberto **só enquanto a aba está
visível** e fechado no `visibilitychange`:

| | Hoje | Com o ouvinte |
|---|---|---|
| Abrir a máquina | 1 leitura | 1 leitura (a que abre o ouvinte) |
| Ficar 2 h com a aba aberta, nada acontecendo | 0 | **0** — ouvinte só cobra quando muda |
| Alguém gira | 0 (não fico sabendo) | 1 leitura do doc + o delta que o `Atualizar` cobraria de qualquer jeito |
| Uma noite de clube: 1 giro + 6 resenhas + 2 etiquetas | 0 a 9, se eu lembrar de atualizar | **9** |

Nove leituras contra um orçamento de 1.500 é **0,6% do dia**. O ouvinte não é caro — o caro
seria um `onSnapshot` na **coleção de eventos**, que cobra por documento. No doc do grupo ele
cobra por *mudança de versão*, que é exatamente a granularidade que interessa.

**O que precisa ser respeitado, e não pode ser esquecido:**

- **O `UsageGuard` tem que contar essas leituras.** `recordRead(1)` por notificação, ou o
  orçamento por aparelho deixa de valer justamente no caminho novo.
- **Fechar o ouvinte ao sair da aba e ao destruir o componente.** O código já tem a
  armadilha documentada: *"ir para o álbum e voltar deixava para trás um relógio e um
  ouvinte"*. Um ouvinte esquecido é pior que um relógio esquecido — ele cobra.
- **Nunca reencenar sozinho.** Um giro que chega pela rede **não** pode disparar a animação
  de 4,3s de outra pessoa. Pela Regra do Momento Único, o resultado novo entra em silêncio,
  como uma troca de estado; a encenação continua sendo do gesto de quem clica no globo.

**Alternativa mais barata, se o ouvinte for recusado (`S`):** manter o modelo de puxar, mas
**mover o sinal para onde a informação está**. Um `Atualizar` discreto colado ao anúncio do
palco, que só aparece quando `loadedAgo()` passa de ~2 min. Não resolve o problema — resolve
metade dele, que é a pessoa não saber que precisa atualizar.

---

#### M-02 · O Tab terminava num botão invisível `P2` `XS` ✅ FEITO

**Onde:** [synced-group.html:395](src/app/synced-group.html#L395) ·
[group-history.html:366](src/app/group-history.html#L366) ·
[styles.scss:607](src/styles.scss#L607)

**O que:** o aviso do rodapé (`.toast`) fica sempre no DOM e some com `opacity: 0` +
`pointer-events: none`. `pointer-events` para o mouse; **não para o Tab**. O botão
`Fechar aviso` continuava sendo uma parada de teclado.

**Medido** (Chrome headless, 1440×1000, grupo `demo`, tabulando de verdade a partir da
marca):

```
paradas reais do Tab: 17  →  a 17ª é  BUTTON | toast-close | Fechar aviso
estado do aviso nesse instante:
  { opacidade: 0, pointerEvents: "none", inert: false, ariaHidden: null,
    texto: "", caixa: "90x69 em 1308,829", focoFoiParaLa: true }
```

**Por quê:** é falha de *Focus Visible* (WCAG 2.4.7). Quem navega por teclado chega ao fim
do registro, aperta Tab mais uma vez, e o foco desaparece — não há anel de foco em lugar
nenhum da tela, porque o elemento focado tem opacidade zero num canto. O próximo Tab volta
para a barra do navegador, e a pessoa não faz ideia do que aconteceu no meio.

A suíte `test:a11y` não pega isto: ela confere nome acessível, alvo de 44px e contraste, e o
botão passa nos três — ele **tem** nome, **tem** 42px de altura e **tem** contraste. O que
ele não tem é existência visível.

**Feito — e por que assim:** `[attr.tabindex]="notice() ? null : -1"`.

Havia três saídas e duas são piores:

- `visibility: hidden` / `inert` tirariam o nó da árvore de acessibilidade. Mas o aviso é
  uma **região viva** (`role="status" aria-live="polite"`): o texto e a classe `is-visible`
  entram no mesmo ciclo, e leitores de tela são inconsistentes ao anunciar mutação num
  subárvore que estava oculta no instante da mutação. Consertar o Tab quebrando o anúncio
  é troca ruim.
- `@if (notice())` em volta do botão o desmonta no meio dos 200ms de saída, e o aviso some
  com o lado direito vazio.

`tabindex="-1"` tira a parada, deixa o nó na árvore, não muda um pixel e não toca no anúncio.

**Depois:** as paradas de Tab caem de **17 para 16**, e a última é `Abrir a ficha do giro 5`
— que é onde a página realmente termina.

---

#### M-03 · O trilho do registro não tem fim visível no celular `P2` `S`

**Onde:** [synced-group.html:330](src/app/synced-group.html#L330) — `.chart-grid` +
`.rail-hint`

**O que:** abaixo de 620px o registro vira um trilho horizontal com `scroll-snap` e uma dica
`Deslize para ver o registro completo`. Ele lista **todos** os giros do grupo, do primeiro ao
último, numa fita. Um clube com um ano de mesa tem ~24 giros: 24 arrastadas para chegar ao
começo, sem régua, sem rodada visível no caminho e sem posição.

**Por quê:** o trilho é ótimo para "o que aconteceu por último" — que é o caso comum — e
péssimo para "onde está aquele jogo de março". E o produto **já tem** a tela que faz isso
bem: o álbum, com filtro por pessoa e oito ordens.

**Proposta:** cortar o trilho nos últimos ~8 giros e fechar a fita com uma célula
`Ver os outros N no álbum`, que é um link e tem a mesma altura das outras — não um botão
solto abaixo, que ninguém alcança depois de 24 arrastadas.

Isso também barateia a página: 24 células viram 9, e cada célula é um `<button>` com quatro
a seis filhos.

**Cuidado:** no desktop a grade **empacota borda a borda** e mostrar tudo é barato e útil.
O corte é do trilho, e não do registro — mesma marcação, o `@if` decide pela largura? Não:
decidir layout por largura em TypeScript é o que a Regra das Duas Barras proíbe. O caminho
certo é renderizar as 8 primeiras células mais um `<li>` de transbordo, e **esconder o
transbordo por CSS** no desktop, onde as outras já cabem.

---

#### M-04 · O `Atualizar` fica desabilitado durante a carga e não diz o que está esperando `P3` `XS`

**Onde:** [synced-group.html:283](src/app/synced-group.html#L283)

`[disabled]="busy() || loading()"` com o rótulo trocando para `Buscando…`. O rótulo já
resolve o `loading()`. Mas quando o botão está desabilitado por `busy()` — uma escrita em
curso, por exemplo salvar uma resenha —, ele continua dizendo `Atualizar` e simplesmente não
responde. É a única coisa na tela que fica muda sem explicação.

**Proposta:** `aria-busy` já é uma opção, mas o mais simples é o rótulo dizer o que está
acontecendo, como já faz na carga: `Gravando…`. Um controle desabilitado com o rótulo do
estado normal é indistinguível de um controle quebrado.

---

#### M-05 · A confirmação do giro é a única do produto, e ela está certa

Registrado como decisão para ninguém "simplificar" isto depois.

`Tem certeza que deseja girar a roleta? / Isso afeta a roleta de todo o grupo e não pode ser
desfeito.` é um `role="alertdialog"` com `aria-modal`, foco preso de verdade
([focus-trap.ts](src/app/focus-trap.ts)), `Esc` e clique no véu, e o foco voltando ao
`#spin-button` no cancelamento. É o padrão inteiro, sem atalho.

E o texto obedece a Regra do Texto que Não Explica a Máquina: diz **a consequência** ("afeta
o grupo", "não volta atrás") e não o mecanismo ("fica gravado no registro"). É o exemplo que
o resto do produto deveria seguir.

---

#### M-06 · No celular, o registro abre no giro mais VELHO — e o "Último" fica fora da tela `P1` `XS`

**Onde:** [synced-group.html:305](src/app/synced-group.html#L305) — `.chart-grid` ·
[styles.scss](src/styles.scss) — `overflow-x: auto` + `scroll-snap-type: x mandatory` abaixo
de 620px

**Medido**, no grupo `demo` (5 giros), logo depois da carga:

| | 390px | 1440px |
|---|---|---|
| `overflow-x` | `auto` | `visible` |
| `scroll-snap-type` | `x mandatory` | `none` |
| **rolagem inicial** | **0** | 0 |
| rolagem disponível à direita | **621px** | 0 |
| células **inteiramente visíveis** | **1** — `RODADA 1 · 13/08/26 · Fátima` | as **5** |
| a célula marcada `Último` (a 5ª) está visível? | **não** | sim |

No celular, o trilho abre parado no **primeiro giro do grupo** e esconde o mais recente atrás
de 621px de arrasto. Com cinco giros são duas arrastadas; com um ano de clube — vinte e
quatro giros — são umas catorze.

**Três coisas discordam entre si na mesma tela:**

1. **O palco**, dois dedos acima, mostra o vencedor **mais recente** em `55px`.
2. **O trilho** abre no mais antigo.
3. **O selo `Último`** está grudado numa célula que não está na tela.

E o produto **já decidiu isso** noutro lugar, com o motivo escrito: no álbum, *"a faixa é a
rodada, da mais nova para a mais antiga, e dentro de cada uma do giro mais recente para trás:
**quem abre o álbum quer ver o que acabou de acontecer**"*. O registro é a mesma pergunta na
tela que se visita todo dia, e responde ao contrário.

**Proposta (`XS`):** o trilho **abre no fim**. Uma linha, num `afterNextRender`:

```ts
trilho.scrollLeft = trilho.scrollWidth;
```

A ordem do DOM não muda — o tempo continua correndo da esquerda para a direita, que é o
certo — muda só **onde a fita começa**: em "agora".

**Dois cuidados, e o segundo é o que faz isto ser trabalho de verdade:**

- **Uma vez, e nunca num `effect`.** A máquina recarrega sozinha ao voltar para a aba; um
  efeito puxaria a pessoa de volta para o fim toda vez que ela tivesse arrastado até um giro
  antigo. É `afterNextRender`, como o foco da gaveta (T-25).
- **A dica muda de sentido.** `Deslize para ver o registro completo →`, com a seta para a
  direita, deixa de fazer sentido quando já se está na ponta direita. Ela viraria
  `← Deslize para ver os giros anteriores`. **É uma decisão de texto e de desenho numa
  superfície com opinião forte**, e por isso não implementei — o trecho tem seta desenhada,
  e a direção dela é parte do desenho.

**Por que vale mesmo assim:** hoje a informação mais procurada da tela mais visitada está
escondida atrás de um gesto, num aparelho onde o produto foi feito para viver.

---

### 2.4 A ficha do jogo — [game-sheet.html](src/app/game-sheet.html)

#### F-01 · A mesma pessoa tinha duas cores na mesma ficha aberta `P1` `XS` ✅ FEITO

**Onde:** [game-sheet.ts:273](src/app/game-sheet.ts#L273) — `reviewerColor()`

**O que:** a cápsula de quem escreveu uma resenha era pintada com a cor **tirada do hash do
nome** (`cracha:v1:<chave>`), e não com a cápsula que a pessoa escolheu. Dois dedos abaixo,
na mesma ficha, `seatColor()` faz o certo: procura o membro e usa a cor dele, caindo no hash
só para quem nunca foi do grupo.

**Medido** (Chrome headless, grupo `demo`, ficha do giro 1, mesma ficha aberta):

| Pessoa | Na resenha | Na mesa · no registro · no aro |
|---|---|---|
| Davi | `rgb(240,119,26)` — tangerina | `rgb(27,82,69)` — pinho |
| Elisa | `rgb(15,15,18)` — breu | `rgb(133,21,64)` — vinho |

**Por quê:** é a regra mais repetida do sistema visual, e a que dá sentido ao produto
inteiro:

> **A Regra da Cápsula Que É Você.** *A identidade visual de uma pessoa pertence a ela e é a
> mesma em toda parte do produto.*

O `HANDOFF` chega a dizer que o crachá do cabeçalho era "o último lugar do produto onde a cor
de alguém não era a que ela escolheu". **Não era** — a linha da resenha continuava sendo. E é
o pior lugar possível para isso: o boletim é onde o clube lê quem disse o quê, e uma coleção
que muda de cor entre duas linhas deixa de ler como coleção.

**Feito:** `reviewerColor()` passa a espelhar `seatColor()`, com `memberByAuthor()` — a mesma
ponte que o crachá do cabeçalho já usa. Quem só assinou uma resenha e nunca foi do grupo
continua na cor do nome: não há cápsula a consultar, e é exatamente o que a mesa já fazia.

Junto veio o **emoji**: a linha da resenha mostrava sempre as iniciais, enquanto a mesa
mostrava o emoji da pessoa. `reviewerEmoji()` fecha essa metade — mesma cápsula, mesmo
símbolo.

**Depois:** Davi é pinho nos dois lugares, Elisa é vinho nos dois. Três testes novos em
[game-sheet.spec.ts](src/app/game-sheet.spec.ts) travam isso: a cor escolhida, a igualdade
entre resenha e mesa, e o plano B de quem não é do grupo. `DESIGN.md` ganhou a frase que
diz que a regra vale em **toda** aparição, e não só no crachá.

---

#### F-02 · Escrever 600 caracteres e clicar fora apaga tudo, sem uma palavra `P1` `S`

**Onde:** [game-sheet.html:1](src/app/game-sheet.html#L1) — `.sheet-scrim (click)="close()"` ·
[game-sheet.ts:429](src/app/game-sheet.ts#L429) — `close()`

**O que:** a ficha tem quatro saídas e **elas não concordam entre si**:

| Saída | Da face `resenha` | O rascunho |
|---|---|---|
| `Esc` | volta para a ficha | **preservado** |
| `Voltar` | volta para a ficha | **preservado** |
| `X` (`#sheet-close`) | fecha tudo | **perdido** |
| clique no véu | fecha tudo | **perdido** |

**Por quê:** alguém escreveu a nota, a completude, quatro escalas e 600 caracteres sobre o
jogo. Um clique fora do cartão — no desktop o véu ocupa a maior parte da tela, porque o
cartão do formulário é `42rem` numa janela de 1440px — e não sobra nada. Sem aviso, sem
desfazer, sem rascunho.

O mais revelador é que **o time já se preocupou com exatamente esta perda**. O comentário do
efeito de sincronização diz, com todas as letras:

> *"reencher os campos a cada recarga apagava a resenha meio escrita de quem tinha só ido
> conferir o nome do jogo noutro lugar."*

O `Esc` também foi desenhado com cuidado: ele volta **uma face por vez**, justamente para não
levar o rascunho embora. Duas defesas pensadas, e as duas contornadas pelo caminho mais fácil
de acionar por engano.

**Proposta (a ordem importa, da mais barata para a mais completa):**

1. **`XS` — desligar o véu quando há rascunho.** `(click)="close()"` no `.sheet-scrim` vira
   `(click)="closeFromScrim()"`, que só fecha se não houver rascunho sujo. Nas outras faces
   nada muda. Um véu que não fecha é menos surpreendente do que um véu que apaga.
2. **`S` — perguntar.** Com rascunho sujo, o `X` e o véu abrem a mesma confirmação do giro
   (o padrão já existe e é bom): *"Sair sem guardar a resenha? O que você escreveu não fica."*
3. **`M` — guardar o rascunho.** Em `localStorage`, por giro e por crachá, apagado no
   `commitReview`. É o único que resolve também o caso do celular que mata a aba.

**Recomendação: (1) agora, (2) na sequência.** (3) é bom, mas guarda texto de resenha no
aparelho, e isso é uma decisão de produto — não de acabamento.

**Como saber que há rascunho:** o componente já tem tudo. Um `sujo()` que compare `score`,
`status`, `text`, `hours` e `criteria` com `mine()` — é o mesmo shape do `dirty()` que a
bancada da porta já usa ([identity-gate.ts:275](src/app/identity-gate.ts#L275)).

---

#### F-03 · `askRemoveNote()` tem "ask" no nome e não pergunta nada `P1` `S`

**Onde:** [game-sheet.ts:415](src/app/game-sheet.ts#L415)

```ts
protected askRemoveNote(): void {
  if (!this.saving()) this.removeNote.emit();
}
```

**O que:** `Retirar o jogo` apaga o nome **e a descrição** do jogo daquele giro, na hora, no
primeiro clique. Ele fica na mesma fileira de `Salvar o jogo` e `Voltar`, à direita, em
`remove-ink`.

**Por quê:** é a única ação do produto que é ao mesmo tempo **destrutiva, coletiva e sem
confirmação**.

- **Coletiva:** o jogo é de todo mundo. Quem apaga apaga para o clube inteiro — o cartão do
  álbum vira `Sem jogo escrito` para as seis pessoas.
- **Destrutiva de conteúdo:** as resenhas sobrevivem (isso está certo e documentado), mas a
  descrição de 280 caracteres que alguém escreveu há um ano some da tela. O log guarda o
  evento anterior, mas **a interface não tem como voltar a ele**: refazer exige lembrar o que
  estava escrito.
- **Sem rede de proteção:** um clique, nada pergunta, nada desfaz.

Compare com girar — que só **acrescenta** ao registro e não apaga nada — e que tem
`alertdialog`, foco preso, `Esc`, véu e um texto que diz a consequência. A proteção está no
gesto errado.

**Proposta:** a mesma confirmação do giro, com o texto no mesmo formato — consequência, não
mecanismo:

> **Retirar o jogo desta cápsula?**
> O nome e a descrição saem para o grupo inteiro. As resenhas continuam.

`Retirar a minha` (a própria resenha) é **P2**, não P1: afeta só quem clica, e reescrever é o
caminho normal do produto. Ainda assim merece o desfazer do aviso, se `Notice` ganhar ação
(ver T-04).

**Renomear junto:** `askRemoveNote` / `askRemoveReview` passam a fazer jus ao nome, ou
viram `removeNoteNow` / `removeReviewNow`. Um método chamado `ask` que não pergunta é uma
armadilha para quem vier depois.

---

#### F-04 · A roda do mouse muda o tempo de jogo enquanto a pessoa rola a ficha `P2` `XS`

**Onde:** [game-sheet.html:290](src/app/game-sheet.html#L290) — `<input type="number">`

**O que:** o campo de horas é `type="number"`. No Chrome e no Firefox, um `input[type=number]`
**focado** captura a roda do mouse e incrementa o valor. A ficha é um cartão que **rola por
dentro**, e o campo fica no meio do formulário da resenha, entre a régua de nota e as cinco
escalas.

A sequência que quebra: a pessoa digita `12`, continua para as escalas rolando com a roda, o
ponteiro passa por cima do campo que ainda está focado — e a resenha é gravada com `9` ou
`15` horas sem ninguém ter tocado no campo.

**Por quê:** é silencioso, é fácil de reproduzir e envenena uma média (`tempo de jogo`) que o
álbum exibe e que ordena a parede inteira.

**Proposta:** `(wheel)="$event.target.blur()"` no campo, o remédio padrão. Uma linha.

**Ou, mais radical e provavelmente melhor:** trocar por `type="text"` com
`inputmode="numeric"` e o mesmo saneamento que o componente já faz. `type="number"` traz três
problemas de brinde — a roda, as setinhas de incremento que ninguém usa, e o fato de que
`novalidate` no formulário já desliga o `min`/`max` que justificariam o tipo.

---

#### F-05 · `maxlength` corta o texto colado em silêncio `P2` `XS`

**Onde:** [game-sheet.html:346](src/app/game-sheet.html#L346) (600) ·
[:541](src/app/game-sheet.html#L541) (80) · [:576](src/app/game-sheet.html#L576) (280)

**O que:** colar 900 caracteres num campo de 600 deixa 600. O contador vira `600/600` e
acende o `.is-full` — que é o mesmo estado de quem **escreveu** até o limite. Nada diz que
300 caracteres foram descartados no caminho.

**Por quê:** o caso é comum e específico: alguém escreve a resenha no bloco de notas do
celular e cola. O corte acontece no meio de uma frase, e a pessoa só descobre relendo.

**Proposta:** no `paste`, quando o que entrou for menor que o que veio, o contador ganha uma
linha de aviso por alguns segundos: `Couberam 600 de 900 caracteres.` Não é erro — é um
fato sobre o que acabou de acontecer, e cabe no espaço do próprio contador.

**Cuidado com a Regra do Texto que Não Explica a Máquina:** isto passa no filtro. Não é
mecanismo, é **consequência de um gesto** — e sem ela a pessoa toma uma decisão (dar por
escrito) sobre um texto que não é o dela.

---

#### F-06 · O botão de guardar fica desabilitado e não diz o que falta `P2` `XS`

**Onde:** [game-sheet.html:361](src/app/game-sheet.html#L361) ·
[game-sheet.ts:210](src/app/game-sheet.ts#L210) — `draftReady()`

**O que:** `Guardar minha resenha` só habilita com nota **e** completude escolhidas. Enquanto
falta uma das duas, o botão está morto e não explica.

**Por quê:** a explicação existe — a faixa se chama `O que a resenha cobra` —, mas ela está no
topo do formulário, e no celular, com a régua de onze casas e três selos de completude, ela
já saiu da tela quando a pessoa chega no botão. Ela vê um botão apagado e nenhuma pista de
qual das duas faltou.

E o produto **já tem as duas frases certas** escritas, em
[game-bench.ts:138](src/app/game-bench.ts#L138):

> `Dê a nota final: é a única nota que a resenha cobra.`
> `Diga como você terminou: platinado, finalizado ou incompleto.`

Elas **funcionam**, e por um caminho só: `submitReview()`
([game-sheet.ts:417](src/app/game-sheet.ts#L417)) não confere `draftReady()`, então
`Ctrl+Enter` dentro do texto livre envia mesmo faltando nota, e a frase certa aparece. Quem
usa mouse ou dedo nunca chega lá — o botão está desabilitado, e é o único caminho que essas
pessoas têm.

Duas mensagens escritas com cuidado, atrás de um atalho de teclado que ninguém descobre.

**Proposta:** habilitar o botão sempre e deixar `submitReview()` disparar a mensagem no
`.field-error role="alert"` que já está três linhas acima. É a troca clássica de *disabled*
por *validação no envio* — e aqui ela é quase sem risco, porque **o caminho já roda hoje**
pelo `Ctrl+Enter`. Não é código novo: é dar ao dedo o que o teclado já tem.

---

#### F-07 · O picote da platina e a régua sem direção: **certo como está**

Registrado para não ser "melhorado" por engano.

`Dificuldade` não recebe tinta e é desenhada como **um traço que cruza o trilho**, e não como
um filete que enche — porque 9 em dificuldade é um fato, não um aplauso. As duas medidas da
platina ficam atrás de um picote, com a faísca no rótulo, porque o denominador delas é outro.

São duas decisões que quase nenhum produto toma, as duas estão documentadas com o motivo, e
as duas seriam desfeitas pelo primeiro reflexo de "uniformizar as réguas". Não uniformize.

---

#### F-08 · A 320px, as casas da régua têm 20px — abaixo do piso do próprio projeto `P1` `M`

**Onde:** [game-sheet.html:255](src/app/game-sheet.html#L255) — a régua da nota final ·
[:415](src/app/game-sheet.html#L415) — as réguas dos critérios

**Medido**, na face da resenha, com a viewport forçada por `setDeviceMetricsOverride`:

| Régua | 390px | **320px** |
|---|---|---|
| Nota final (11 casas) | 29 × 48px | **22 × 48px** |
| Diversão e as outras quatro (12 casas) | 26 × 44px | **20 × 44px** |
| Folga entre casas vizinhas | 2px | 2px |

**O piso é 24px, e é do projeto.** A própria suíte de a11y reprova qualquer alvo com
`altura < 44 || largura < 24` ([audit-a11y.mjs:68](tests/audit-a11y.mjs#L68)) — e ela mede
certo, mapeando o `input[type=radio]` para o `<label>` que o envolve. É o mesmo piso da WCAG
2.5.8 (24 × 24), e com 2px de folga a exceção por espaçamento também não vale.

**Por que a suíte não pega:** ela roda em `1440 · 900 · 390`
([audit-a11y.mjs:150](tests/audit-a11y.mjs#L150)). A 390 as casas medem 26px e passam. **320
não está na lista** — e 320 é largura de aparelho de verdade: iPhone SE, Androids de entrada,
e qualquer telefone numa janela dividida.

A regra existe, o teste existe, e a largura que os viola não é testada.

**Por que é `M` e não `XS`:** não dá para só aumentar as casas. Doze casas de 24px com 2px de
folga pedem `12 × 24 + 11 × 2 = 310px`, e o cartão da ficha a 320 tem
`min(42rem, 100vw - 2.4rem)` ≈ **281px** antes do respiro interno. **Não cabe.** A correção é
de forma, não de tamanho:

1. **A régua quebra em duas fileiras** abaixo de ~360px — seis e seis, que fecha a grade
   (Regra da Grade que Fecha) e devolve alvos de 44px.
2. **Ou os critérios opcionais viram os cinco degraus com nome** abaixo de 360px, como a
   dificuldade já é. Menos precisão, alvos honestos, e o produto já tem o controle desenhado.
3. **Ou o `—` sai da régua** e vira um controle próprio (ver F-09), o que devolve uma casa às
   outras onze — mas 11 × 24 + 10 × 2 = 284px ainda não cabe em 281.

**Recomendação: (1).** É a única que preserva a escala de onze casas, que é a medida que o
clube discute.

**Junto com ela, a suíte ganha 320px.** Hoje ela é `[[1440,1200],[900,1200],[390,844]]`; com
`[320,720]` na lista, este achado teria aparecido sozinho — e vai voltar a aparecer sozinho
na próxima vez.

---

#### F-09 · "não avaliei" fica colado em "Nenhuma", e os dois parecem a mesma coisa `P1` `S`

**Onde:** [game-sheet.html:384](src/app/game-sheet.html#L384) — a régua de dificuldade

**Medido**, a 390px, os rótulos da régua de dificuldade na ordem em que aparecem:

```
[ — não avaliei ]  [ Nenhuma ]  [ Fácil ]  [ Médio ]  [ Difícil ]  [ Impossível ]
      38px             59px        47px      47px       59px          76px
              ↑ 3px de folga entre os dois
```

**As duas primeiras casas dizem "nada", e significam coisas opostas:**

- **`—`** é *não avaliei*. O critério fica **fora** da média do clube.
- **`Nenhuma`** é *dificuldade zero*. Ela **entra** na média, como um 0.

Estão a três pixels uma da outra, com o mesmo desenho, no começo da mesma fileira. Quem quer
dizer "não sei avaliar a dificuldade" e toca em `Nenhuma` acabou de dizer ao clube que o jogo
não tinha dificuldade nenhuma — e isso **puxa a média daquele critério para baixo**, num
critério que o álbum inteiro pode ordenar.

O `—` tem um `visually-hidden` dizendo "não avaliei", o que resolve para quem usa leitor de
tela e não resolve para quem enxerga: na tela ele é um traço.

**O mesmo vale nas réguas numéricas**, e é a mesma armadilha: `—` e `0` são vizinhos de 26px
a 390px e de 20px a 320px (F-08). `0` em diversão é "esse jogo não tem graça nenhuma"; `—` é
silêncio. Um dedo de diferença.

**Proposta, três opções da mais barata para a melhor:**

1. **`XS` — uma folga.** Separar a casa do `—` das demais com o mesmo respiro que o produto
   usa para dizer "isto é outra coisa": um espaço maior, ou um filete. Custa uma margem.
2. **`S` — o `—` ganha rótulo.** Em vez de um traço, `sem nota` em `tick` (a tipografia de
   0,55rem existe exatamente para casas de régua). A palavra desfaz a ambiguidade com
   `Nenhuma` de uma vez.
3. **`S` — o `—` sai da fileira** e vira o estado padrão: a régua começa **vazia**, e tocar
   numa casa preenche. Para desfazer, toca-se de novo na casa marcada. É o padrão de
   avaliação por estrelas, não precisa de casa própria, e devolve espaço para o F-08.

**Recomendação: (2) agora, (3) se a régua for redesenhada pelo F-08.** As duas resolvem o
problema; a (3) resolve os dois achados de uma vez.

**Cuidado com a (3):** "tocar de novo para desmarcar" é invisível. Ela só funciona se a
faixa opcional já disser que nada ali é obrigatório — e ela diz: *O resto, se você quiser*.
Ainda assim, é a opção que precisa ser vista antes de ser decidida.

**Prova que falta:** não sei com que frequência isso acontece de verdade. Um clube com
dificuldades registradas como `0` em jogos que claramente não eram fáceis seria o indício —
e o log tem isso, se alguém quiser olhar.

---

### 2.5 O álbum (`#/g/<id>/album`) — [group-history.html](src/app/group-history.html)

#### L-01 · A parede de cápsulas começa depois da dobra — em **todos** os tamanhos `P1` `S`

**Onde:** [group-history.html:36](src/app/group-history.html#L36) até
[:190](src/app/group-history.html#L190) — tudo que vem antes do primeiro cartão.

**Medido** (Chrome headless, grupo `demo`, que tem **5 cápsulas e 6 pessoas** — um clube
pequeno):

| Largura | Altura antes do 1º cartão | Em telas |
|---|---|---|
| 390 × 780 (celular) | **1093px** | **1,40 tela cheia de nada** |
| 1440 × 900 (desktop) | **989px** | **1,23 tela** |

Onde os 1093px do celular são gastos:

| Bloco | Altura |
|---|---|
| `.topbar` | 60px |
| `.album-head` (título + parágrafo + números) | **432px** — dos quais **189px** são a grade de números |
| `.album-save` (salvar como imagem + a linha do link) | 56px |
| `.owed-note` (o recado do que eu devo) | 99px |
| `.album-people` (filtro por pessoa) | **222px** com apenas **6** pessoas |
| `.album-sort` | 48px |
| a primeira régua de rodada | 25px |

**Por quê:** o álbum é **a parede**. O briefing da superfície diz que "não é uma vitrine — é a
estante do clube, e a tarefa é encontrar uma cápsula". Hoje quem abre a estante vê o título
da estante, seis números sobre a estante, um botão de fotografar a estante, um recado, um
filtro e um seletor de ordem — e **nenhuma cápsula**, até rolar uma tela e meia.

Pior: os 222px do filtro de pessoa **crescem com o clube**. Seis pessoas dão 222px; quinze
dariam o dobro. O bloco que mais cresce é o que menos gente usa.

E há uma ironia registrada no próprio `DESIGN.md`: o seletor de ordem virou `<select>` no
celular **exatamente por este motivo** — *"em texto elas ocupavam três fileiras e 150px de
altura antes do primeiro cartão"*. Aquela correção economizou ~100px; o cabeçalho em volta
ganhou 1000.

**Proposta, em três cortes, do mais barato para o mais estrutural:**

1. **`XS` — os números descem.** A grade de série custa 189px e responde a uma pergunta
   ("como vai o clube?") que ninguém faz **antes** de olhar a parede. Ela cabe no pé da
   parede, depois dos cartões, como o resumo que ela é. Sozinho, isto devolve ~190px.
2. **`S` — o filtro de pessoa vira uma linha.** Hoje é uma faixa de comprimidos que envolve.
   No celular, a mesma escolha entre muitas coisas exclusivas que o seletor de ordem já
   resolveu — e pela mesma Regra da Ordem que Cabe na Mão, ela é do picker do sistema.
   Devolve ~170px e para de crescer com o clube.
3. **`S` — o "Salvar como imagem" sai do caminho.** Ele é uma ação sobre a parede inteira,
   não uma etapa antes de olhá-la. No pé, junto com os números, ou como plaqueta na régua da
   primeira rodada.

Com os três, o primeiro cartão sobe para ~**640px** no celular — abaixo da dobra ainda, mas
com a parede começando na primeira rolada em vez da segunda.

**O que não mexer:** o **recado do que eu devo** (`owed-note`) fica onde está. Ele é a única
coisa acionável daquela tela para quem deve uma resenha, o `DESIGN.md` diz isso com todas as
letras, e ele **some sozinho** quando a pessoa escreve. Um bloco que se apaga não é peso
permanente.

---

#### L-02 · O álbum não tem `Atualizar`, e não diz quando foi lido `P2` `XS`

**Onde:** [group-history.html](src/app/group-history.html) — não há `refresh-button` nem
`loadedAgo`.

**O que:** a máquina tem os dois. O álbum, que lê o mesmo log pela mesma camada, não tem
nenhum. Quem abre o álbum e fica lendo vê um retrato do momento em que a página abriu, para
sempre — a menos que recarregue o navegador.

**Por quê:** é o irmão do M-01, e é pior, porque no álbum nem existe o botão de escapatória.
Um clube que acabou de resenhar em grupo (o caso mais comum: todo mundo escrevendo depois da
partida) tem cada pessoa vendo uma contagem de resenhas diferente na mesma parede.

**Proposta:** se o ouvinte do M-01 entrar, ele cobre os dois — é a mesma camada. Se não
entrar, o álbum ganha o mesmo par `Atualizar` + `lido há N` que a máquina tem, na régua da
primeira rodada.

---

#### L-03 · Duas regiões com o mesmo nome acessível `P3` `XS`

**Onde:** [group-history.html:36](src/app/group-history.html#L36) e
[:151](src/app/group-history.html#L151)

```html
<section class="album-head" aria-labelledby="album-title">
<section class="album-wall" aria-labelledby="album-title">
```

**O que:** as duas seções apontam para o mesmo `<h1 id="album-title">O álbum</h1>`. Na lista
de regiões de um leitor de tela aparecem duas entradas chamadas "O álbum", e nenhuma diz qual
é o cabeçalho e qual é a parede.

**Proposta:** a parede aponta para o próprio rótulo que já existe logo dentro dela —
`album-sort-label` não serve (é "Ordenar por"). O mais honesto é dar à parede um
`aria-label="A parede de cápsulas"` ou promover a primeira régua de rodada a rótulo. Custa um
atributo.

**Nota:** a suíte `test:a11y` não pega isto — ela confere `h1` único e saltos de nível, e os
dois estão certos. Nomes de região duplicados são outra classe de achado.

---

#### L-04 · A grade de números do álbum tem seis valores, e dois dizem quase a mesma coisa `P3` `XS`

**Onde:** [group-history.html:50](src/app/group-history.html#L50)

`Nota do clube` · `Platinado` · **`Jogos com nota`** (`N / total`) · `Resenhas` ·
**`Com jogo escrito`** (`N / total`) · `Rodadas`

Os dois em negrito são contagens do mesmo denominador, lado a lado, e a diferença entre eles
— um jogo pode estar escrito e sem nota, mas nunca ter nota sem estar escrito — só fica clara
para quem já sabe como o produto funciona. Numa grade de mono `.62rem`, eles leem como o
mesmo número dito duas vezes.

**Proposta:** um só, na forma que contém os dois: `5 escritos · 4 com nota`. Devolve uma
fileira inteira (63px) e tira a dúvida.

---

#### L-05 · Deriva: o `DESIGN.md` descreve uma grade que não existe mais `P2` `XS`

**Onde:** [DESIGN.md](DESIGN.md) — seção *O Álbum*

> *"a grade de série em 2×2 (`Cápsulas`, `Etiquetadas`, `Rodadas`, `Já saíram`). Quatro
> colunas estreitas viravam 3 + 1 órfão; 2×2 fecha o bloco."*

Nenhum dos quatro rótulos existe hoje, e são **seis** valores, não quatro. A grade continua
fechando (3 fileiras de 2, porque `.album-stats` trava em duas colunas em qualquer largura),
então a regra sobreviveu; a descrição dela, não.

Mesma classe de D-01 a D-03: documento que descreve um produto anterior. **Não corrigi** —
por instrução do próprio `impeccable`, deriva encontrada é relatada e não consertada de
carona numa tarefa de design.

---

#### L-06 · Uma cápsula sem jogo escrito também lacrava — a mesma ausência dita duas vezes `P1` `XS` ✅ FEITO

**Onde:** [group-history.ts:399](src/app/group-history.ts#L399) — `sealedOf()` ·
[game-sheet.ts:150](src/app/game-sheet.ts#L150) — `sealed`

**O que:** capturei a parede a ~500px e o primeiro cartão dizia as duas coisas ao mesmo
tempo:

```
Cecília · CÁPSULA 5 · 29/08/26
  Sem jogo escrito
  🔒 Lacrado até você resenhar
```

Um giro sem jogo escrito **não tem nota nenhuma** — ninguém pode ter resenhado um jogo que
ninguém nomeou. O lacre ali não esconde nada: ele **promete** um boletim que não existe.

E é exatamente o que o `DESIGN.md` proíbe, com estas palavras:

> *"Um cartão sem jogo **não** diz também que não tem nota: é a mesma ausência dita duas
> vezes."*
> *"E lacra só o que tem nota a ancorar."*

**A parte que fecha o caso: o repositório já concorda comigo em dois lugares.**

| Superfície | O que fazia | Confere o jogo antes? |
|---|---|---|
| `pendingReviews()` ([group-log.ts:963](src/app/group-log.ts#L963)) | não conta o giro sem jogo no recado | ✅ `spin.note && owesReview(...)` |
| O pôster ([album-poster.ts:92](src/app/album-poster.ts#L92)) | o cartão em branco sai sem `Lacrada` | ✅ `if (!spin.note) { … return }` |
| A célula do registro | nunca lacra sem jogo | ✅ o template já guarda com `@if (spin.note)` |
| **O cartão do álbum** | **lacrava** | ❌ |
| **A ficha do jogo** | **abria o selo de lacre** | ❌ |

Duas de quatro superfícies acertavam, e as duas que erravam são as que uma pessoa lê. Havia
até uma contradição interna visível na mesma tela: o recado dizia *"Você jogou **2** jogos
que ainda não resenhou"* e a parede mostrava **3** cartões lacrados.

**Feito:** as duas passam a fazer o que as outras já faziam —
`!!spin.note && owesReview(...)`. Não é regra nova: é a mesma condição, escrita no quarto
lugar.

Na ficha, a cápsula sem jogo agora abre direto no que ela é: `Sem jogo escrito`, com
`Escrever o jogo` na fileira de ações — que sempre foi a saída certa dela, e estava atrás de
um cadeado.

**Os dois testes que falham sem a correção** — conferido tirando as duas condições e
rodando:

```
× uma cápsula sem jogo escrito não lacra: não há nota a esconder   (group-history.spec)
× não lacra uma cápsula sem jogo escrito: não há boletim a prometer (game-sheet.spec)
  AssertionError: expected <div …>…</div> to be null
Tests  2 failed | 407 passed (409)
```

**Verde depois:** `npm test` **409/409**, `e2e-acabamento` **59/59**, `test:etiqueta`
**86/86**, `e2e-flows` **21/21**, `test:a11y` **0 achados**.

---

### 2.6 A oficina (`#/novo`) — [create-group.html](src/app/create-group.html)

#### O-01 · O placeholder é o valor padrão, e os dois são a mesma frase `P2` `XS`

**Onde:** [create-group.html:35](src/app/create-group.html#L35) ·
[create-group.ts:39](src/app/create-group.ts#L39)

```html
placeholder="Clube de Jogos"
```
```ts
const name = this.name().trim() || 'Clube de Jogos';
```

**O que:** o campo mostra `Clube de Jogos` em cinza e, se a pessoa não escrever nada, o grupo
**é criado com esse nome exato**. Um campo cujo placeholder é o valor padrão é o caso de
livro-texto de "achei que já estava preenchido".

**Por quê:** o nome do grupo não é decoração. Ele aparece na prateleira de **todo mundo** que
abrir o link, no rodapé da máquina, na grade de série, no cabeçalho do álbum e no PNG que o
clube manda no grupo. Trocá-lo depois não é possível por nenhuma tela deste produto — não
existe "renomear o grupo". Um clube batizado por acidente fica batizado.

**E há uma convenção do produto sendo quebrada aqui.** Todos os outros placeholders usam
`Ex.:`, justamente para não serem confundidos com conteúdo:

| Campo | Placeholder |
|---|---|
| Nome da pessoa (porta) | `Ex.: Mariana Souza` |
| Nome da pessoa (gaveta) | `Ex.: Mariana Souza` |
| Nome do jogo | `Ex.: Overcooked 2` |
| Descrição do jogo | `Ex.: Cooperativo de cozinha…` |
| Texto da resenha | `Ex.: Melhor coop que já jogamos…` |
| **Nome do grupo** | **`Clube de Jogos`** ← o único sem `Ex.:`, e o único que vira valor |

**Proposta (`XS`):** `placeholder="Ex.: Clube da Firma"`, e o nome passa a ser exigido, com a
mensagem no formato que o produto usa — problema **e** saída:

> `Dê um nome ao clube. É ele que aparece na prateleira de todo mundo que abrir o link.`

**Se manter o padrão for decisão:** então o placeholder tem que ser outra coisa. Os dois
serem a mesma frase é o que faz o erro.

---

#### O-02 · Criar o grupo e falhar ao entrar deixa a pessoa fora da própria máquina `P2` `S`

**Onde:** [create-group.ts:44](src/app/create-group.ts#L44)

```ts
const id = await this.store.createGroup(name);   // ✅ o grupo existe
rememberGroup(id, name);
if (this.joinAsFirst() && this.author()) {
  await this.store.addMember(id, this.author(), this.author());  // ❌ pode falhar aqui
}
location.hash = `#/g/${id}`;                     // nunca chega
```

**O que:** são **duas** escritas. Se a segunda falhar — rede, cota, recusa da rule —, o
`catch` mostra `Não consegui falar com o servidor.` e a pessoa continua na oficina, olhando
um formulário preenchido. **O grupo existe.** Ela não sabe.

Se ela apertar `Montar a máquina` de novo — que é o gesto óbvio diante de um erro —, ela cria
um **segundo** grupo. Agora há dois clubes com o mesmo nome na prateleira e o link certo é
uma moeda no ar.

**Por quê:** o erro descreve a última coisa que falhou, e não o estado em que a pessoa ficou.
O `DESIGN.md` cobra "o erro, com o problema e a saída" — aqui não há saída nenhuma escrita, e
o problema relatado é o menor dos dois.

**Proposta:** o `id` já está na mão. **Navegue assim mesmo.** A máquina abre com o globo
vazio, que é um estado que ela já sabe desenhar (`O globo está quase vazio`), e o aviso
carrega o que faltou:

> `A máquina foi montada, mas a sua cápsula não entrou. Abra os integrantes para carregá-la.`

O grupo existe: fingir que não existe é o pior dos dois mundos. E `rememberGroup` **já
gravou** — a prateleira mostra o grupo mesmo hoje, o que torna o silêncio ainda mais estranho.

---

#### O-03 · O `@if (author())` é galho morto `P3` `XS`

**Onde:** [create-group.html:41](src/app/create-group.html#L41)

A oficina só é renderizada por [app.html](src/app/app.html), e o `@else if` que chega nela
está atrás de `@if (!known() || changingIdentity())`. Ou seja: **quando a oficina existe,
`author()` nunca é vazio.** O `@if` e o `&& this.author()` do `create()` protegem contra um
estado impossível.

Custo real: quem ler o template acredita que existe um caminho sem crachá e desenha para ele.

---

### 2.7 A gaveta dos integrantes — [roster-bench.html](src/app/roster-bench.html)

#### R-01 · Duas pessoas podem escolher a mesma cor, e nada avisa `P1` `S`

**Onde:** [roster-bench.html:44](src/app/roster-bench.html#L44) e
[identity-gate.html:55](src/app/identity-gate.html#L55) — as duas grades de cor ·
[roster-bench.ts:142](src/app/roster-bench.ts#L142) — `chooseColor()`

**O que:** a grade oferece as 24 cores, sempre todas, sem marcar nenhuma. Nada no cliente e
**nada nas rules** impede que Breno e Cecília escolham `Ciano`. A partir daí as duas são a
mesma cápsula no aro do globo, a mesma bolinha no registro, o mesmo cartão no álbum, o mesmo
comprimido no filtro de pessoas e o mesmo confete.

**Por quê:** isto não é um detalhe de acabamento — é a **premissa do sistema visual inteiro**:

> *"A cor identifica a pessoa no globo, no registro, no crachá do cabeçalho e no álbum
> inteiro"* — `PRODUCT.md`
> *"a coleção agora distingue pessoas por temperatura, luminosidade e saturação"* — `DESIGN.md`

Quando duas pessoas colidem, a cor deixa de identificar **sem que nada na tela mude de
comportamento**. O produto continua funcionando e passa a mentir baixinho.

**E a colisão também acontece sozinha.** `defaultColorIndex(position)` é
`(position × 11) mod 24` ([palette.ts:57](src/app/palette.ts#L57)), com `position` sendo o
total de membros que o grupo **já teve**. Ela é injetiva nos primeiros 24 — e depois volta ao
começo:

| Posição | Cor |
|---|---|
| 0 (1ª pessoa) | 0 — Breu |
| 1 | 11 — Broto |
| … | … |
| 23 (24ª pessoa) | 13 — Girassol |
| **24 (25ª pessoa)** | **0 — Breu, a mesma da 1ª** |

Ou seja: **a 25ª pessoa que um grupo já teve nasce com a cor da 1ª**, automaticamente, sem
ninguém escolher nada. E se a 1ª ainda estiver ativa, o clube ganha duas cápsulas idênticas.

**O teto piora a conta:** `MAX_MEMBERS = 60`
([group-log.ts:356](src/app/group-log.ts#L356)) contra **24 cores**. Um grupo cheio tem, por
construção, no mínimo **36 colisões**. A cor simplesmente não escala até onde o produto
deixa o grupo crescer.

**Proposta, em duas camadas:**

1. **`S` — marcar o que já é de alguém, sem proibir.** Na grade, a cor ocupada ganha um
   ponto e o rótulo acessível diz de quem: `aria-label="Ciano — já é de Breno"`. Não bloqueia:
   alguém pode querer, e bloquear quebraria quem volta ao grupo com a própria cor. Resolve o
   caso comum, que é a colisão por não saber.
   Isso vale nas **duas** bancadas — a da gaveta e a da porta —, que já compartilham a mesma
   grade e a mesma lista de emoji.
2. **`M` — decidir o que a cor significa depois de 24.** Três saídas honestas, e é decisão de
   produto, não de acabamento:
   - baixar `MAX_MEMBERS` para 24 e dizer por quê (uma cor por pessoa é a promessa);
   - crescer a paleta pelo fim, como o `HANDOFF` já permite explicitamente — de 24 para 48
     mantendo `STRIDE` primo com o novo tamanho (11 continua servindo: `mdc(11, 48) = 1`);
   - assumir que acima de 24 **o emoji** é o que distingue, e promovê-lo na interface — o que
     hoje ele não é: no álbum ele fica *do lado* do comprimido, e no registro não aparece.

**Prova que falta:** não medi quantos grupos reais passam de 24 pessoas — provavelmente
nenhum. O achado vale mesmo assim, porque a colisão **manual** acontece no segundo membro.

**O mesmo vale para o emoji**, e é mais fácil de acontecer: 24 sugestões, e dois `🎮` num
clube de jogos é o resultado esperado, não o azar.

---

#### R-02 · `Tirar do globo` mora na fileira do `Salvar`, e não pergunta nada `P2` `S`

**Onde:** [roster-bench.html:104](src/app/roster-bench.html#L104) ·
[roster-bench.ts:122](src/app/roster-bench.ts#L122)

```ts
protected askRemove(member: GroupMember): void {
  this.remove.emit(member);   // o "ask" de novo não pergunta
}
```

**O que:** a bancada de uma cápsula é onde se **troca a cor**. As três ações do rodapé são
`Salvar a cápsula` · `Voltar` · `Tirar do globo`. A terceira tira a pessoa do grupo, na hora.

**Por quê:** entra-se ali para uma tarefa inofensiva e encontra-se, na mesma fileira, a ação
que muda o bolo da rodada para todo mundo. É o mesmo desenho do F-03, e o mesmo nome de
método que promete perguntar e não pergunta.

**Atenuante real:** é reversível. Recarregar a pessoa devolve a cápsula dela — `replay()`
preserva `colorIndex` e `emoji` quando um `member_added` reencontra alguém que já existiu
([FIREBASE.md](FIREBASE.md)). Por isso é `P2`, e não `P1` como o `Retirar o jogo`.

**Proposta:** o desfazer do aviso (ver T-04) resolve melhor do que uma confirmação aqui —
`Breno saiu do globo. Desfazer` — porque a ação é reversível de verdade e um diálogo para
cada remoção atrapalha quem está limpando a lista depois de uma temporada.

---

#### R-03 · O teto de 60 cápsulas só aparece quando a 61ª é recusada `P3` `XS`

**Onde:** [roster-bench.html:110](src/app/roster-bench.html#L110) ·
[synced-group.ts:338](src/app/synced-group.ts#L338)

A gaveta mostra `{{ members().length }} / {{ maxMembers() }} cápsulas no globo` no alto — o
que está certo — mas o botão `Carregar` continua ativo no limite, e o aviso
`O globo comporta até 60 cápsulas.` só chega depois do envio.

É `P3` porque 60 é longe. Mas a correção é uma linha (`[disabled]="busy() || cheio()"`) e o
contador já está na tela para explicar o motivo sem uma palavra a mais.

---

### 2.8 O pôster do álbum — [album-poster.ts](src/app/album-poster.ts)

#### PO-01 · O aviso diz que salvou mesmo quando não salvou `P1` `S`

**Onde:** [group-history.ts:441](src/app/group-history.ts#L441)

```ts
const link = this.document.createElement('a');
link.href = url;
link.download = `album-${slug(snap.name)}.png`;
link.click();
this.showNotice('O álbum foi salvo como imagem.');   // sempre
```

`link.click()` **nunca lança**. O `catch` só cobre a falha do desenho no canvas; ele não sabe
— nem pode saber — se o navegador aceitou o download. O aviso de sucesso é incondicional.

**Onde isso importa:** o `download` de um `blob:` é o ponto mais irregular entre navegadores
móveis. No Safari do iOS o comportamento histórico é **abrir a imagem** em vez de baixá-la,
e em navegadores dentro de apps (o do Instagram, o do WhatsApp) o gesto pode simplesmente não
fazer nada. Em qualquer um desses casos a pessoa lê `O álbum foi salvo como imagem.` e vai
procurar um arquivo que não existe.

**Prova que falta, e ela é decisiva:** **não tenho um iPhone nesta máquina.** Não medi. O
comportamento é conhecido e documentado há anos, mas para este produto, neste ano, o certo é
abrir o álbum num iPhone e num Android antes de mexer. Se o download funcionar nos dois, este
achado cai para `P3` (o aviso incondicional continua errado, mas não engana ninguém).

**Proposta, e ela é melhor mesmo se o download funcionar:** `navigator.share` com arquivo.

```
se navigator.canShare?.({ files: [png] }):
    navigator.share({ files: [png], title: nome do grupo })
senão:
    o link de download de hoje
```

O motivo é o próprio produto: *"a imagem é lida no grupo do clube, longe do produto"*. O
caminho real é **álbum → WhatsApp**, e `navigator.share` abre a folha nativa direto no
WhatsApp — pulando o download, a galeria e o anexar. Um toque em vez de quatro, e o iOS deixa
de ser um caso especial porque o Share é onde o iOS é bom.

E o aviso passa a ser honesto: `share()` devolve uma promessa que **rejeita** quando a pessoa
cancela.

**Cuidado com a Regra do Pôster Sem Link:** compartilhar o **arquivo** continua não levando
URL nenhuma. `navigator.share` com `files` e sem `url` é exatamente isso — não passe `url`.

#### PO-02 · De 48 para 49 fichas, o pôster vira outro formato `P2` `S`

**Onde:** [album-poster.ts:37](src/app/album-poster.ts#L37)

```ts
const columns = cards.length <= 1 ? 1 : cards.length <= 8 ? 2
              : cards.length <= 18 ? 3 : cards.length <= 48 ? 4 : 8;
```

A escada é 1 · 2 · 3 · 4 · **8**. Faltam o 5, o 6 e o 7, e é justamente aí que ela quebra.

**Calculado**, para cada tamanho de coleção:

| Fichas | Colunas | Largura × altura | Proporção |
|---|---|---|---|
| 8 | 2 | 1024 × 2152 | **0,48** |
| 18 | 3 | 1496 × 3072 | **0,49** |
| 36 | 4 | 1968 × 4452 | 0,44 |
| **48** | **4** | **1968 × 5832** | **0,34** ← quase 1:3 |
| **49** | **8** | **3856 × 3532** | **1,09** ← quase quadrado |
| 120 | 8 | 3856 × 7212 | 0,53 |

Uma ficha a mais, e a imagem passa de uma **tira de 1:3** para uma **folha quase quadrada com
o dobro da largura**. E 1:3 é o pior formato possível para o destino real: numa conversa de
WhatsApp, uma imagem dessa proporção vira uma tirinha, e aberta em tela cheia cada ficha
ocupa um doze avos da altura de um celular.

**Proposta:** em vez da escada fixa, escolher o número de colunas que **aproxima a imagem de
um retrato** — `0,8` é o formato que uma conversa mostra melhor. É uma linha de conta, e
suaviza tudo:

| Fichas | Hoje | Proposto | Proporção hoje → proposta |
|---|---|---|---|
| 8 | 2 col | **3 col** | 0,48 → **0,88** |
| 18 | 3 col | **4 col** | 0,49 → **0,75** |
| 24 | 4 col | **5 col** | 0,64 → **0,93** |
| 36 | 4 col | **6 col** | 0,44 → **0,95** |
| 48 | 4 col | **6 col** | 0,34 → **0,73** |
| 49 | 8 col | **7 col** | 1,09 → **0,96** |
| 60 | 8 col | **7 col** | 0,97 → **0,76** |

E o salto entre 48 e 49 desaparece: 0,73 → 0,96, em vez de 0,34 → 1,09.

**O teto de rasterização continua valendo** e não muda: 32 megapixels e 16.384px por
dimensão já são respeitados, e nenhuma das larguras propostas chega perto.

#### PO-03 · A fonte de emoji do pôster tem nome de Windows `P3` `XS`

**Onde:** [album-poster.ts:19](src/app/album-poster.ts#L19)

```ts
const EMOJI = '"Segoe UI Emoji", sans-serif';
```

`Segoe UI Emoji` existe no Windows e em mais lugar nenhum. No Android, no iOS, no macOS e no
Linux a cadeia cai para `sans-serif`, e quem desenha o emoji passa a ser a fonte de sistema
— que normalmente funciona, mas por acidente e não por escolha.

O emoji da pessoa é a faixa de cada ficha impressa. Vale nomear a cadeia inteira:
`"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif` — a mesma cadeia que
o resto do mundo usa, e nenhuma dela precisa ser baixada.

**Prova que falta:** não capturei o PNG num Mac nem num Android. O achado é de leitura, não
de medição.

---

### PO-04 · Gerei o pôster e olhei para ele

Interceptei o `createObjectURL` do `savePoster()` para capturar o PNG sem baixá-lo, e abri os
dois — a parede por rodada e a parede por diversão. **2048 × 3384px, 442 KB**, cinco fichas
em duas colunas. A proporção medida (0,61) bate exatamente com o modelo do PO-02.

O que o desenho acerta, e é bastante: a faixa na cor de quem escolheu com o emoji dela, o
picote, a nota nas quatro tintas (`9,2` em ciano, `7,5` em tinta preta), `Lacrada` no lugar
da nota, a inicial `F` para Fátima que não escolheu emoji, e o cartão em branco com o fio
tracejado. Cada regra nomeada está de pé no arquivo.

E a **Regra da Medida em Foco** está correta onde importa: ordenando a parede por *Diversão*,
o pôster continua imprimindo `NOTA DO CLUBE` em todos os cartões, e a linha do cabeçalho diz
`5 fichas nesta coleção · Por diversão`. É exatamente o que o `DESIGN.md` promete.

Três coisas que só aparecem olhando:

#### PO-05 · A coleção não tem datas nem rodadas `P2` `S`

Nenhum cartão diz **quando**. Nem a data do giro, nem a rodada. A única data no arquivo é a
do rodapé — `Coleção de 07/09/2026` —, que é o dia da exportação, a menos útil das duas.

Na tela, cada cartão traz `Cápsula 3 · 21/08/26`, e a parede é cortada por réguas de rodada
(`RODADA 1 · 5 cápsulas`). O pôster achata tudo numa grade contínua.

A Regra do Pôster Sem Link justifica os cortes — *"Critérios, completude e descrição saíram:
a imagem é lida no grupo do clube, longe do produto e num tamanho que ninguém amplia"* — e a
justificativa é boa para critérios e completude, que são letra miúda. **A data não é letra
miúda: é a espinha de uma coleção.** Um clube olhando o pôster um ano depois não consegue
dizer o que veio antes.

**Proposta:** a data cabe onde já há espaço de sobra — ao lado de `escolheu`, em 15 unidades,
a mesma escala que aquela palavra já usa. E a régua de rodada custa uma fileira de ~40
unidades por rodada, com o mesmo desenho de filete que o cartão do álbum já tem.

Se só uma couber, é a **data**: ela funciona em qualquer ordem, e a régua de rodada só faz
sentido na ordem padrão.

#### PO-06 · O cartão sem jogo é um retângulo vazio de 428 unidades `P3` `S`

O cartão de Cecília ocupa o mesmo espaço de um cartão cheio para dizer duas palavras. Na
imagem, mais da metade da área dele é um tracejado vazio.

Na tela isso não incomoda — os cartões têm altura variável e o vazio encolhe. No pôster a
altura é fixa em `CARD_H = 428`, e o vazio fica inteiro.

Para uma imagem que vai a uma conversa, um quinto da área dizendo "não escrevemos este"
compete com os quatro que o clube quer mostrar.

**Proposta:** ou o cartão em branco encolhe (meia altura, com a grade se fechando por
baixo), ou ele sai da imagem e o cabeçalho conta: `5 fichas · 1 sem jogo escrito`. A segunda
é mais barata e provavelmente melhor — quem exporta quer mostrar o que o clube jogou.

**Contra:** o cartão em branco é um convite ("falta escrever este"), e tirá-lo da imagem tira
o convite justamente de onde o clube inteiro está olhando. Se essa for a intenção, ele fica —
mas então merece dizer mais do que `Sem jogo escrito`.

#### PO-07 · O lacre é de uma pessoa, e a imagem é do clube inteiro `P2` `S`

Nos dois pôsteres, dois cartões dizem `Lacrada` — porque **eu, que exportei**, não resenhei
aqueles jogos. A `A Regra do Lacre` diz que *"o lacre vale também na imagem"*, e a
implementação obedece.

Só que a imagem **não é minha**: ela vai para a conversa do clube. E aí ela vira as duas
coisas erradas ao mesmo tempo:

- **Esconde de quem podia ver.** Breno já resenhou *Lethal Company*. Ele recebe uma imagem
  que esconde dele uma nota que ele tem todo o direito de ler, sem nenhuma pista do motivo —
  o lacre é meu, e ele não tem como saber disso.
- **E mostra a quem não devia.** Se quem exporta já resenhou tudo, o pôster sai com **todas**
  as notas — e cai na conversa onde está quem ainda não escreveu a dela. O lacre daquela
  pessoa é furado por um botão que outra pessoa apertou.

Não é defeito de implementação: é a consequência de um estado **por pessoa** viajar num
artefato **por grupo**, e ela não aparece em lugar nenhum da documentação.

**Proposta (`XS`), a mais honesta e a mais barata:** a linha ao lado do botão já avisa uma
coisa importante — `O link do grupo não vai na imagem.` Ela ganha a segunda:

> `O link do grupo não vai na imagem. Os jogos que você ainda não resenhou saem lacrados.`

Isso resolve a primeira metade (quem exporta sabe o que o clube vai receber) e **não**
resolve a segunda, que é uma decisão de produto de verdade:

- **lacrar sempre na imagem, para todos** — protege quem não escreveu, e esconde de quem já
  escreveu;
- **nunca lacrar na imagem** — a imagem é do clube, o lacre é da tela; simples de explicar,
  mas fura o lacre de quem ainda deve;
- **manter como está** — o lacre de quem exporta, dito na linha do botão.

**Recomendação: manter como está, e dizer.** É a única das três em que ninguém é surpreendido:
quem exporta sabe, e quem recebe vê `Lacrada` como parte do mundo do produto — que é a mesma
palavra que ele já vê na própria tela.

#### PO-08 · Ordenado por diversão, o pôster imprime 5,0 antes de 9,0 `P2` `S`

O `DESIGN.md` prevê o risco e o responde com a linha do cabeçalho (`Por diversão`). Olhando o
arquivo, essa linha não é suficiente em um caso específico: como o pôster imprime **sempre a
nota do clube**, e a ordenação é por **outro** número, os valores impressos podem sair fora
de ordem na cara de quem lê.

**Construí o caso e exportei.** Semeei um clube de dois jogos em que a diversão e a nota
andam em direções opostas:

```
Festa Boba        | nota do clube 5,0 | diversão 10,0 | 3 resenhas de 3
Obra-prima Chata  | nota do clube 9,0 | diversão  3,0 | 3 resenhas de 3
```

Ordenei a parede por *Diversão* e exportei. O PNG (2048 × 1544) sai assim:

```
2 fichas nesta coleção · Por diversão

   Festa Boba            Obra-prima Chata
      5,0                     9,0
   NOTA DO CLUBE           NOTA DO CLUBE
```

**`5,0` antes de `9,0`.** A ordenação está perfeita — diversão 10,0 antes de 3,0 —, mas o
número que o cartão imprime é outro, e ele sobe. Quem receber essa imagem na conversa do
clube vê uma parede que se anuncia ordenada e mostra os valores em ordem crescente, sem
nenhum jeito de descobrir por quê.

A linha do cabeçalho diz `Por diversão`, e ela não basta: ela nomeia a régua e não a
imprime.

E com o lacre e os cartões em branco, **três dos cinco cartões não imprimem número nenhum** —
então a ordem não é verificável nem quando está certa.

**Proposta:** quando a ordem **não** for `rodada` nem `nota do clube`, o cartão imprime a
medida em foco **abaixo** da nota, pequena: `Diversão 9,4`. Duas linhas de canvas, e a imagem
passa a explicar a si mesma.

**Isto não fere a Regra da Medida em Foco** — ela diz que a nota do clube continua sendo a
protagonista impressa, e continua. O que muda é acrescentar a régua pela qual a parede foi
ordenada, que hoje só existe como uma frase no topo.

E a proposta se paga sozinha: com `Diversão 10,0` impresso pequeno sob o `5,0`, a mesma
imagem passa de "parece errada" para "explica a si mesma" — sem tirar a nota do clube do
lugar de protagonista, que é o que a regra protege.

---

## 3. Achados transversais

### A-01 · A saída da porta era tinta de papel sobre esmalte — 2.74:1 `P0` `XS` ✅ FEITO

**Onde:** [identity-gate.html:129](src/app/identity-gate.html#L129) · [styles.scss:942](src/styles.scss#L942)

**O que:** o `VOLTAR` que aparece quando alguém está **trocando de pessoa** usa a classe
`.capsule-back`, que é a saída da **bancada de papel** e por isso pinta em `--ink-quiet`
(`#5b6779`). Sobre o esmalte (`#10233f`) isso mede **2.74:1** — abaixo dos 4.5:1 que o
produto promete. No `:hover` a herança piorava: `--ink` (`#16233a`) sobre esmalte é **1.10:1**,
praticamente invisível.

**Por quê:** é a única saída daquela tela. Quem abriu a porta por engano — clicou no crachá
sem querer — precisa achar esse controle para não trocar de identidade. E ele estava
falhando o mínimo de contraste do próprio projeto em **todas as três larguras** medidas.

**Prova:** `npm run test:a11y` acusava `{"cls":"capsule-back gate-back","px":10,"razao":2.74,
"alvo":4.5}` em 1440, 900 e 390 — três dos "17 telas × 3 larguras, 0 achados" que o
[README](README.md) promete. A suíte estava **vermelha em main** antes desta branch.

**Feito:** `.gate-back` passa a usar `--chrome` (**12.96:1**) e, no hover, `--white` sobre o
mesmo véu de `.back-link`. Não é uma cor nova — é exatamente a tinta que a saída do
cabeçalho já usava, e a Regra da Saída no Alto diz que as duas são a mesma coisa.

**Depois:** `npm run test:a11y` → **0 achados**.

---

---

### T-01 · `test:migration` deixa um emulador zumbi segurando a porta 8080 `P2` `XS`

**Onde:** [tests/free-ports.mjs](tests/free-ports.mjs) · o encerramento das suítes de emulador

**O que:** ao terminar, `npm run test:migration` (e as outras que sobem emulador) mata o hub
do Firebase, mas o **processo `java` do Firestore sobrevive**. O log da própria suíte já
mostra o sintoma:

```
! Firestore Emulator has exited upon receiving signal: SIGKILL
```

O que ficou de pé, nesta máquina:

```
java.exe ... cloud-firestore-emulator-v1.22.0.jar --host 127.0.0.1 --port 8080
         --project_id migracao-teste --single_project_mode true
```

**Por quê:** ele segura a 8080 com o **project id errado** e **sem o emulador de auth**.
Consequência: `npx firebase emulators:start` recusa ("port taken"), e as suítes de navegador
falham com achados que não têm nada a ver com o que se está testando —
`FAIL a máquina carrega o grupo`, `o registro lista os giros -> 0`, e depois um
`TypeError: Cannot read properties of undefined` no meio do e2e da etiqueta. Custou uma
rodada inteira de investigação nesta sessão.

**Aconteceu duas vezes nesta sessão**, nas duas rodadas completas de suítes — não é acaso.
Na segunda, o processo era o mesmo, com o mesmo `--project_id migracao-teste`.

**Como sair:** `Stop-Process` no `java.exe` da 8080 e subir o emulador de novo com
`--only firestore,auth`.

**Proposta:** `free-ports.mjs` já libera as portas **antes**; ele precisa fazer o mesmo
**depois**, ou o encerramento precisa esperar o `java` morrer. E vale uma linha na seção de
armadilhas do [HANDOFF.md](HANDOFF.md): *"suíte de navegador falhando em `carrega o grupo`?
confira quem está na 8080 antes de procurar no app."*

---

### T-02 · Sem rede, o `Atualizar` diz `LIDO AGORA` — e não leu nada `P1` `S`

**Onde:** [synced-group.ts:633](src/app/synced-group.ts#L633) — `refresh()` ·
[:639](src/app/synced-group.ts#L639) — `loadedAgo()` ·
[group-store.ts:111](src/app/group-store.ts#L111) — `load()`

**Medido** (Chrome headless, máquina aberta e carregada, rede desligada por CDP **sem
recarregar**, clique em `Atualizar`):

| t | rótulo | desabilitado | erro na tela | aviso |
|---|---|---|---|---|
| 1s | `Atualizar` | não | — | — |
| 4s | `Atualizar` | não | — | — |
| 9s | `Atualizar` | não | — | — |

E a linha de frescor: **`LIDO AGORA`** → `LIDO HÁ 11S` → `LIDO HÁ 17S`.

**O que aconteceu:** o `getDoc` do doc do grupo foi **atendido pelo cache em memória do
SDK** — o documento já tinha sido lido nesta sessão. Do ponto de vista de `load()` a leitura
deu certo: sem exceção, `lastLoadedAt` recebe `Date.now()`, e o relógio de frescor
**reinicia**.

**Por quê isto é `P1`:** `lido há N` é o **único** sinal que o produto dá de que a tela pode
estar velha (ver M-01). Offline, ele passa de sinal fraco a **sinal errado**: ele afirma
frescura exatamente no momento em que não pode haver nenhuma. Alguém no bar, com sinal ruim,
aperta `Atualizar`, lê `lido agora` e conclui que ninguém girou. Pode ter girado.

**Proposta:** `load()` precisa distinguir "veio do servidor" de "veio do cache do SDK". Duas
saídas, e a segunda é melhor:

1. `getDocFromServer()` no `refresh()` explícito. Direto, mas troca um problema por outro:
   sem rede ele **rejeita**, e aí o erro genérico aparece — que é melhor que a mentira, mas
   ainda não é a verdade.
2. Ler `snapshot.metadata.fromCache` — o SDK já entrega esse bit de graça, sem custo nenhum.
   `lastLoadedAt` só avança quando `fromCache === false`; quando é `true`, a linha diz
   `sem rede — lido há N`. É a informação certa, pelo caminho que já existe.

**Recomendação: (2).** E ela cobre também o caso silencioso em que a rede oscila sem
ninguém apertar nada.

**Prova que falta:** não confirmei o comportamento do `fromCache` contra a produção — só
contra o emulador. A semântica do campo é a mesma, mas a checagem é barata e vale antes de
mexer.

---

### T-03 · Uma escrita sem rede congela o controle por tempo indefinido, sem uma palavra `P1` `S`

**Onde:** [group-store.ts](src/app/group-store.ts) — todas as escritas ·
[review-reactions.ts:56](src/app/review-reactions.ts#L56) — `saving`

**Medido** (mesma sessão, rede desligada, reagir a uma resenha):

| t | `aria-busy` | desabilitado | erro | aviso |
|---|---|---|---|---|
| 1,5s | `true` | sim | — | — |
| 6s | `true` | sim | — | — |
| **12s** | **`true`** | **sim** | **—** | **—** |
| rede de volta | `false` | não | — | — |

**As duas metades deste achado:**

**A boa, e ninguém sabe dela.** A escrita **não se perdeu**. O SDK do Firestore a enfileirou
e a entregou sozinho quando a rede voltou. Isso é uma propriedade excelente para um produto
que vive em mesa de bar com Wi-Fi ruim — e o produto **não conta a ninguém**.

**A ruim.** Durante os 12s (e seriam 12 minutos, se a rede demorasse), o controle fica
apagado, girando, mudo. Nada diz "sem rede", nada diz "vai quando voltar", nada oferece
cancelar. Todo botão de escrita do produto se comporta assim: a reação, a resenha, o jogo, a
mesa, a pintura da cápsula, carregar alguém no globo.

Pior no caso da **resenha**: a pessoa aperta `Guardar minha resenha`, o botão vira
`Guardando…` e trava. O reflexo é fechar a ficha — e fechar a ficha **descarta o rascunho**
(ver F-02), enquanto a escrita segue viva na fila. Os dois defeitos se somam.

**Proposta:** um relógio de ~5s sobre o estado `saving`. Passou disso, o aviso diz o que é
verdade:

> `Sem rede. Isto vai sozinho quando a conexão voltar.`

Não é erro — é estado, e é um estado **bom**. E ele decide algo para quem lê: dá para
fechar o app e ir embora. Passa no filtro da Regra do Texto que Não Explica a Máquina pela
mesma porta da confirmação do giro: é a consequência de um gesto, não o mecanismo dele.

**Cuidado:** não transformar isto em erro nem em botão de "tentar de novo". Tentar de novo
gravaria **duas** vezes — e no caso do giro, duas vagas do bolo.

---

### T-04 · O aviso do rodapé não tem ação, e três achados diferentes precisam de uma `P2` `S`

**Onde:** [notice.ts](src/app/notice.ts)

`Notice` é texto e relógio. Não tem ação. E os achados P-01 (esquecer uma máquina), R-02
(tirar alguém do globo) e F-03 (retirar a própria resenha) pedem todos a **mesma** coisa: um
`Desfazer` que não interrompa.

**Por que o desfazer é melhor que a confirmação nestes três:** todos são **reversíveis de
verdade** — a máquina volta à prateleira, a pessoa volta ao globo com a própria cápsula
(`replay()` preserva `colorIndex` e `emoji`), a resenha se reescreve. Um diálogo por
remoção atrapalha quem está limpando a lista depois de uma temporada; um desfazer não
atrapalha ninguém e cobre o engano.

**Onde a confirmação continua sendo a resposta certa:** `Retirar o jogo` (F-03), porque o
que se perde é **conteúdo escrito** que ninguém consegue reconstruir de cabeça, e porque o
estrago é coletivo.

**Proposta:** `show(message, acao?)` com `{ rotulo, executar }`, e o botão renderizado no
lugar onde o `.toast button` já tem estilo (amarelo, 42px) — ele existe no CSS e hoje só o
`.toast-close` o usa. O relógio único que a classe já garante continua valendo: um desfazer
por vez, e o próximo aviso substitui o anterior.

**Cuidado medido:** o toast recolhido já era uma armadilha de teclado (M-02). Um botão de
ação dentro dele precisa da mesma proteção — `tabindex="-1"` quando não há aviso.

---

### T-05 · Não há Open Graph, e o produto **é** um link colado no WhatsApp `P2` `XS`

**Onde:** [src/index.html](src/index.html)

**O que:** o `<head>` tem `title`, `description`, `theme-color`, `lang="pt-BR"` e favicon —
tudo certo. Não tem **nenhuma** tag `og:` nem `twitter:`.

**Por quê isto importa mais aqui do que na média dos produtos:** o modelo de distribuição
inteiro é *"um grupo é um link"*. Não há convite, não há e-mail, não há busca. O link é
colado numa conversa de grupo, e a primeira impressão do produto — para todo mundo que ainda
não é usuário — é o **cartão de prévia** que o WhatsApp desenha. Sem `og:image`, esse cartão
é uma linha de texto cinza.

**E o desenho é fácil aqui, por um motivo bom:** o id do grupo mora no **fragmento**
(`#/g/<id>`), que nem o servidor nem o robô de prévia recebem. Então a prévia é
**necessariamente genérica** — a mesma para todos os grupos. Isso é privacidade de graça: o
nome do clube nunca vaza para o robô, e a Regra do Pôster Sem Link continua de pé, porque
não há nada de específico a vazar.

**Proposta (`XS`):** `og:title`, `og:description`, `og:type=website`, `og:locale=pt_BR`,
`og:image` (1200×630 estático em `public/`, a cápsula sobre o esmalte — o mesmo desenho que
o pôster do álbum já sabe fazer) e `twitter:card=summary_large_image`.

**De brinde, quase de graça:** um `apple-touch-icon` de 180×180. Quem abre a máquina toda
semana no celular vai querer "adicionar à tela de início", e hoje o ícone que aparece é uma
captura da página.

---

### T-06 · Sem JavaScript, a página é branca e não diz nada `P3` `XS`

**Onde:** [src/index.html](src/index.html) — não há `<noscript>`.

O corpo é `<app-root></app-root>`. Com JS bloqueado — extensão, política corporativa,
navegador de dentro de um app — o link do clube abre uma página em branco, sem uma linha.

Um `<noscript>` com uma frase custa nada e evita que o link pareça quebrado:
`A Mesa do Mês precisa de JavaScript para desenhar a máquina.`

---

### T-07 · A cena de abertura cobra 4,3 s de toda visita, e não há como sair dela `P1` `S`

**Onde:** [synced-group.ts:698](src/app/synced-group.ts#L698) — `if (!keepSpinning &&
!this.greeted && snapshot.state.lastSpin) this.playScene();`

**Medido** (Chrome headless, 1440×1000, grupo `demo`, do primeiro desenho em diante):

```
primeiro título na tela:  1ms   →  "Entregando"
nome do vencedor visível: 4283ms
botão Girar liberado:     4283ms
controle para pular:      nenhum
```

E o que está e o que não está disponível durante esses 4,3 s:

| | t ≈ 0,3s | t ≈ 2,3s | t ≈ 4,9s |
|---|---|---|---|
| título do palco | `Entregando` | `Entregando` | **`Breno 🍕`** |
| etiqueta do jogo no palco | ausente | ausente | presente |
| botão `Girar` | desabilitado | desabilitado | liberado |
| globo clicável (rever) | **não** | **não** | sim |
| células do registro | **5** | **5** | 5 |
| recado do que eu devo | **1** | **1** | 1 |
| integrantes · álbum | **1 · 1** | **1 · 1** | 1 · 1 |

**A parte que está certa, e que não deve ser mexida.** Encenar a entrega ao abrir é uma
decisão de produto defendida em três documentos: *"abrir a página encena a entrega de novo"*,
*"encenar não é decidir"*, *"a revelação deve ser especial em toda visita"*. E o resto da
página **não** está congelado: o registro, o recado, os integrantes e o álbum respondem desde
o primeiro instante. Não é uma tela travada — é um **palco** ocupado.

**A parte que falta: a saída.** O produto sabe **entrar** na cena (clicar no globo reencena) e
não sabe **sair** dela. Quem abriu a máquina para escrever a resenha do jogo de ontem, ou só
para conferir quem ganhou, paga 4,3 s por visita, todo dia, para sempre. Em dez visitas é um
minuto de espera por uma animação que a pessoa já viu dez vezes.

**Proposta:** qualquer gesto durante a cena a **termina** — clique no palco, `Esc`, ou o
próprio botão de girar. Ela salta para a posição de repouso, `revealed` vira verdadeiro, e o
confete não dispara (ele é a última batida de uma cena que não aconteceu).

Isso **não** fere a Regra do Momento Único: não é um segundo movimento, é a saída do
primeiro. E é o oposto exato do `replayScene()` que já existe — a mesma simetria de sempre.

**Duas alternativas, e por que são piores:**

- *Encenar só uma vez por sessão* (`sessionStorage`): quebra a promessa escrita de que abrir
  a página encena de novo, e some com o momento justamente para quem volta ao grupo depois de
  ir ao álbum.
- *Encurtar para 2 s*: estraga a cena para todo mundo em vez de dar saída para quem quer.

**Detalhe de acabamento:** com a saída pronta, `caption="Toque no globo para ver a entrega de
novo."` passa a ser meia verdade durante a cena. Durante ela, o rótulo do globo é
`Ir direto ao resultado`.

---

### T-08 · Superfícies do navegador: **tudo certo**, e isso é raro

Registrado porque a lista de acabamento manda conferir, e porque aqui não há o que corrigir.

| Superfície | Estado |
|---|---|
| `::selection` | tematizada (e agora com tinta AA — ver T-09) |
| `caret-color` | `--field-focus` nos campos e áreas de texto |
| barra de rolagem | `::-webkit-scrollbar` **e** `scrollbar-color`/`scrollbar-width` |
| anel de foco | `:focus-visible` amarelo de 3px, com variante nos campos |
| sublinhado de link | `text-underline-offset: .24em` + espessura de 1.5px |
| números tabulares | `font-variant-numeric: tabular-nums` em toda mono de valor |
| `::placeholder` | `--ink-quiet` com `opacity: 1` (o padrão do navegador esmaece) |
| `accent-color` | `--yellow` na caixa de seleção da oficina |
| `-webkit-tap-highlight-color` | transparente |
| `lang="pt-BR"` | presente |
| `color-scheme: dark` | presente |

É o item que a lista de acabamento diz ser o mais pulado de todos, e ele está inteiro.

---

### T-09 · Metade da paleta deixava o texto selecionado ilegível `P1` `XS` ✅ FEITO

**Onde:** [styles.scss:36](src/styles.scss#L36)

**O que:** `::selection { background: var(--live); color: var(--enamel-deep); }`. Dentro do
palco, `--live` é a **cor da cápsula vencedora** — repintada a cada giro. A tinta, porém,
era fixa em `--enamel-deep` (`#0a1830`).

**Medido** — as 24 cápsulas contra `#0a1830`:

```
  RUIM   0  Breu          #0F0F12   1.08:1     ok     2  Névoa        #B6BFBC   9.41:1
  RUIM   1  Grafite       #505359   2.30:1     ok     3  Gelo         #F2FBFF  16.88:1
  RUIM   6  Cobalto       #1D5BB8   2.73:1     ok     4  Ciano        #5EE7FF  12.10:1
  RUIM   7  Índigo        #1F2C66   1.36:1     ok     5  Azul-piscina #00A1DB   6.00:1
  RUIM   8  Pinho         #1B5245   1.97:1     ok    10  Lima         #58D92E   9.59:1
  RUIM   9  Folha         #2E8F46   4.33:1     ok    11  Broto        #CBFF70  15.24:1
  RUIM  15  Carmim        #E32239   3.84:1     ok    12  Baunilha     #FFFF8F  16.82:1
  RUIM  16  Vinho         #851540   1.84:1     ok    13  Girassol     #FFDF2B  13.35:1
  RUIM  17  Ameixa        #401A24   1.17:1     ok    14  Tangerina    #F0771A   6.20:1
  RUIM  18  Tijolo        #9C3B30   2.60:1     ok    20  Salmão       #ED8A5F   7.08:1
  RUIM  19  Terracota     #C95D3C   4.31:1     ok    21  Pêssego      #FFBCA6  10.96:1
  RUIM  23  Roxo          #77388C   2.30:1     ok    22  Rosa         #EB75BE   6.59:1

12 de 24 cápsulas abaixo de 4.5:1
```

Com **Breu a 1.08:1** e **Ameixa a 1.17:1**, selecionar o nome do jogo para copiá-lo fazia o
texto **desaparecer**.

**Por quê:** é a invariante nº 5 do [README](README.md) — *"Toda cor de cápsula alcança 4.5:1
com a tinta que ela escolhe"* — furada numa superfície que ninguém pensou em conferir.
`palette.spec.ts` prova a regra para iniciais, nomes do aro e ferragens; a seleção de texto
não estava na lista, e era o único lugar onde a tinta era **fixa** em vez de calculada.

**Feito:** `--live-ink` ganhou padrão no `:root` (`#0f0f12`, que é exatamente o que
`capsuleInkForColor('#ffc53d')` devolve para o amarelo da marca) e a seleção passa a usá-lo.
Ele **já era** publicado no palco ao lado de `--live`
([synced-group.html:90](src/app/synced-group.html#L90)) — os dois sempre andaram juntos, e a
seleção só não estava lendo o segundo.

**Depois — a paleta inteira passa:**

```
pior caso com --live-ink: Carmim a 4.61:1
amarelo padrão #ffc53d -> tinta #0F0F12 a 12.13:1  (era 11.22:1)
```

**E o número tem confirmação independente:** a suíte `e2e-roleta` do próprio projeto mede a
mesma tinta contra a mesma paleta noutro contexto — o nome dentro da cúpula — e imprime
`Contraste mínimo dos nomes: 4.611`. É o mesmo pior caso, pela mesma Carmim, calculado por
outro caminho.

**Conferido no navegador**, no palco do grupo `demo`:

```
--live do palco: #F2FBFF   --live-ink do palco: #0F0F12
seleção no palco: fundo rgb(242,251,255)  tinta rgb(15,15,18)
seleção no body:  fundo rgb(255,197,61)   tinta rgb(15,15,18)
```

---

### T-10 · O pacote é enxuto; o que sobra é fonte que ninguém pede `P3` `S`

**Medido** (`npm run build -- --base-href=./`):

| | Bruto | Transferido |
|---|---|---|
| Inicial (JS + CSS) | 310,40 kB | **79,33 kB** |
| Firebase (preguiçoso) | 545,98 kB | 140,63 kB |
| `synced-group` | 54,10 kB | 15,50 kB |
| `group-history` | 29,89 kB | 9,26 kB |
| `create-group` | 4,19 kB | 1,78 kB |

A arquitetura de carga está **certa e comprovada**: o Firebase só desce para quem abre um
grupo, e a prateleira, a oficina e a porta não pagam por ele. O CSS crítico é embutido
(`beasties`), há `modulepreload` dos dois pedaços iniciais e todas as 15 faces usam
`font-display: swap` com `unicode-range`.

**As fontes, medidas de verdade** (quais arquivos o navegador realmente pede):

| Tela | Faces pedidas | Peso real em disco |
|---|---|---|
| A porta | 4 | **73 kB** |
| A máquina | 5 | **83 kB** |

O `unicode-range` está fazendo o trabalho dele: mesmo com `Cecília` e `Fátima` na tela,
nenhum subconjunto `latin-ext` é pedido — os acentos do português vivem no Latin-1
Suplementar, que está dentro do `latin`.

**O achado é do artefato publicado, não do tempo de carga.** `dist/…/media` tem **27
arquivos e 320 kB**, dos quais só 4 a 6 são pedidos por qualquer navegador em português:

| Peso morto | Tamanho |
|---|---|
| `fredoka-hebrew-wght-normal.woff2` | 8,8 kB |
| `martian-mono-cyrillic*` (4 arquivos) | ~30 kB |
| toda a duplicata `.woff` ao lado do `.woff2` | ~113 kB |

Os `.woff` nunca são baixados — o `@font-face` lista o `woff2` primeiro e todo navegador que
roda este Angular o suporta. Eles só engordam o deploy no GitHub Pages.

**Proposta (`S`):** importar apenas os subconjuntos `latin` e apenas `woff2` — os pacotes
`@fontsource` expõem os arquivos por caminho, e a importação passa a ser explícita em vez
de por índice. Devolve ~150 kB de artefato publicado.

**O que NÃO estou propondo, e por quê:** as fontes são **83 kB contra 79 kB de todo o JS +
CSS** — elas são metade do primeiro carregamento. O reflexo seria pré-carregar as duas de
cima da dobra com `<link rel="preload" as="font">`. **Não medi a janela de troca numa rede
de verdade** — nesta máquina ela é de 20–29 ms, o que não prova nada. Um `preload` errado
custa banda antes do HTML e pode piorar. Meça num 3G estrangulado antes de decidir.

---

### T-11 · `Grupo não encontrado` é o título de **toda** falha, inclusive das que acharam o grupo `P1` `S`

**Onde:** [synced-group.html:373](src/app/synced-group.html#L373) — o ramo `@else` ·
[group-history.html:326](src/app/group-history.html#L326) — o mesmo no álbum

```html
} @else {
  <h1>Grupo não<br /><strong>encontrado</strong></h1>
  <p>{{ error() || 'O link pode estar incompleto.' }}</p>
```

Qualquer erro que deixe `snapshot()` nulo cai aqui: cota estourada, rede caída,
`permission-denied`, id errado. O título é sempre o mesmo, e para três dos quatro ele é
**falso**.

**Medido** (aparelho com `stopReason: 'read-budget'` no `localStorage`, grupo `demo` que
existe e está semeado):

```
faixa do topo : "Parada de segurança. Muitos pedidos deste aparelho hoje.
                 A máquina volta em 2026-09-09."
título (h1)   : "Grupo não encontrado"        ← o maior texto da tela, e é mentira
parágrafo     : "A máquina parou por segurança: muitos pedidos hoje.
                 Ela volta na virada do dia."
ações         : ["Voltar ao início"]
```

A página diz **três coisas ao mesmo tempo**, e a errada é a que está em `clamp(3rem, 7.4vw,
6rem)`. Quem lê o título conclui que o link morreu e vai pedir outro no grupo — o link está
perfeito.

**Proposta:** o título sai do erro, e não do ramo. Quatro títulos para quatro causas, com a
saída que cada uma tem:

| Causa | Título | Saída |
|---|---|---|
| `not-found` de verdade | `Grupo não encontrado` | `Voltar ao início` |
| `UsageBlockedError` | `A máquina parou<br>por segurança` | quando ela volta, e o registro em cache (ver T-12) |
| `permission-denied` | `O servidor recusou` | `Tente de novo` |
| rede | `Sem conexão` | `Tente de novo` |

`explain()` ([synced-group.ts:713](src/app/synced-group.ts#L713)) **já distingue as
causas** — ele só devolve texto. Devolver também um título é a mesma função com um campo a
mais.

**De brinde:** com a causa na mão, a faixa do topo para de repetir o parágrafo. Hoje a mesma
informação aparece duas vezes na mesma tela, com duas redações diferentes.

---

### T-12 · O aparelho parado tem o log inteiro no bolso e se recusa a mostrá-lo `P1` `M`

**Onde:** [group-store.ts:107](src/app/group-store.ts#L107) — `load()` ·
[:426](src/app/group-store.ts#L426) — `run()`

```ts
if (reads && !this.guard.canRead(reads)) {
  throw new UsageBlockedError(...);   // antes de sequer olhar o cache
}
```

**Medido** (mesmo aparelho parado, mas desta vez com o grupo `demo` **já visitado**, ou
seja, com `mesa-do-mes:log:v1:demo` — 5.690 bytes — íntegro no `localStorage`):

```
células do registro na tela : 0
título                      : "Grupo não encontrado"
```

**O que está acontecendo:** o guarda de uso protege a **cota de leitura do Firebase**. Mas
ler o log que já está no aparelho **não custa leitura nenhuma** — custa zero. O produto
guarda uma cópia completa exatamente para isso, e a documentação diz por quê:

> *"Uma cópia do log de cada grupo, para que abrir custe 1 leitura em vez de N."* — README

E aí, no momento em que a cota é o problema, a cópia é ignorada.

**Por quê isto é `P1`:** o mesmo caminho vale para a rede caída. O clube está no bar sem
sinal, alguém quer conferir quem ganhou o mês passado — a resposta está no aparelho, e a
tela diz `Grupo não encontrado`.

**Proposta:** `load()` ganha um degrau antes de desistir:

```
se não posso ler (cota ou rede):
    se o cache é íntegro (events.length === logVersion):
        devolve o snapshot do cache, marcado como `deCache: true`
    senão:
        aí sim, o erro
```

A integridade do cache **já é verificada** hoje, três linhas abaixo:
`const cacheIntegro = !!cached && cached.events.length === cached.logVersion`. É a mesma
condição, usada uma vez antes.

Com `deCache: true`, a tela:

- desenha tudo normalmente — o globo, o registro, o álbum, as fichas, as resenhas;
- **desabilita toda escrita** e diz por quê uma vez, na faixa que já existe;
- troca `lido há N` por `do que este aparelho guardou · há N`.

**O que precisa de cuidado:** o giro. Ele **nunca** pode sair de um estado em cache — o
vencedor depende do `request.time` do servidor, e a espera de 30s entre giros é imposta pela
rule. Ler é seguro; escrever, não. `canSpinNow()` já depende de `busy()` e do relógio: ganha
mais uma condição, e ela é a mais fácil de todas.

**Custo real:** `M`, não `S` — mexe em `group-store.ts`, que é back-end, e portanto exige
teste em `tests/group-store.test.mjs` para o caminho novo e para o caminho velho (cache
incoerente ainda tem que dar erro).

---

### T-13 · A data em que a máquina volta sai em ISO, no meio de uma frase em português `P3` `XS`

**Onde:** [usage-guard.ts:94](src/app/usage-guard.ts#L94) — `stoppedUntil: nextDay(...)` ·
[synced-group.html:67](src/app/synced-group.html#L67)

**Medido:** `A máquina volta em 2026-09-09.`

Todo o resto do produto escreve data como `dd/MM/yy` (cinco lugares) ou `dd/MM/yy HH:mm`
(três), e o pôster usa `toLocaleDateString('pt-BR')`. Este é o único `AAAA-MM-DD` que chega
à tela — e ele chega dentro de uma frase, onde mais destoa.

**Proposta:** `volta amanhã` é o que a frase quer dizer em 100% dos casos (o bloqueio é por
dia UTC e `nextDay` é sempre o dia seguinte). Se a precisão importar, `volta em 09/09`.

**Cuidado com o fuso:** `nextDay` opera em **dia UTC**. No Brasil (UTC−3), a virada acontece
às 21h do dia anterior. Dizer "amanhã" a quem está lendo às 22h de 8/9 estaria errado: para
essa pessoa a máquina já voltou. `volta na virada do dia` — que é o que o **parágrafo** já
diz — é a redação certa, e a faixa deveria copiá-la em vez de inventar uma data.

---

### T-14 · Quem ainda está no globo é informação exclusivamente visual `P2` `S`

**Onde:** [machine.html:11](src/app/machine.html#L11) — `<svg aria-hidden="true">` ·
[machine.html:163](src/app/machine.html#L163) — o texto alternativo ·
[synced-group.html:237](src/app/synced-group.html#L237) — a grade de série

**O que:** o SVG da máquina é corretamente `aria-hidden` (é desenho), e o botão que o envolve
tem nome. O texto alternativo é:

> `Globo com {{ capsules().length }} cápsulas, uma por participante.`

Um número. Os **nomes** das pessoas que ainda estão no globo existem apenas como
`<textPath>` dentro do SVG escondido. A grade de série repete o número
(`No globo agora — 3 / 6`) e também não traz nomes.

**Por quê:** "quem ainda não saiu" **é** o produto. É a regra de não repetir tornada visível,
e é a única pergunta que alguém faz antes de girar. Quem usa leitor de tela pode derivá-la —
membros menos vencedores desta rodada, lendo o registro inteiro — mas derivar não é ler.

**Proposta (`XS`, e é a mais barata possível):** o texto alternativo passa a nomear:

> `Globo com 3 cápsulas: Ana, Davi e Fátima.`

Vira uma frase de verdade em vez de uma contagem, e o dado já está em `pool()`.

**Proposta melhor (`S`), e que serve a todo mundo:** a célula `No globo agora` da grade de
série ganha os nomes abaixo do `3 / 6`, em mono pequena. Quem enxerga também ganha: hoje,
para saber quem falta, é preciso ler nomes de 8–17px curvados num arco.

**Cuidado com o teto:** com muita gente a lista fica longa. `Ana, Davi e mais 12` resolve, e
o `visually-hidden` pode trazer a lista inteira, onde comprimento não custa layout.

---

### T-15 · O nome no aro derrete com o tamanho do clube, e a cor pode não socorrer `P2` `M`

**Onde:** [machine.ts:94](src/app/machine.ts#L94)

```ts
const fontSize = Math.min(17, Math.max(8, 46 / Math.sqrt(count)));
const arcLength = (2 * Math.PI * GLOBE.label) / count;
const budget = Math.floor((arcLength * 0.82) / (0.62 * fontSize));
```

**Calculado** — quantas letras cabem no aro, por tamanho de clube:

| Pessoas | Fonte | Arco | Letras no aro |
|---|---|---|---|
| 2 | 17,0 | 439,8 | 34 |
| 6 | 17,0 | 146,6 | 11 |
| 10 | 14,5 | 88,0 | 7 |
| 16 | 11,5 | 55,0 | 6 |
| **24** | **9,4** | **36,7** | **5** |
| 30 | 8,4 | 29,3 | 4 |
| 40 | 8,0 | 22,0 | 3 |
| **60** (`MAX_MEMBERS`) | **8,0** | **14,7** | **2** |

A degradação em si é **decisão documentada** e correta — *"A degradação — primeiro nome,
iniciais, uma letra — existe apenas dentro do aro do globo, onde o comprimento do arco
manda"*. O nome inteiro sempre aparece no `h1`.

**O que não está documentado é onde ela encontra a R-01.** A partir de 24 pessoas as duas
defesas caem juntas:

- o **nome** no aro vira 5 letras, depois 4, depois 2, a 8px;
- a **cor** repete, porque a paleta tem 24 e `defaultColorIndex` volta ao começo na 25ª.

Num clube de 40, duas pessoas podem ser `An` em tangerina e `An` em tangerina. O aro deixa de
identificar qualquer um, e o produto não avisa.

**Proposta:** é a mesma decisão do R-01, item 2 — decidir o que a cor significa acima de 24.
Enquanto ela não for tomada, o achado fica aqui como a metade visível do mesmo problema.

**Prova que falta:** não capturei o aro com 40 cápsulas. A tabela é aritmética do código, não
medição de tela; o tamanho real do glifo depende da fonte. Semear um grupo grande e olhar é
uma tarde de trabalho e resolveria os dois achados de uma vez.

---

### T-16 · O clube grande, medido de verdade: semeei 40 pessoas e olhei

As hipóteses de escala do R-01 e do T-15 não precisavam ficar como hipóteses. Semeei um
grupo `grandao` no emulador com **40 pessoas**, nenhuma escolhendo cor — todas recebendo a
cor automática de `defaultColorIndex(posição)` —, cinco giros e cinco jogos escritos. O que
a tela mostra:

#### T-16a · 32 das 40 pessoas dividem a cápsula com outra `P1`

Contado no replay, antes de qualquer tela:

```
membros: 40   |   cores distintas usadas: 24   |   cores com mais de uma pessoa: 16

cor  0 -> Ana Paula Ribeiro + Yasmin Correia      cor 14 -> Isabela + Kaique
cor  1 -> João Pedro + Lívia                      cor 16 -> Gabriela + Ítalo
cor  3 -> Henrique Mota + Joana Marques           cor 18 -> Eduarda Pires + Gustavo Henrique
cor  5 -> Felipe + Helena                         cor 20 -> Carla + Elisa Fontes
cor  7 -> Diego + Fátima                          cor 21 -> Nicolas + Priscila Andrade
cor  9 -> Bruno Salgado + Davi                    cor 22 -> Amanda + Cecília Nogueira
cor 10 -> Mariana + Otávio                        cor 23 -> Leonardo Reis + Natália
cor 11 -> Breno + Zeca                            cor 12 -> Karina + Marcos Vinícius
```

Não é um caso de borda nem um usuário mal-intencionado escolhendo a cor de outro: é o que
**o produto faz sozinho** com um clube de 40 pessoas, que ele mesmo permite até 60.

#### T-16b · No aro, o nome vira uma letra de 8px sobre uma cor repetida `P1`

Medido no DOM, 1440×1000, com a cena de abertura terminada:

```
cunhas no aro                 : 36
tamanho da fonte do nome      : 8px
rótulos com até 3 caracteres  : 33 de 36
os primeiros catorze          : X · EF · R · Ú · Q · Zeca · JM · O · LR · Ana · A · L · B · PA
cores distintas no aro        : 22
cores com mais de uma cunha   : 14
texto alternativo do globo    : "Globo com 36 cápsulas, uma por participante."
```

Uma cunha diz **`A`**, em **8px**, numa cor que **outra pessoa também tem**. As três defesas
da identidade — nome, cor e emoji — caem juntas, e o texto alternativo não socorre ninguém
porque ele não traz nome nenhum (ver T-14).

Isto **confirma** o cálculo do T-15 na tela: a tabela previa 3 letras a 8px para 40 pessoas,
e a tela entrega 1 a 3 letras a 8px. E confirma o R-01 com dados: 14 pares de cunhas
idênticas.

#### T-16c · `Compartilhar` fica a 2.935px do topo da gaveta `P1` `S`

**Onde:** [roster-bench.html:167](src/app/roster-bench.html#L167)

Medido, com a gaveta aberta:

| | Desktop 1440×1000 | Celular 390×780 |
|---|---|---|
| Altura do conteúdo da gaveta | **3.193px** | **3.240px** |
| Altura visível | 864px | 644px |
| Rolagem necessária | **2.329px** | **2.596px** |
| Posição do bloco `Compartilhar` | **2.935px** | **2.987px** |
| Linhas de pessoa | 40 | 40 |

**Por quê isto é `P1` e não um detalhe de lista longa:** *"Um grupo é um link."* É a primeira
frase do README e do PRODUCT. O link **é** o produto — é como se entra, é a credencial, é a
única forma de convidar alguém. E `Copiar link do grupo` está **depois de quarenta linhas de
administração**, num painel que rola 2,6 mil pixels no celular.

Para chamar alguém novo para o clube, a pessoa abre os integrantes e rola a lista inteira.

E a hierarquia diz o contrário do que o produto é: a gaveta se apresenta como
`Integrantes`, com o formulário de adicionar no topo e a lista no meio; compartilhar aparece
como um apêndice no rodapé, junto do `Fechar`.

**Proposta:** o link sobe. Três formas, da mais barata para a melhor:

1. **`XS`** — o bloco `Compartilhar` vai para **antes** da lista, logo abaixo do contador
   `40 / 60 cápsulas no globo`. Custa mover um bloco no template.
2. **`S`** — compartilhar deixa de ser parte da gaveta de administração e vira o que é: um
   comprimido próprio na nav (`Integrantes` · `O álbum` · `Som` ganha um quarto). Casa com a
   Regra das Duas Barras, e o alvo já é de 44px.
3. **`S`** — as duas: o comprimido na nav para o caso comum, e o campo com o link dentro da
   gaveta para quem quer copiar à mão.

**Recomendação: (1) agora, (2) se couber na fileira.** A fileira do celular já tem três
comprimidos e a Regra das Duas Barras avisa que ela não pode quebrar por dentro — um quarto
precisa ser medido a 320px antes de entrar.

#### T-16d · O aro mostra 36 cunhas e a grade de série diz 35 `P3` `XS`

Na mesma tela, ao mesmo tempo:

```
cunhas desenhadas no globo : 36
"NO GLOBO AGORA"           : 35 / 40
```

Os dois estão certos e dizem coisas diferentes: o aro é **a foto do instante do último
giro** (com a vencedora ainda na calha), e o contador é **o bolo de agora**. O `DESIGN.md`
explica: *"É a foto do que aconteceu, não do que sobrou."*

O que não existe é como saber disso olhando. Quem contar as cunhas encontra um a mais do que
o número escrito dois palmos ao lado.

**Proposta:** nada de explicar a máquina — a Regra proíbe, e com razão. Mas o rótulo pode
ser preciso em vez de neutro: `NO GLOBO DEPOIS DESTE GIRO`, ou o contador some enquanto o
palco mostra a foto de um giro. É uma palavra, não um parágrafo.

#### T-16e · Correção a um número que eu mesmo estimei em L-01

Em L-01 escrevi que a fileira de pessoas do álbum (222px com 6 pessoas) *"cresce com o
clube"*. **Medido, não cresce com o clube — cresce com o número de pessoas que já
ganharam.** O álbum do `grandao`, com 40 membros mas só 5 giros, tem exatamente a mesma
fileira de 222px do `demo`.

O efeito continua real, e a conta continua ruim: num clube de 40 pessoas, uma rodada
completa faz a fileira ter 41 comprimidos. Só que o prazo é de uma temporada inteira, não do
dia em que o clube cresce. A proposta de L-01 (item 2) não muda; a urgência dela, sim.

---

### T-17 · Em alto contraste do Windows, o botão de girar não existia `P0` `S` ✅ FEITO

**Onde:** [styles.scss](src/styles.scss) — não havia **nenhuma** regra
`@media (forced-colors: active)` na folha inteira.

**O que:** no modo de cores forçadas — o alto contraste do Windows, que troca toda cor de
fundo pela do sistema — as peças deste produto que se desenham por **preenchimento**, sem
borda, sem contorno e sem sombra, viravam fundo preto sobre página preta. Elas não ficavam
difíceis de ver: elas deixavam de existir como forma.

**Medido**, com `forced-colors: active` emulado, varrendo cada superfície e listando todo
controle cujo fundo é igual ao da página e que não tem borda, contorno nem sombra:

```
máquina        : who-mark · month-sticker · note-sticker · primary-action · cell-capsule
gaveta         : + roster-card · capsule-mark · secondary-action · botão "Carregar"
ficha (leitura): + sheet-card
ficha (resenha): + as onze casas de score-tick, o "—", e os três status-choice
álbum          : + album-card · a fatia "finalizado" da barra de completude
```

O detalhe do botão principal:

```
.primary-action  fundo rgb(0,0,0)  tinta rgb(255,255,255)  borda 0px none
fundo da página  rgb(0,0,0)
```

**Girar a roleta** — a ação central do produto — era texto branco flutuando no vazio.
`Montar a máquina`, `Entrar na mesa` e `Voltar ao início` são o mesmo botão.

E a régua de nota inteira: **onze casas invisíveis**, incluindo a marcada. Quem usa alto
contraste não conseguia ver onde estava a própria nota.

**Por quê isto é `P0`:** o público do alto contraste do Windows é, em boa parte, o mesmo
público para quem este produto escolheu **Atkinson Hyperlegible** — a fonte está aqui *"por
mandato de acessibilidade do produto"*. O projeto pagou o preço de uma fonte de leitura
desambiguada e perdia o botão principal para o mesmo público, num modo que ninguém tinha
ligado para conferir. E a suíte `test:a11y` passava com 0 achados o tempo todo: ela mede
contraste calculado a partir do CSS do autor, e em cores forçadas o CSS do autor não é o que
pinta a tela.

**Feito** — um bloco no fim de [styles.scss](src/styles.scss), e o fim importa: o bloco é
uma **sobrescrita**, e `.album-card { border: 0 }` vem depois no arquivo. Posto no meio, ele
perdia por ordem de origem — o que aconteceu na primeira tentativa e a varredura pegou.

1. **Volta a forma.** As peças que se desenhavam por preenchimento ganham
   `border: 1px solid ButtonText` — a borda que o preenchimento fazia, na tinta do sistema.
   Não é uma segunda paleta.
2. **Volta o estado marcado.** `score-tick.is-on`, `status-choice.is-on` e `reaction.is-on`
   ganham 3px, porque "tinta cheia" não é uma opção neste modo e o marcado precisa se
   distinguir dos dez irmãos.
3. **Uma exceção, justificada.** As cápsulas e a grade de cores mantêm
   `forced-color-adjust: none`. Aqui a cor não decora — ela **é** a pessoa, e na grade de
   escolha ela é o próprio conteúdo. Uma paleta de 24 quadrados pretos não escolhe nada, e um
   globo de cápsulas idênticas deixa de ser a coleção que o produto inteiro promete. A
   informação nunca fica dependendo só da tinta: toda cápsula aparece ao lado do nome por
   extenso, e cada cor traz o nome no rótulo acessível.
4. **A barra de completude** também mantém a própria pintura: ela distingue três coisas por
   cheio, meio-tom e hachura, e era o **meio-tom** que colapsava — três fatias pretas iguais.
   A legenda ao lado sempre traz a palavra e a porcentagem, então a barra é reforço; reforço
   que não reforça é enfeite.

**Depois — varredura limpa nas cinco superfícies:**

```
máquina [] · gaveta [] · ficha leitura [] · ficha resenha [] · álbum [] · porta [] · prateleira [] · oficina []
```

E nada mudou fora do modo: `test:a11y` **0 achados**, `e2e-acabamento` **59/59**,
`e2e-roleta` **14/14**.

**O que ficou de fora, de propósito:** não há teste automatizado disto. A varredura que
achou o problema é uma sonda de auditoria, não uma suíte. Ver T-18.

---

### T-18 · O que a suíte de a11y **não** vê — e como fazê-la ver `P2` `M`

**Onde:** [tests/audit-a11y.mjs](tests/audit-a11y.mjs)

A suíte é boa e é honesta no que promete: 17 telas × 3 larguras, medindo **overflow**,
**hierarquia de títulos**, **controles sem nome**, **`img` sem alt**, **`svg` sem rótulo**,
**alvo de toque** (`altura < 44 || largura < 24`) e **contraste** (4.5:1, ou 3:1 acima de
24px/19px em negrito). Ela ficou verde durante toda esta auditoria — e mesmo assim quatro
achados desta rodada são de acessibilidade.

Não é falha da suíte: é o mapa dela. O que fica fora, com o achado que provou cada buraco:

| Buraco | O que passou por ele |
|---|---|
| Não tabula. Mede elementos, não a **ordem de foco**. | **M-02** — o Tab terminava num `Fechar aviso` invisível |
| Não olha pseudo-elementos. `::selection` nunca foi medido. | **T-09** — 12 das 24 cápsulas deixavam o texto selecionado abaixo de 4.5:1 |
| Não emula `forced-colors`. | **T-17** — o botão principal invisível no alto contraste |
| Não confere **nomes de região** repetidos. | **L-03** — duas seções chamadas "O álbum" |
| Não pergunta se a informação **existe fora do desenho**. | **T-14** — quem está no globo só existe dentro de um SVG `aria-hidden` |
| Só clica uma vez (`clique:`). Estados profundos ficam fora. | a régua de nota da resenha, a bancada da porta, a mesa |
| Não emula `prefers-reduced-motion`. | nada ainda — o produto acerta, mas nada trava o acerto |

**Proposta, em três acréscimos que reaproveitam o arnês que já existe:**

1. **Uma passada de `forced-colors: active` por tela** (`Emulation.setEmulatedMedia`),
   listando todo controle cujo fundo é igual ao da página **e** que não tem borda, contorno
   nem sombra. É a varredura desta auditoria, com 15 linhas. Trava o T-17.
2. **Uma passada de Tab por tela**, comparando as paradas reais com os elementos focáveis
   visíveis. Uma parada em elemento de opacidade zero, ou de caixa 0×0, é achado. Trava o
   M-02.
3. **`::selection` na conta de contraste.** `getComputedStyle(el, '::selection')` devolve
   fundo e tinta; é a mesma função de razão que a suíte já tem. Trava o T-09.

**Prova que falta e que muda a decisão:** não medi quanto tempo isso acrescenta. A suíte já
roda 17 × 3 = 51 combinações num navegador de verdade; três passadas a mais por combinação
podem dobrar o relógio. Se dobrar, o certo é rodá-las em **uma** largura só (a de 390, que é
onde o produto vive) em vez de nas três.

---

### T-19 · As duas barras do celular: o `DESIGN.md` promete pixels, e eles conferem

Registrado porque o projeto pede número, e porque uma promessa verificada vale tanto quanto
um defeito achado.

**Medido** na máquina, com `Emulation.setDeviceMetricsOverride` (a janela do Chrome headless
tem largura mínima de ~500px; sem o override, 390 e 320 mediam a mesma coisa — e foi assim
que a nota "não pôde ser capturado a 390px" do briefing do index virou verdade por acidente,
ver D-03):

| Promessa do `DESIGN.md` | Medido |
|---|---|
| "as mesmas três coisas ganham **130px** de largura cada em 390" | **130 · 130 · 130** ✅ |
| "e **107px** em 320" | **107 · 107 · 107** ✅ |
| "o alto cai para **60px**" | topbar **60px** ✅ |
| "células iguais de **56px**" na barra de baixo | **56px** ✅ |
| a barra quebra em **exatamente duas linhas** | `linhasDaTopbar: 2` ✅ |
| a nav de baixo é fixa e a página ganha chão | `position: fixed`, `padding-bottom: 72px` ✅ |
| nenhum alvo abaixo de 44px na barra | lista vazia ✅ |
| sem overflow horizontal | 0 ✅ |

**E a Regra das Duas Linhas sob estresse.** Com o crachá
`Maria Eduarda Gonçalves de Albuquerque` a 320px, no álbum:

```
crachá        : 48 × 44   (sobrou o disco da cápsula, como a regra manda)
nome do crachá: 1 × 1 px, display: block, texto completo preservado
overflow      : 0     linhas da topbar: 1
```

Exatamente o que o `DESIGN.md` descreve: *"Escondido, o nome sai do olho e **não** da árvore
de acessibilidade: com `display: none` o botão passaria a se anunciar como 'trocar de pessoa'
sem dizer de quem."* O nome inteiro continua no DOM, em 1×1px. Funciona.

**Uma imprecisão no texto da regra, não no código.** O `DESIGN.md` diz que o nome cede
*"abaixo de 460px **e** com dois comprimidos na fileira — a máquina"*, e que *"O álbum tem um
comprimido só e mostra o nome inteiro na mesma largura."* O CSS faz o **contrário**: a regra
é `.topbar:has(.back-link) .who-name`, e o `back-link` existe no **álbum** e na **oficina**,
não na máquina. Medido: na máquina a 320px o nome aparece; no álbum a 320px, com nome longo,
ele cede.

O comportamento em si está certo — o álbum é quem tem a saída escrita disputando a barra. É a
**descrição** que ficou trocada, e ela é a que alguém vai ler antes de mexer.

---

### T-20 · Movimento reduzido: honrado nos dois lugares, medido

| | Normal | `prefers-reduced-motion: reduce` |
|---|---|---|
| `transition-duration` do botão primário | `0.16s` | **`1e-05s`** |
| duração da entrega em JS | `4300ms` | **`120ms`** ([synced-group.ts:600](src/app/synced-group.ts#L600)) |
| confete | 64 partículas | **desligado inteiro** ([confetti.ts:74](src/app/confetti.ts#L74)) |
| `scroll-behavior` | `smooth` | `auto` |

A invariante nº 6 do README — *"honrado em CSS **e** em JS"* — está de pé nos quatro. É o
tipo de coisa que se quebra sozinha na próxima animação: T-18, item de `prefers-reduced-motion`,
existe para travá-la.

---

### T-21 · O `.brand` do álbum e o `voltar` levam ao mesmo lugar, e não há caminho para o início `P3` `XS`

**Onde:** [group-history.html:5](src/app/group-history.html#L5) e
[:10](src/app/group-history.html#L10)

```html
<a class="back-link" [href]="machineUrl()">A máquina</a>
<a class="brand"     [href]="machineUrl()" aria-label="Mesa do Mês — voltar à máquina">
```

Dois controles vizinhos, o mesmo destino, dois nomes diferentes. E o `DESIGN.md` descreve
outra coisa: *"a cápsula da marca continua ali, e continua sendo **o link para o início**"*.

Consequência prática: **do álbum não há como chegar à prateleira**. São dois saltos — álbum →
máquina → marca. Na oficina acontece o mesmo (`back-link` e `brand` apontam os dois para
`.`), só que ali os dois **são** o início, então a redundância não esconde nada.

A marca a 320px no álbum mede **26 × 44px** — passa na regra do projeto (44 de altura) e na
WCAG 2.5.8 (24×24), mas é o menor alvo da barra, e ele leva ao mesmo lugar que o vizinho.

**Proposta:** a marca do álbum vai para `.` (o início), como o `DESIGN.md` já diz que ela
faz. Duas saídas diferentes em vez de duas iguais, e a prateleira volta a ser alcançável de
qualquer tela.

---

### T-22 · O produto mostra mensagens do SDK do Firebase, em inglês, na tela `P0` `S`

**Onde:** [synced-group.ts:721](src/app/synced-group.ts#L721) ·
[group-history.ts:559](src/app/group-history.ts#L559)

```ts
private explain(error: unknown): string {
  if (error instanceof UsageBlockedError) { return '…'; }
  if (code === 'permission-denied')       { return '…'; }
  return (error as Error)?.message ?? 'Algo deu errado ao falar com o servidor.';
                    // ↑ qualquer outro erro sai cru na tela
}
```

Duas causas são traduzidas. **Todo o resto passa direto**, com a mensagem que o SDK do
Firebase ou o `group-store` escreveram para quem programa.

**Medido** — primeira visita a um grupo com o Firestore inalcançável (URLs do backend
bloqueadas por CDP, cache local apagado), observado de 2s a 40s:

```
h1        : "Grupo não encontrado"
parágrafo : "Failed to get document because the client is offline"
alertas   : nenhum      ocupado: false
```

Aos **40 segundos** a tela é a mesma. Não há botão de tentar de novo, não há explicação, e a
única frase que descreve o que houve **está em inglês**.

**Medido** — grupo que de fato não existe:

```
h1        : "Grupo não encontrado"
parágrafo : "Grupo naoexisteesse não encontrado."
```

A mesma coisa dita duas vezes, e a segunda com o id cru dentro.

**E o que mais pode chegar ali.** `group-store.ts` rejeita com asserções de programador que
`explain()` vai encaminhar palavra por palavra:

```
Índice de giro inválido: 3.
Nota final inválida: 11.
Status de completude inválido: undefined.
Tempo de jogo inválido: 5000.
Uma resenha precisa de assinatura.
Uma reação precisa de uma resenha.
Reação fora da lista: 💩.
Nada a mudar na cápsula: nem cor nem emoji.
```

Nenhuma delas é para quem usa. São invariantes internas, e o caminho até a tela existe.

**Por quê isto é `P0`:** quebra três regras escritas ao mesmo tempo.

1. *"Escreva em português. O produto, o código, os comentários…"* — README, regra 4.
2. *"O erro, com o problema e a saída."* — `DESIGN.md`, A Regra do Texto que Não Explica a
   Máquina. `Failed to get document because the client is offline` não tem saída.
3. *"Don't explicar a máquina na tela"* — "get document" é literalmente o mecanismo.

E acontece no caso mais comum de todos: sinal ruim.

**Proposta:** `explain()` deixa de ser um repasse e passa a ser um **mapa fechado**, com
título, texto e saída. O padrão nunca é a mensagem do erro:

| Causa | Título | Texto | Saída |
|---|---|---|---|
| `unavailable` / `offline` | `Sem conexão` | `Não deu para falar com o servidor.` | `Tentar de novo` |
| `not-found` | `Grupo não encontrado` | `O link pode estar incompleto.` | `Voltar ao início` |
| `permission-denied` | `O servidor recusou` | (o texto de hoje) | `Tentar de novo` |
| `UsageBlockedError` | `A máquina parou por segurança` | (o texto de hoje) | quando volta |
| **qualquer outro** | `Algo deu errado` | `Tente de novo em instantes.` | `Tentar de novo` |

A mensagem crua continua útil — para quem depura. O lugar dela é `console.error`, não o
parágrafo.

**Casa com o T-11:** o título sai da causa em vez de sair do ramo do template. As duas
correções são a mesma função, e vale fazer as duas de uma vez.

**Prova que falta:** não testei `permission-denied` numa rule de verdade recusando (o
emulador aceita as escritas do teste). O caminho existe e é o único já traduzido, então o
risco é baixo — mas confira antes de reescrever a função.

---

### T-23 · A voz da interface está afiada, e vale dizer onde ela acerta

Registrado para não se perder. O inventário completo das mensagens de erro **escritas à
mão** neste produto:

| Mensagem | Problema | Saída |
|---|---|---|
| `Dê a nota final: é a única nota que a resenha cobra.` | ✅ | ✅ diz qual campo |
| `Diga como você terminou: platinado, finalizado ou incompleto.` | ✅ | ✅ lista as opções |
| `Dê um nome ao jogo: é ele que aparece no registro.` | ✅ | ✅ e diz por que importa |
| `Escreva seu nome para entrar. Ele fica no registro ao lado do que você fizer.` | ✅ | ✅ |
| `Digite um nome antes de carregar a cápsula.` | ✅ | ✅ |
| `Use um nome com no máximo 60 caracteres.` | ✅ | ✅ |
| `Não deu para pintar a cápsula. Tente de novo.` | ✅ | ✅ |
| `Escreva ao menos o nome do jogo para etiquetar este giro.` | ✅ | ✅ |
| `Esta cápsula não pode ser pintada daqui. Abra os integrantes na máquina.` | ✅ | ⚠ diz o caminho, não leva |

Nove mensagens, todas em português, todas com problema e saída, nenhuma explicando o
mecanismo. A única ressalva é a última, que nomeia um destino sem oferecê-lo — e ela é o caso
mais raro dos nove.

O contraste com o T-22 é o ponto: **o que foi escrito à mão está certo; o que vaza pelo
`return` padrão é que não passou por ninguém.**

E a confirmação do giro é o exemplo que o resto deveria seguir:

> **Tem certeza que deseja girar a roleta?**
> Isso afeta a roleta de todo o grupo e não pode ser desfeito.

Consequência, não mecanismo. Nada sobre log, evento ou registro.

---

### T-24 · Os estados vazios, um a um `P3`

Inventário, porque estado vazio é onde produto novo mais falha — e aqui quase todos estão
escritos:

| Onde | O que diz | Tem saída? |
|---|---|---|
| Prateleira sem máquinas | `Nenhuma máquina por aqui ainda` + `As máquinas que você abrir aparecem aqui.` | ⚠ a ação está na outra coluna |
| Globo com menos de 2 | `O globo está quase vazio` + `Carregue pelo menos 2 cápsulas.` | ⚠ não leva à gaveta |
| Registro sem giros | `Nenhum giro ainda.` | ❌ frase solta |
| Gaveta sem gente | `O globo está vazio. Carregue a primeira cápsula no campo acima.` | ✅ aponta o campo |
| Álbum sem cápsulas | `O álbum está sem cápsulas` + `A primeira cápsula chega quando alguém girar.` | ✅ `Ir para a máquina` |
| Jogo sem resenha | `Ninguém resenhou este jogo ainda.` | ✅ o botão está logo acima |
| Cápsula sem jogo | `Sem jogo escrito` / `Escrever o jogo desta cápsula` | ✅ o cartão inteiro é o botão |
| Ficha lacrada sem fila | `Ninguém resenhou ainda` + `A sua abre o boletim deste jogo.` | ✅ |

**Os dois fracos:**

- **`Nenhum giro ainda.`** é a única frase do produto que não é frase: sem título, sem
  segunda linha, sem saída, num `<p class="roster-empty">`. Todos os outros vazios têm o
  globo desenhado, um título em display e uma explicação. Este é o registro de um grupo
  recém-criado — ou seja, **a segunda tela que alguém vê na vida** —, e é o mais pobre dos
  oito.
- **`O globo está quase vazio` + `Carregue pelo menos 2 cápsulas.`** diz o que fazer e não
  oferece onde. A gaveta está a um comprimido de distância, no topo, e o botão
  `Abrir a lista de integrantes` existe **abaixo** do `Girar a roleta` desabilitado. A
  hierarquia está invertida: naquele estado, a única ação possível é a secundária.

**Proposta:** com menos de `MIN_MEMBERS`, `Abrir a lista de integrantes` **é** a ação
primária, e `Girar a roleta` some em vez de ficar desabilitado. Um botão morto ocupa o lugar
do único vivo.

---

### T-25 · A gaveta se anunciava como `aria-modal` e nunca recebia o foco `P1` `XS` ✅ FEITO

**Onde:** [synced-group.ts:380](src/app/synced-group.ts#L380) — `openRoster()` ·
[roster-bench.ts:81](src/app/roster-bench.ts#L81)

**O que:** `openRoster()` só levantava um sinal. Nada movia o foco para dentro da gaveta. E
a gaveta declara `role="dialog" aria-modal="true"` — que é a promessa de que o resto da
página está indisponível.

A promessa era falsa por três motivos encadeados:

- o **Tab preso** (`trapFocusWithin`) pende de `(keydown.tab)` **no próprio cartão**: com o
  foco fora, o manipulador nunca dispara;
- o **`Esc`** pende de `(keydown.escape)` no mesmo cartão: também nunca dispara;
- então quem abre a gaveta pelo teclado fica **atrás** dela, tabulando pela barra que o
  leitor de tela acabou de anunciar como indisponível — e sem tecla para sair.

**Medido**, percorrendo o foco de verdade nas quatro camadas do produto:

| Camada | Foco ao abrir | Tab preso? | `Esc` devolve o foco a |
|---|---|---|---|
| **Gaveta — lista** | **`BODY`** ❌ | **vazou para `brand`** ❌ | **`brand`**, e não fechou ❌ |
| Gaveta — bancada | `capsule-back` ✅ | — | linha da pessoa ✅, 2º Esc fecha ✅ |
| Ficha — leitura | `sheet-close` ✅ | preso nas 30 tabulações ✅ | — |
| Ficha — resenha | `nota-final-0` ✅ | ✅ | volta uma face ✅, 2º Esc fecha ✅ |
| Confirmação do giro | `confirm-spin` ✅ | preso ✅ | `spin-button` ✅ |

**Quatro de cinco estavam certas.** A segunda face da própria gaveta faz o certo — `open()`
foca a saída da bancada, com comentário e tudo. A primeira face é a única sem isso, e é a que
todo mundo abre.

**Feito:** `afterNextRender(() => this.document.getElementById('roster-close')?.focus())`
no construtor da gaveta, e um `id` no botão de fechar. Foca **o fechar**, e não o campo de
nome, pelo mesmo motivo que a porta não usa `autofocus`: focar um campo sobe o teclado do
celular sobre a lista que a pessoa veio ver.

O foco entra no componente, e não em quem o abre, porque é o componente que sabe qual é a
sua primeira parada — é como a ficha já faz.

**Depois:**

```
foco ao abrir : roster-close | Fechar a lista de integrantes
Tab preso?    : preso nas 30 tabulações
foco após Esc : roster-button | INTEGRANTES 6
```

**O teste que falha sem a correção** ([roster-bench.spec.ts](src/app/roster-bench.spec.ts)),
como manda a regra 2 do README — conferido tirando a linha e rodando:

```
× o foco entra na gaveta ao abrir, e não fica na barra atrás dela
  AssertionError: expected '' to be 'roster-close'
```

Com a correção: **404/404**.

---

### T-26 · O mapa do foco, para quem for mexer nas camadas

Registrado porque o percurso está certo em quatro lugares e é fácil quebrar sem perceber.

```
MÁQUINA
 └─ Integrantes ──► foco: #roster-close        Esc ──► #roster-button
      └─ cápsula ──► foco: #capsule-back       Esc ──► #member-<id>   (uma face por vez)
 └─ célula/etiqueta ──► ficha
      ├─ leitura ──► foco: #sheet-close        Esc ──► fecha, foco na célula de origem
      ├─ resenha ──► foco: #nota-final-<n>     Esc ──► leitura
      ├─ jogo    ──► foco: #note-title         Esc ──► leitura
      └─ mesa    ──► foco: #sheet-back         Esc ──► leitura
 └─ Girar ──► confirmação ──► foco: #confirm-spin   Esc ──► #spin-button
 └─ reações ──► popover ──► foco: 1ª escolha (só por teclado)  Esc ──► o gatilho

PORTA
 └─ "escrever meu nome" ──► foco: #gate-name
 └─ "sua cápsula" ──► bancada ──► foco: #gate-bench-back   Esc ──► #gate-paint
```

Três invariantes que valem para qualquer camada nova:

1. **Quem abre uma camada move o foco para dentro dela**, e quem a fecha devolve o foco ao
   controle que a abriu. Sem isso o `aria-modal` mente (T-25).
2. **`Esc` volta uma face por vez**, nunca duas. É o que impede a ficha de engolir um
   rascunho por uma tecla.
3. **O foco é responsabilidade do componente**, não de quem o renderiza — é ele que sabe
   qual é a primeira parada de cada face.

O popover de reações tem uma sutileza que vale anotar: ele **só** rouba o foco quando foi
aberto pelo teclado (`event.detail === 0`). Abrir com o mouse ou com hover deixa o foco onde
estava, de propósito — mover o foco por causa de um ponteiro que passou seria roubá-lo de
quem está escrevendo. Está certo, e é o tipo de detalhe que a próxima refatoração apaga.

---

### T-27 · Ligar o som não faz som `P3` `XS`

**Onde:** [synced-group.ts:480](src/app/synced-group.ts#L480)

```ts
protected toggleSound(): void {
  this.preferences.setSound(!this.soundOn());
  if (this.soundOn()) this.machineSound.prepare();  // destrava o contexto, e cala
  else this.machineSound.stop();
}
```

Ligar o som muda o desenho do ícone — riscado vira ondas, e o `DESIGN.md` diz com razão que
*"o estado vem do desenho, riscado é mudo, e não só da cor"*. Mas **nada toca**. A próxima
coisa que faz barulho é o giro seguinte, que pode ser daqui a um mês.

Quem liga não descobre nem que a máquina tem voz, nem que o volume do aparelho está baixo,
nem que o telefone está no silencioso.

**Proposta:** ao **ligar** (nunca ao desligar), um tique curto — literalmente um dente da
catraca que a máquina já sintetiza. Custa uma chamada.

**Por que isto não fere a Regra da Voz Convidada:** ela diz *"nada toca sem um dedo"*, e
ligar o interruptor **é** o dedo — é o gesto mais explícito possível de pedir som. É o mesmo
raciocínio que já permite o giro e o replay terem voz.

**A dúvida honesta:** a Regra do Momento Único protege a página de um segundo momento
autoral. Um tique de confirmação não é um momento — é a resposta a um controle, da mesma
família do `:active` de um botão. Mas quem escreveu a regra é quem decide se ela alcança o
som.

---

### T-28 · O som é do aparelho de quem girou, e mais ninguém ouve `P3`

Consequência do M-01, anotada aqui porque só aparece quando se pensa nos dois juntos.

A cena com voz toca no aparelho de quem apertou `Girar`. As outras quatro pessoas na mesma
sala, com a mesma máquina aberta, não veem o resultado novo (M-01) **e** não ouvem nada. O
momento mais social do produto acontece em um telefone só.

Não há proposta barata aqui — som sincronizado entre aparelhos é outro produto. Mas se o
ouvinte do M-01 entrar, vale decidir de propósito o que os outros aparelhos fazem quando o
resultado muda sozinho: **silêncio** é a resposta certa (barulho que ninguém pediu), e é
melhor que ela seja uma decisão escrita do que um efeito colateral.

---

---

---

### T-29 · Dezessete larguras, do 1440 ao 320: nenhum estouro, nenhum alvo pequeno

Varredura de `1440 · 1100 · 1000 · 979 · 900 · 820 · 768 · 700 · 640 · 621 · 620 · 560 · 480 ·
414 · 390 · 360 · 320`, na máquina, medindo overflow horizontal, alvos abaixo do mínimo,
altura da barra e o estado das duas quebras.

```
overflow horizontal : 0 em TODAS as dezessete
alvos pequenos      : nenhum em TODAS as dezessete
altura da topbar    : 64px de 1440 a 621 · 60px de 620 para baixo
nav no rodapé       : `static` até 621 · `fixed` de 620 para baixo
registro em trilho  : `visible` até 621 · `overflow-x: auto` de 620 para baixo
```

As duas quebras documentadas (980 e 620) são exatamente onde o `DESIGN.md` diz, e o produto
atravessa a faixa do meio — 621 a 979, a do tablet, que quase ninguém testa — sem nada
quebrado.

**Uma curiosidade medida, e ela é decisão de design, não defeito.** O nome vencedor muda de
escala na quebra de 620, **para cima**:

| Largura | Tamanho do nome |
|---|---|
| 700px | 52px |
| 640px | **48px** ← o menor de todos |
| **620px** | **67px** ← salta 40% ao estreitar |
| 390px | 55px |
| 320px | 45px |

É a troca do token `display` (`clamp(3rem, 7.4vw, 6rem)`) pelo `display-narrow`
(`clamp(2.7rem, 14vw, 4.2rem)`) na quebra. Faz sentido no celular — o nome ganha linha
própria e pode crescer. O efeito colateral é que o **menor** nome do produto acontece em
`640px`, uma largura de tablet pequeno em pé, onde o layout já é de uma coluna e sobra espaço.

**Não proponho mexer.** Redimensionar janela é coisa de quem audita; num aparelho de verdade
ninguém atravessa a quebra. Fica registrado para que o salto não seja "descoberto" como bug
mais adiante.

---

### T-30 · Conteúdo no pior caso possível: nada corta, nada estoura

Semeei um grupo `extremo` no emulador só para isto:

| Conteúdo | No limite |
|---|---|
| Nome com espaços | `Maria Eduarda Gonçalves de Albuquerque Vasconcelos Sá` — **53 caracteres** |
| Nome **sem** espaço nenhum | `MariaEduardaGoncalvesDeAlbuquerqueVasconcelos` — 45, e sem ponto de quebra |
| Título do jogo | 64 caracteres, e um de 54 sem espaços |
| Descrição | **280**, o teto da rule |
| Texto da resenha | **600**, o teto da rule |

Varrido em `1440 · 900 · 390 · 320`, na máquina, na gaveta e na ficha aberta:

```
overflow horizontal da página : 0 nas quatro larguras, nas três telas
texto cortado sem reticências : nenhum
```

Isto é resultado de trabalho anterior, não de sorte: `overflow-wrap: anywhere` nos valores da
grade de série, `text-overflow: ellipsis` no crachá, `text-wrap: pretty` nos títulos, e a
Regra do Nome Inteiro colocando a degradação só onde o arco do globo manda.

**Três alarmes falsos, e eles valem mais que o atestado.** As minhas sondas erraram três
vezes antes de acertar, e os três erros são exatamente os que uma suíte automatizada de
layout cometeria. Anoto-os aqui porque o T-18 propõe escrever essas sondas de verdade:

1. **`getComputedStyle` mente sobre filho de SVG oculto.** A minha primeira sonda "provou"
   que os decalques da máquina apareciam em 390px, contra a Regra do Decalque de Bancada. O
   grupo `<g class="decals">` **está** com `display: none` abaixo de 980, mas os filhos
   computam o `display` deles próprios, não o do ancestral. E `Element.checkVisibility()`
   erra do mesmo jeito neste Chrome. **O que não mente é a caixa:** o grupo mede `0x0` de 980
   para baixo, e `246x327` em 981. A regra está implementada; a sonda é que estava errada.
2. **Elemento dentro de contêiner que rola "sai da tela" por definição.** O trilho do
   registro tem `overflow-x: auto` no celular, então as células passam da direita da tela de
   propósito. Uma varredura de estouro precisa subir pelos ancestrais e ignorar quem está
   dentro de um deles.
3. **`scrollWidth > clientWidth` não é corte.** O `8,0` da etiqueta acusava 7px de sobra; é
   `overflow: visible` no elemento **e** no pai, mais as duas faíscas de foil, que são
   `::before`/`::after` absolutos. O texto aparece inteiro. Corte só existe com
   `overflow: hidden` ou `clip`.

Uma sonda que não filtra os três acusa dezessete falhas onde não há nenhuma — que foi
exatamente o que a minha fez antes de eu conferir.

---

### T-31 · Espaçamento de texto (WCAG 1.4.12): passa limpo

O critério exige que, aplicados os quatro ajustes abaixo, **nada** seja cortado ou perdido:

```css
* { line-height: 1.5; letter-spacing: 0.12em; word-spacing: 0.16em; }
p, li { margin-bottom: 2em; }
```

**Medido**, injetando exatamente isso:

| Tela | 390px | 320px |
|---|---|---|
| A máquina | 0 cortes · overflow 0 | — |
| A ficha, na face da resenha | **0 cortes** | **0 cortes** |
| A gaveta dos integrantes | **0 cortes** | **0 cortes** |

A altura do documento cresce de 2079 para 2307px na máquina a 390 — que é o esperado e é o
ponto do critério: crescer para baixo, e não cortar.

É o teste que pega altura fixa em px com texto em rem, e este produto tem `min-height: 44px`
em dezenas de controles. Passa porque são `min-height`, e não `height` — a diferença de uma
palavra que quase todo projeto erra.

---

### T-32 · Com rede lenta, o globo desenrolava sete voltas **para trás** antes de girar `P1` `XS` ✅ FEITO

**Onde:** [synced-group.ts:521](src/app/synced-group.ts#L521) — `spin()`

```ts
this.isSpinning.set(true);     // liga a transição de 4,3s (.machine.is-spinning)
this.revealed.set(false);
this.rotation.set(0);          // ← e manda a roda para zero
try {
  await this.store.spin(...);  // ← só AGORA vai ao servidor
```

As três linhas entram no mesmo ciclo de detecção, então o DOM recebe `.is-spinning` **e**
`transform: rotate(0deg)` juntos. A transição está ligada, o ângulo mudou — o navegador
começa a animar do repouso até zero, para trás, e leva 4,3s para chegar lá. Só que o
servidor ainda nem foi chamado.

Numa conexão boa a ida e volta dura ~100ms e o recuo é invisível. Numa ruim, ele dura o
tempo todo.

**Medido**, com 1500ms de latência e 40 kbps emulados por CDP, lendo o valor alvo do
`transform` a cada 120ms:

```
antes de girar : rotate(2610deg)   transição 0s      parado
   127ms       : rotate(0deg)      transição 4,3s    "Entregando"
```

`2610° → 0°` são **sete voltas e um quarto para trás**, com a tela dizendo *Entregando* o
tempo inteiro. A máquina anda ao contrário enquanto promete que está entregando.

**Por quê:** este é o **momento autoral** do produto — o único movimento que a página tem, e
o que ela existe para mostrar. Vê-lo rodar ao contrário num bar com sinal ruim é o pior lugar
possível para um defeito de movimento.

**Feito:** apagar a linha. Só isso.

Não é preciso zerar, e a própria `playScene()` já explica por quê no comentário dela:
*"Cada reencenação continua a partir do repouso atual."* Ela calcula
`firstEquivalentAhead + 360 × 7` **a partir do ângulo em que a roda está**, então funciona de
qualquer posição — e o comentário seguinte avisa que voltar a zero e chegar ao destino no
mesmo quadro é justamente o que fazia *"a roleta parecer não girar"*. A linha contradizia o
raciocínio escrito duas funções abaixo.

**Depois**, mesma latência de 1500ms:

```
antes de girar : rotate(2520deg)   transição 0s      parado
   127ms       : rotate(2520deg)   transição 4,3s    "Entregando"   ← parada, esperando
  4996ms       : rotate(5310deg)   transição 4,3s    "Entregando"   ← +2790°, para a frente
```

A máquina fica **parada** enquanto pergunta ao servidor, e só se move quando ele já disse
quem saiu. Que é exatamente a promessa do produto: encenar não decide, e não se encena o que
ainda não aconteceu.

**Verificado:** `e2e-roleta` **14/14** (a suíte que mede o SVG quadro a quadro),
`e2e-flows` **21/21** (que gira de verdade, inclusive com movimento reduzido) e
`npm test` **404/404**.

---

### T-33 · Um link com uma barra a mais cai na prateleira, calado `P2` `S`

**Onde:** [app.ts:74](src/app/app.ts#L74) — `readSyncedGroupId`

```ts
/^#?\/g\/([A-Za-z0-9_-]{1,64})$/        // a máquina: fim exato
/^#?\/g\/([A-Za-z0-9_-]{1,64})\/album\/?$/   // o álbum: aceita barra final
/^#?\/novo\/?$/                          // a oficina: aceita barra final
```

Duas das três rotas toleram uma barra no fim. A da máquina, não.

**Medido**, navegando por cada variação e vendo onde o app para:

| Link | Onde cai |
|---|---|
| `#/g/demo` | **a máquina** ✅ |
| `#/g/demo/` | **a prateleira** ❌ |
| `#/g/demo?x=1` | **a prateleira** ❌ |
| `#/g/demo#` | **a prateleira** ❌ |
| `#/G/demo` | **a prateleira** ❌ |
| `#/g/demo/album` · `#/g/demo/album/` | o álbum ✅ ✅ |
| `#/novo` · `#/novo/` | a oficina ✅ ✅ |
| `#/g/` · `#/g` · `#/qualquer` | a prateleira (correto) |
| `#grupo=…&inicio=…` | a prateleira (correto e testado) |

**Por quê importa:** o link **é** a credencial e **é** o produto. Ele viaja por WhatsApp,
Telegram, Discord e Notas — lugares que reescrevem URL, cortam no fim da linha, colam duas
vezes ou capitalizam depois de um ponto. Um caractere a mais e a pessoa cai numa prateleira
que **não diz nada** sobre o link que ela acabou de abrir: ela vê a saudação, conclui que o
link morreu, e vai pedir outro no grupo.

**Proposta, em duas partes — e a segunda é a que importa:**

1. **`XS`** — a rota da máquina aceita `\/?$` como as outras duas. Consistência de uma
   barra.
2. **`S`** — quando o fragmento **não está vazio e não casa com nada**, a prateleira diz:
   `Esse link não abriu nenhuma máquina.` Cobre a barra a mais, o `?x=1`, o `#/G/`, o
   formato antigo e todo caso futuro que ninguém previu.

O item 2 é a mesma classe do T-11: uma falha silenciosa que a pessoa interpreta como o
produto estar quebrado. E ele **não quebra** o teste que existe — `e2e-flows` confere que o
link antigo cai na prateleira, com zero cápsulas e sem inventar "Zilda"; uma linha de recado
não muda nada disso. O comentário daquele teste, aliás, já diz que a prateleira *"explica o
que fazer"*. Hoje ela explica em geral; não explica sobre **este** link.

---

### T-34 · `lido há 90min` `P3` `XS`

**Onde:** [synced-group.ts:639](src/app/synced-group.ts#L639) — `loadedAgo()`

```ts
if (seconds < 10) return 'agora';
if (seconds < 60) return `há ${seconds}s`;
return `há ${Math.floor(seconds / 60)}min`;
```

Não há degrau acima do minuto. Uma aba deixada aberta a manhã inteira diz `lido há 312min`, e
um dia inteiro, `lido há 1440min`.

Some com o T-02 e com o M-01 num problema só: a **única** pista de que a tela pode estar
velha é essa linha, e ela fica cada vez mais difícil de ler justamente quanto mais velha a
tela está. `há 1440min` não comunica "isto é de ontem" — comunica um número grande.

**Proposta:** mais dois degraus, no mesmo estilo curto: `há 2h` acima de 60 minutos, e
`ontem` (ou `há 2 dias`) acima de 24 horas. Três linhas.

---

### T-35 · Imprimir a máquina devolve uma folha em branco `P2` `S`

**Onde:** não existe **nenhum** `@media print` em `styles.scss`, `game-sheet.scss`,
`group-history.scss` nem `app.scss`.

**O que:** o produto é esmalte azul-noite com texto branco. Os navegadores imprimem **sem
fundo** por padrão (`print-color-adjust: economy`, medido). O fundo some; o texto branco
fica.

**Medido**, com a mídia `print` emulada, contra o papel branco:

| Elemento | Cor | Contraste no papel |
|---|---|---|
| nome vencedor (`h1`) | `rgb(235,117,190)` | 2,69:1 |
| parágrafo de apoio | `rgb(188,205,230)` | 1,61:1 |
| **nomes no registro** (`.cell-open strong`) | `rgb(255,255,255)` | **1,00:1** |
| **valores da grade de série** | `rgb(255,255,255)` | **1,00:1** |
| rótulos da grade | `rgb(188,205,230)` | 1,61:1 |
| rodapé | `rgb(227,234,242)` | 1,21:1 |

**1,00:1 é branco sobre branco.** Quem apertar `Ctrl+P` — ou "Salvar como PDF", que sai do
mesmo diálogo e é como muita gente arquiva uma página — recebe uma folha com um nome rosado
apagado e **nada mais**. Os nomes do clube e os números não estão lá.

**Por que vale corrigir e não ignorar:** o produto é um **guardador de memória** — "a estante
do clube", um ano de jogos. Querer um PDF disso é o desejo mais previsível que ele desperta.
E o caminho tem uma tecla.

**Proposta, e ela cai no colo do próprio sistema visual:** este produto **já tem** a
superfície de papel — `--paper`, `--paper-quiet`, `--ink`, `--ink-quiet`, `--line-paper` —, e
tem a Regra da Única Quebra dizendo que papel é onde se registra. Uma folha impressa é
exatamente isso: **a máquina virando o próprio registro em papel.**

Um `@media print` que:

- troca o esmalte por `--paper` e as tintas claras por `--ink` / `--ink-quiet`;
- esconde o que não é conteúdo — o SVG da máquina, as duas navs, o botão de girar, o aviso
  flutuante, o confete;
- deixa o registro como **lista** (e não como trilho horizontal), o boletim e o álbum;
- imprime o link? **Não.** A Regra do Pôster Sem Link vale igual no papel: o link é a
  credencial, e uma folha esquecida na impressora é pública.

**Isto não é um ajuste, é uma superfície.** Merece passar pela skill como qualquer outra, com
briefing próprio — por isso não implementei aqui. Mas o estado atual (branco sobre branco)
não é uma decisão de ninguém; é a ausência de uma.

---

### T-36 · Dedo nervoso: três cliques em "Girar mesmo assim" gravam **um** giro

O teste mais importante que eu podia fazer, porque um giro a mais queima uma vaga do bolo da
rodada e **não volta atrás**.

**Medido** — três `click()` no mesmo quadro, no botão de confirmação:

```
antes  : versão do log 39   ·   NO GLOBO AGORA 1 / 6
        três cliques disparados
depois : versão do log 40   ·   NO GLOBO AGORA 6 / 6   ·   erro na tela: nenhum
```

**Um evento.** (O bolo foi de 1/6 para 6/6 porque saiu a última cápsula da rodada e a
seguinte abriu cheia — que é o comportamento certo.)

O mesmo com a reação, que é a escrita mais fácil de repetir sem querer:

```
versão antes 39 · dois cliques na mesma escolha · versão depois 40 · eventos gravados: 1
estado final: aria-pressed="true", "😯 1"
```

Duas guardas independentes seguram isso: `canSpinNow()` lê `isSpinning`, que é levantado de
forma síncrona antes do `await`; e o seletor de reações fecha a camada **antes** de emitir.
Some-se a espera de 30s imposta pelas rules, e são três.

Registrado como acerto porque é o tipo de defesa que uma refatoração remove sem perceber —
basta mover o `isSpinning.set(true)` para depois do `await`.

---

### T-37 · As regiões vivas são quietas, e isso foi medido

Duas regiões na máquina: `result-announce [polite]` e `toast [polite]`.

**Medido** com um `MutationObserver` sobre as duas:

| Ação | Mutações na região viva |
|---|---|
| ficar parado 1,5s | **0** |
| abrir e fechar a gaveta | **0** |
| apertar `Atualizar` (recarrega o snapshot inteiro) | **0** |
| rever a cena (clicar no globo) | 10, todas do anúncio do resultado |

O zero no `Atualizar` é o que importa: recarregar reconstrói todos os giros do log, e a
região **não** reanuncia nada porque nada mudou. É a correção que o comentário do template
descreve — *"Envolvendo a coluna inteira ela reanunciava a etiqueta, os botões, a grade de
série e até o diálogo de confirmação a cada recarga"* — e ela está de pé, verificada.

As 10 mutações do replay são o `h1` e o parágrafo mudando de "Entregando" para o nome de quem
saiu. Um leitor de tela agrupa mutações numa região `polite` e fala uma ou duas vezes, não
dez — e falar ali é o certo: quem clicou no globo pediu para rever a entrega.

**Uma coisa que não medi:** o que um leitor de tela **de verdade** fala. `MutationObserver`
conta mudanças no DOM, não falas. Para isso é preciso NVDA ou VoiceOver e um par de ouvidos,
e nenhum dos dois cabe numa sonda.

---

### T-38 · Corrigir o próprio nome apaga o seu passado no clube — e a ficha convida a resenhar de novo `P1` `M`

**Onde:** [identity.ts:53](src/app/identity.ts#L53) — `remember()` ·
[group-log.ts:949](src/app/group-log.ts#L949) — `owesReview()` ·
[naming.ts:16](src/app/naming.ts#L16) — `participantKey()`

**O cenário, e ele é banal:** alguém entra no clube às pressas e digita `Ana`. Meses depois
percebe que no globo ela é `Ana Souza`, ou simplesmente quer o nome certo. Troca o crachá.

**Medido**, no grupo `demo`, trocando `Ana` por `Ana Souza`:

| | como `Ana` | como `Ana Souza` |
|---|---|---|
| recado do que ela deve | `Você jogou 2 jogos que ainda não resenhou — Lethal Company e mais 1.` | **`nenhum`** |
| células lacradas no registro | 1 | **0** |
| a resenha dela em Overcooked 2 | `is-mine: true` | **`is-mine: false`** |
| o que a ficha oferece | `Editar minha resenha` | **`Escrever minha resenha`** |

Três coisas acontecem de uma vez:

1. **As resenhas dela deixam de ser dela.** Continuam no log, assinadas `Ana`, visíveis para
   o clube — e **ela não consegue mais editá-las nem retirá-las**. Não há caminho de volta
   pela interface a não ser digitar o nome antigo de novo, e nada na tela diz isso.
2. **As obrigações somem.** Ela devia duas resenhas; passa a dever zero. O clube continua
   esperando por elas, e o produto parou de lembrá-la.
3. **A ficha convida ao dobro.** `Escrever minha resenha`, num jogo que ela já resenhou. Se
   ela aceitar, o clube passa a ter **duas resenhas da mesma pessoa** no mesmo jogo, as duas
   entrando na média.

O item 3 é o que mais custa, e não é porque *dá* para fazer — é porque **o produto pede**.

**A conta não quebra, e isso é mérito do código.** `seatsOf()` senta quem assinou uma
resenha mesmo sem ser do grupo, e `spinScores` usa `Math.max(seated.length, reviews.length)`
— então "X resenhas de Y" continua honesto, com Y virando 7. O log não mente. Quem mente é
a **média**, que passa a ter o peso de uma pessoa contado duas vezes.

**Uma coisa que NÃO é problema, e vale dizer:** o lacre cai junto. Isso parece um buraco na
regra que diz *"Não há interruptor"* — mas espiar **já é permitido de propósito**, com o
botão `Ver assim mesmo`, a um clique. Trocar o crachá não dá a ninguém um poder novo; dá o
mesmo poder por um caminho mais estranho. Não escalo isto.

**E o mecanismo está CERTO para o uso que ele foi feito.** Duas pessoas do mesmo clube
dividindo um tablet: trocar de crachá tem que trocar as obrigações, os lacres e a autoria.
É exatamente o que ele faz. O produto não consegue — e não deveria tentar — distinguir "sou
outra pessoa" de "sou a mesma e errei meu nome".

**Por isso a proposta é dizer, e não impedir.** Ao trocar de pessoa **dentro de um grupo**,
quando o crachá atual tem histórico ali:

> Você assinou **2 resenhas** como **Ana** neste clube.
> Elas continuam com esse nome, e só quem usar `Ana` pode editá-las.

Uma frase. Ela não bloqueia nada, atende os dois casos (quem está trocando de pessoa lê e
segue; quem está corrigindo o próprio nome descobre o preço antes de pagar) e passa no filtro
da Regra do Texto que Não Explica a Máquina: é **a consequência de um gesto**, e ela decide
algo para quem lê.

**Onde a informação já está:** `ROSTER_LOOKUP` carrega o `snapshot` inteiro para oferecer as
cápsulas ([identity-gate.ts:63](src/app/identity-gate.ts#L63)). Contar quantas resenhas a
chave atual assinou naquele log é uma varredura de array — zero leitura a mais.

**Irmão do G-01, e a defesa é a mesma.** Lá é a segunda "Ana" nascendo por digitação; aqui é
a mesma pessoa se partindo em duas por correção. Os dois saem de `participantKey` ser
congelada e decidir identidade — que é uma invariante e **não deve mudar**. A defesa possível
é só uma: **perguntar antes**, nos dois pontos onde uma chave nova nasce.

**Custo `M`, e não `S`:** a porta precisa saber o histórico da chave atual naquele grupo, o
que hoje ela não recebe. É um campo a mais no `GateCapsule`, ou um segundo retorno do
`ROSTER_LOOKUP`.

**E o item 3 está provado, não deduzido.** Rodei `replay()` puro — sem rede, sem emulador,
sem sujar o grupo semeado — com um clube de três pessoas onde Ana dá 10 e Breno dá 4, e
depois Ana volta como `Ana Souza` e dá 10 de novo:

```
ANTES  — resenhas: 2 | mesa: 3 | média do clube: 7,00
         quem assinou: Ana 10 · Breno 4

DEPOIS — resenhas: 3 | mesa: 4 | média do clube: 8,00
         quem assinou: Ana 10 · Breno 4 · Ana Souza 10
         a mesa: Ana · Ana Souza · Breno · Cecília
         membros no grupo: 3   ← "Ana Souza" nunca virou membro
```

**A média do clube andou um ponto inteiro**, de 7,00 para 8,00, com uma pessoa a mais na
mesa que não existe no grupo. Num clube de três, uma pessoa vale 33% da nota; a duplicata
vale 25% dela.

**E o teste agora existe.** Três casos em
[group-log.spec.ts](src/app/group-log.spec.ts), no bloco *a mesma pessoa com dois crachás* —
não para impedir o comportamento, que é o correto para o log, mas para que ninguém o
descubra por acidente:

- a segunda assinatura vale um voto a mais, e a média vai de **7 para 8**;
- quem assina uma resenha **senta na mesa** mesmo sem ser do grupo, para que a conta nunca
  fique com X maior que Y — e `members` continua com três, provando que a mesa tem alguém
  que o grupo não conhece;
- o crachá novo não herda as obrigações do antigo.

`npm test` passa de 404 para **407**.

---

### T-39 · No celular, o gesto de fechar uma camada sai do grupo `P1` `M`

**Onde:** [app.ts](src/app/app.ts) — não há `pushState`, `replaceState` nem `popstate` em
lugar nenhum do produto. A rota é o hash, e as quatro camadas (ficha, gaveta, bancada,
confirmação) vivem fora dele.

**O que:** no Android, o **Voltar** — o botão ou o gesto de deslizar da borda — é o "fechar
isto" universal. Todo aplicativo o respeita. Aqui ele não fecha a camada: ele **sai do
grupo**.

**Medido**, a 390×780, com uma semeadura limpa (repetido duas vezes, resultado idêntico):

```
ponto de partida     : hash "#/g/demo"   tela: máquina
abro a ficha do jogo : hash "#/g/demo"   ficha: true    tela: máquina
Voltar               : hash ""           ficha: false   tela: PRATELEIRA
```

O mesmo com a gaveta dos integrantes e com a confirmação do giro: em todos os três, o Voltar
não fecha a camada — ele descarta a máquina inteira e a pessoa aterrissa na prateleira.

**Por que isto é `P1`:** o produto é feito para o celular (as duas barras, a nav sob o
polegar, o trilho do registro, o seletor nativo de ordem). No celular, o caminho mais natural
para fechar a ficha é deslizar da borda. E ele:

- perde a camada;
- perde a máquina;
- e **perde o rascunho da resenha** (F-02), porque sair leva o componente junto.

Ou seja: a perda mais cara do produto tem, no aparelho principal do produto, o gesto mais
natural como gatilho. F-02 fala de um clique fora do cartão; isto é pior, porque é o gesto
que a pessoa aprendeu a fazer sem pensar.

**Proposta — o padrão de camada com histórico:**

```
abrir uma camada  -> history.pushState({ camada: 'ficha' }, '', location.href)
popstate          -> fecha a camada do topo (uma por vez, como o Esc já faz)
fechar pelo X/Esc -> history.back() se a entrada é minha
```

O `Esc` **já** implementa a semântica certa — uma face por vez, e a ficha sai só da última.
O trabalho é fazer o Voltar chamar o mesmo caminho que o `Esc` chama.

**Os cuidados, e eles não são triviais:**

- `pushState` com a **mesma** URL não dispara `hashchange`, só `popstate`. O app hoje escuta
  apenas `hashchange` ([app.ts:57](src/app/app.ts#L57)); precisaria escutar os dois sem que
  um desfaça o outro.
- Fechar a camada por `X` ou `Esc` precisa **consumir** a entrada empilhada, ou o Voltar
  seguinte fica sem efeito uma vez — o defeito clássico deste padrão.
- As camadas se aninham (gaveta → bancada, ficha → resenha). Uma entrada por face, e não uma
  por camada.

Por isso é `M`, e por isso vale fazer de uma vez com o F-02: as duas correções encostam no
mesmo ponto — o que acontece quando alguém tenta sair.

**O histórico não está inflado**, e vale registrar: `history.length: 3` depois de navegar
pela máquina, abrir e fechar três camadas e voltar duas vezes. O app não empilha entradas
por conta própria, o que deixa o caminho livre para empilhá-las de propósito.

**No álbum o Voltar está certo** e não deve mudar: ele é uma rota de verdade
(`#/g/<id>/album`), e voltar dele para a máquina é exatamente o que se espera.

---

### T-40 · `replay()` não é o gargalo, e agora tem número

O `FIREBASE.md` deixa uma otimização anotada sem medida:

> *"Se um log passar de algumas centenas de eventos, a saída é gravar snapshots periódicos
> **dentro do próprio log** e replicar só a partir do último — fica anotado como otimização
> futura, não é necessária agora."*

**Medi.** Log sintético com 8 pessoas, cada giro com jogo escrito, oito resenhas completas
(nota, status, horas, texto e cinco critérios) e oito reações:

| Giros | Eventos | `replay()` | Por evento |
|---|---|---|---|
| 5 | 106 | 0,36 ms | 3,4 µs |
| 12 | 232 | 0,53 ms | 2,3 µs |
| 24 | 448 | 0,81 ms | 1,8 µs |
| 50 | 916 | 1,36 ms | 1,5 µs |
| 100 | 1.816 | 2,59 ms | 1,4 µs |
| 200 | 3.616 | **5,54 ms** | 1,5 µs |
| **400** | **7.216** | **8,67 ms** | 1,2 µs |

**Linear, e barato.** Quatrocentos giros — um clube que joga toda semana por **oito anos** —
replicam em **8,67 ms**, menos de um quadro a 60fps. E o custo por evento **cai** com o
tamanho, porque os mapas amortizam.

**Conclusão: a otimização anotada não precisa ser feita, e agora dá para dizer por quê.**
Vale trocar a nota do `FIREBASE.md` por este número — "não é necessária agora" é uma
suposição que envelhece; "8,67 ms a 7.216 eventos" não é.

**O que cresce de verdade é outra coisa** — ver T-41.

---

### T-41 · O cache local cresce sem teto e nunca é limpo `P2` `S`

**Onde:** [group-store.ts:447](src/app/group-store.ts#L447) — `browserLogCache` ·
[recent-groups.ts:27](src/app/recent-groups.ts#L27) — `forgetGroup`

**Medido**, no mesmo log sintético:

```
200 giros · 3.616 eventos · JSON no localStorage: 660 KB
                                     ≈ 182 bytes por evento
teto do localStorage: ~5 MB por origem
```

Duas coisas decorrem disso.

**1. Esquecer uma máquina deixa o cache dela para trás — para sempre.**

`forgetGroup()` mexe só em `mesa-do-mes:maquinas:v1`. A chave
`mesa-do-mes:log:v1:<id>` é escrita por `group-store` e **não é apagada por nada**: nem ao
esquecer a máquina, nem quando a prateleira derruba a 13ª (P-02), nem nunca.

Um aparelho que passou por vários clubes ao longo de anos acumula o log inteiro de grupos
que a pessoa não vê mais na prateleira e talvez nunca reabra. E ela não tem como saber:
a prateleira mostra doze linhas, e o armazenamento guarda quantos grupos já passaram.

**2. Estourando a cota, o produto fica mais caro em silêncio.**

```ts
write(groupId, value) {
  try { storage?.setItem(...); }
  catch { /* Cache indisponível custa leituras, nunca correção. */ }
}
```

A escolha está **certa** — correção antes de custo, e o comentário diz isso. Mas a
consequência não aparece em lugar nenhum: sem cache, cada abertura passa de **1 leitura**
para **1 + N**, onde N é o log inteiro. Para um grupo de 200 giros isso é **3.617 leituras
por abertura**, contra um orçamento de 1.500 por aparelho por dia
([FIREBASE.md](FIREBASE.md)). O `UsageGuard` para a máquina na primeira tentativa, e a
pessoa vê `A máquina parou por segurança` sem nenhuma relação visível com o que aconteceu.

Ou seja: o modo de falha do cache cheio é **exatamente** o T-12 — o aparelho parado, com o
log no bolso e a tela dizendo `Grupo não encontrado`.

**Propostas, e a primeira é quase de graça:**

1. **`forgetGroup` apaga o cache junto.** Esquecer uma máquina deve esquecê-la inteira, e
   quem reabrir pelo link paga uma carga fria — que é o preço justo. Vale também para a
   evicção da 13ª em `rememberGroup`.

   **Não é `XS`, e o motivo explica por que o vazamento existe.** A chave do cache
   (`CACHE_PREFIX`) mora em [group-store.ts:69](src/app/group-store.ts#L69), que importa
   `firebase/firestore` na primeira linha. `recent-groups.ts` é carregado pela **prateleira**,
   que por decisão de arquitetura **não toca em rede** — importar um do outro traria os
   550 KB do SDK para o pacote inicial e desfaria a otimização mais valiosa do produto.

   Então a correção passa por mover a chave (e um `esquecerCache(id)` de três linhas) para
   um módulo sem Firebase — `preferences.ts` e `naming.ts` são dessa família. É uma decisão
   de fronteira de módulo, não um remendo, e é por isso que **não a implementei aqui**.
   Feita errado, ela custa mais do que o vazamento que conserta.
2. **`S` — o cache tem teto.** Antes de gravar, se o JSON passar de ~500 KB, guardar só a
   cauda do log e o `logVersion` correspondente. Mas isso **quebra a coerência** que
   `load()` exige (`events.length === logVersion`), então precisa da mesma ideia da
   otimização anotada: um marco a partir do qual o replay começa. É a única das três que
   mexe em invariante, e não deve ser feita sem necessidade — e o T-40 mostra que a
   necessidade não é de CPU.
3. **`S` — a falha de gravação deixa de ser silenciosa.** Não para a pessoa (não há o que
   ela faça), mas para o produto: um sinal que a próxima carga possa usar para não tentar
   de novo, e uma linha no aviso de cota explicando que o atalho local parou de funcionar.

**Recomendação: (1) já, (3) junto com o T-12, e (2) nunca até alguém medir que precisa.**

**Prova que falta:** não estourei a cota de verdade num navegador. O cálculo é aritmético
(660 KB por grupo maduro × doze linhas na prateleira = 7,9 MB contra ~5 MB de teto), e ele
diz que o caso é alcançável, não que já aconteceu com alguém.

---

### T-42 · O link compartilhado carrega a query da URL atual `P3` `XS`

**Onde:** [synced-group.ts:300](src/app/synced-group.ts#L300) — `shareUrl` ·
[group-history.ts:362](src/app/group-history.ts#L362) — `machineUrl`

```ts
`${location.href.split('#')[0]}#/g/${this.groupId()}`
```

O `split('#')` corta o fragmento e **preserva a query**. Está visível na captura da gaveta:
o campo `LINK DO GRUPO` mostra `http://localhost:4200/?emu=1#/g/demo`.

Em produção o caso equivalente é chegar por um link com rastreador — `?fbclid=…` que o
Facebook cola, um encurtador com `?utm_source=…` — e então copiar o link do grupo. O que sai
para a conversa leva o rastreador junto: funciona, e fica feio e longo num link que **é** a
cara do produto.

**Proposta:** montar a partir de `location.origin + location.pathname`, que é o endereço do
app sem nada colado.

**Um cuidado que muda a proposta:** `?emu=1` é funcional. Cortar a query inteira faria o
link copiado em desenvolvimento apontar para o **Firestore de produção** a partir do
localhost — que é exatamente o que a regra 2 do README proíbe (*"Nada de teste contra a
produção"*). Então a limpeza precisa preservar `emu` e descartar o resto.

---

### T-16c (complemento) · A gaveta diz, pela cor, que adicionar gente é o mais importante

Registrado como reforço do T-16c, visto na captura da gaveta.

`Carregar` — o botão de adicionar uma pessoa — é o **amarelo**, a ação primária do sistema
visual. `Copiar link do grupo` é o botão de esmalte, secundário. E o bloco `Compartilhar`
vem depois da lista inteira.

Ou seja, além de estar **2.935px abaixo** num clube de 40 (T-16c), o link também está um
degrau abaixo na hierarquia de cor. As duas coisas dizem a mesma frase: *o principal aqui é
cadastrar gente*.

Mas cadastrar gente é o que se faz **uma vez**; mandar o link é o que se faz **toda vez que
alguém novo entra**. E o produto inteiro se define por essa frase: *um grupo é um link*.

---

### T-43 · A primeira visita inteira: 11 gestos e 29 segundos até o primeiro giro

Percorri a jornada completa num aparelho zerado (`localStorage.clear()`), contando cada
gesto e cronometrando:

```
aparelho zerado -> a porta
  "Quem é você?"  ·  campos: [ Ex.: Mariana Souza ] [ Entrar na mesa ]

 1. escrevo meu nome ..................... porta          4s
 2. "Entrar na mesa" ..................... prateleira     6s
 3. "Montar uma máquina" ................. oficina        8s
 4. escrevo o nome do clube .............. oficina        8s
 5. "Montar a máquina" ................... A MÁQUINA     14s
 6. abro os integrantes .................. gaveta        15s
 7. escrevo a 2ª pessoa .................. gaveta        15s
 8. "Carregar" ........................... gaveta        18s
 9. fecho a gaveta ....................... A MÁQUINA     19s
10. "Girar a roleta" ..................... confirmação   20s
11. "Girar mesmo assim" .................. A MÁQUINA     29s

vencedor: Breno · 1 giro no registro · 1 máquina na prateleira
```

**Onze gestos e vinte e nove segundos, com zero becos sem saída.** Cinco superfícies, cada
uma com uma pergunta só, e a última tela é o produto funcionando. É um primeiro uso muito
bom, e vale dizer isso antes de dizer o que falta.

**O que falta é uma coisa só, e ela é grande: o link nunca aparece.** Em nenhum dos onze
passos o produto menciona mandar o link para o clube. A oficina diz *"Depois, mande o link
para quem joga"* no parágrafo de apoio — e depois disso o assunto morre. O link fica a
2.935px dentro da gaveta (T-16c), atrás de uma lista de pessoas.

E o que o primeiro uso ensina no lugar é **digitar o nome dos outros**: o passo 7 é a pessoa
que montou a máquina escrevendo `Breno`. É esse o modelo mental que ela leva.

Isso importa porque é a causa direta do G-01. A organizadora digita `Ana`; a Ana abre o link,
vê `Ana` na fileira, não se reconhece — ela se chama `Ana Paula` —, toca em
`Não estou na lista` e digita. Duas pessoas, para sempre.

**Se o primeiro uso terminasse em "mande o link" em vez de "carregue as cápsulas", cada
pessoa digitaria o próprio nome** — que é a única defesa de verdade contra o G-01. Só que
hoje ela não funciona, pelo T-44.

---

### T-44 · Quem entra pelo link **não entra no globo**, e nada diz isso `P1` `S`

**Onde:** [identity-gate.ts:352](src/app/identity-gate.ts#L352) — `submit()` só chama
`identity.remember()` · [synced-group.ts:106](src/app/synced-group.ts#L106) — `myCapsule()`

**O que:** dizer quem você é **não** carrega a sua cápsula no globo. Só a gaveta adiciona
membros — e, na criação, a caixa `Entrar como a primeira cápsula`.

**Medido**, abrindo o link do `demo` num aparelho zerado, tocando em
`Não estou na lista — escrever meu nome` e entrando como `Gustavo Novato`:

```
tela            : a máquina
crachá          : "Gustavo Novato"  ·  disco "GN" em pinho (cor tirada do nome, não cápsula)
INTEGRANTES     : 6                  ← ele não é um deles
sou uma cápsula : false              ← nenhuma cunha no aro é dele
recados na tela sobre entrar no globo: NENHUM

posso girar        : SIM
posso abrir a ficha: sim
posso abrir a gaveta: sim
```

**A porta reconhece o problema e larga o fio.** O caminho de baixo se chama, com todas as
letras, **"Não estou na lista"**. A pessoa diz que não está na lista, o produto concorda — e
não faz nada a respeito. Ela cai numa máquina onde:

- o globo **nunca** vai sortear o nome dela;
- o crachá dela é um disco de iniciais, e não uma cápsula (o único lugar do produto onde
  isso acontece de propósito, pela Regra do Crachá Vestido — mas ela não tem como saber);
- e o botão amarelo, o maior da tela, **gira a roleta de um clube do qual ela não faz
  parte** — queimando uma vaga do bolo da rodada de outra pessoa, sem volta.

Girar sendo visita **é o desenho**, e está escrito: *"O link é a credencial: quem o tem, lê e
escreve. Não há permissão por pessoa."* Não proponho mudar isso. O problema é outro: **ser
participante e ser cápsula são coisas diferentes, e a tela não distingue as duas.**

**Proposta (`S`), e ela é quase de graça porque tudo já existe:**

Na máquina, quando o crachá não está no globo, uma plaqueta — **a mesma forma do recado do
que se deve**, que já mora ali e já some sozinho quando a pessoa age:

> Você não está no globo desta máquina.  **Carregar a minha cápsula**

- A **condição** já está computada: `myCapsule()` é `null` exatamente nesse caso, e o
  cabeçalho já a usa para escolher a cor do crachá
  ([synced-group.ts:106](src/app/synced-group.ts#L106)).
- A **ação** já existe: `addFromBench(nome)`, com a validação de nome duplicado e o teto de
  60 já dentro dela.
- A **forma** já existe: `.owed-note`, com o mesmo comportamento de sumir depois de resolvida.

**E ela conserta o G-01 pela raiz.** Hoje o primeiro uso ensina uma pessoa a digitar o nome
das outras (T-43), e é aí que nascem as quase-duplicatas. Com esta plaqueta, **cada pessoa
digita o próprio nome, como ela o escreve** — e a fileira de cápsulas da porta passa a
oferecer nomes que as próprias donas escolheram.

**Os cuidados:**

- **É uma oferta, não uma cobrança.** Quem só veio assistir não deve ser empurrado; a
  plaqueta não bloqueia nada e não volta depois de recusada... e aqui há uma decisão: ela
  some para sempre neste aparelho, ou reaparece na próxima visita? O `owed-note` some porque
  a dívida acabou; esta não tem como saber. **Recomendo um "agora não" que a cala neste
  grupo, guardado no aparelho** — é a mesma família do crachá, e não entra no log.
- **Entrar no meio da rodada já torna a pessoa elegível**, e isso é regra escrita
  ([FIREBASE.md](FIREBASE.md), decisão 1). Então carregar a própria cápsula muda o bolo do
  próximo giro — e é justamente o que se quer.
- **Não fazer isso na porta.** A porta é desenhada antes da rede e não pode travar; carregar
  uma cápsula é escrita. O lugar é a máquina, onde o SDK já desceu.

**Prova que falta:** não sei quantas pessoas hoje estão nesta situação em grupos reais — um
crachá que não bate com nenhum membro. O log tem a resposta: é comparar
`participantKey(autor)` de cada evento com as chaves dos membros. Seria o número que decide
se isto é `P1` ou `P0`.

---

### T-45 · O erro de uma reação aparece no topo do boletim, longe do dedo `P3` `XS`

**Onde:** [game-bench.ts:186](src/app/game-bench.ts#L186) — `commitReaction()` ·
[game-sheet.html:179](src/app/game-sheet.html#L179) — onde o erro é desenhado

`commitReaction` é a única escrita que **não** passa por `write()`, e com um bom motivo
escrito no código: *"o dedo está na fileira de emoji e é lá que ele continua"*. Ela não muda
de face nem mexe no foco.

Mas o erro dela vai para o mesmo `error()` de todo o resto, e esse sinal é desenhado **acima
da lista de resenhas**. Num boletim com cinco resenhas, quem tocar em 😂 na última e a
escrita falhar recebe um aviso a uma tela de distância, fora de vista. O `role="alert"` salva
quem usa leitor de tela; quem enxerga não vê nada acontecer.

**Proposta:** a reação já tem `aria-busy` e um estado `saving` no próprio controle
([review-reactions.ts:25](src/app/review-reactions.ts#L25)). O erro cabe no mesmo lugar — o
gatilho vira `is-error` por alguns segundos, com o motivo no nome acessível que ele já monta.
Um sinal que nasce onde o dedo está.

**Junta-se ao T-03:** hoje, sem rede, esse mesmo controle fica girando indefinidamente e
calado. Os dois são o mesmo pedaço de trabalho.

---

### T-38 (complemento) · O estrago do crachá trocado **tem** volta, e o produto quase diz como

**Onde:** [game-bench.ts:164](src/app/game-bench.ts#L164)

```ts
if (!seat.memberId) {
  this.error.set(`${seat.name} assinou uma resenha e não é do grupo: só saindo dela.`);
```

A duplicata `Ana Souza` do T-38 aparece na mesa exatamente assim — uma cadeira sem
`memberId`, porque quem assinou não é membro. E a mensagem, que já existe e é boa, diz o que
fazer: **"só saindo dela"**.

A recuperação completa é: voltar o crachá para `Ana Souza`, abrir a ficha e `Retirar a minha`,
e voltar o crachá para `Ana`.

Convoluto, mas existe — e isso rebaixa o T-38 de "estrago permanente" para "estrago com saída
escondida". **O que continua faltando é alguém dizer isso na hora certa**, que é a proposta do
T-38: avisar antes de trocar, em vez de deixar a pessoa descobrir o caminho de volta lendo
uma mensagem de erro da tela da mesa.

---

### T-46 · O celular deitado perde a barra de baixo `P3` `S`

**Medido**, na máquina, em três orientações paisagem reais:

| Viewport | Overflow | Altura do documento | Nav no rodapé? |
|---|---|---|---|
| 780 × 390 | 0 | 1966px (5 telas) | **não** — fica no cabeçalho |
| 844 × 390 | 0 | 1974px | **não** |
| 740 × 360 | 0 | 1964px | **não** |

A ficha aberta se comporta bem nas três (`742 × 352`, rolando por dentro, sem estouro).

**O que muda é a nav.** A Regra das Duas Barras leva os controles para o pé abaixo de 620px, e
o argumento escrito é o polegar. A condição é de **largura** — e um celular deitado tem 780 de
largura, passa dos 620, e todos os controles voltam para o topo. Deitado, o topo é onde o
polegar menos alcança.

**Proposta:** a condição ganha a altura — `@media (max-width: 620px), (max-height: 480px)`.
Uma vírgula.

**Contra, e é sério:** com 390px de altura, 56px de barra no pé mais 60px de cabeçalho comem
**30% da tela**. Deitado, o conteúdo é o que menos sobra. Pode ser que a resposta certa seja
a barra no topo mesmo — e aí a regra deveria dizer isso, porque hoje ela não menciona
orientação nenhuma.

**Prova que falta:** não sei se alguém usa este produto deitado. A cena de 4,3s sugere que
sim; o resto, que é leitura em coluna, sugere que não. É pergunta para o clube.

---

### T-47 · `prefers-contrast` não existe na folha `P3` `S`

Não há nenhuma regra `@media (prefers-contrast: more)` no produto.

Diferente do T-17 (cores forçadas), aqui o navegador **não** substitui nada: é um pedido do
sistema por mais contraste, e cabe ao site atender.

**Proposta mínima, e ela é quase só as linhas:** sob `prefers-contrast: more`, `--line` e
`--line-paper` sobem para uma opacidade que separe de verdade, e `--chrome-dim` (6,31:1 sobre
esmalte) dá lugar a `--sky` (9,72:1) nos textos de apoio. Nada de repintar o mundo: as
divisórias e o texto secundário são exatamente onde um pedido de mais contraste dói.

Não é piso obrigatório — é a diferença entre atender o pedido e ignorá-lo.

---

### T-48 · O zoom por pinça funciona, e isso não é pouco

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

Sem `maximum-scale`, sem `user-scalable=no`. Quem precisa aproximar, aproxima — inclusive
para ler os 8px dos nomes no aro do globo (T-15) e as casas de 20px da régua a 320px (F-08).

É o atalho que metade da web ainda bloqueia. Registrado para não ser "otimizado" um dia por
causa de um toque duplo indesejado.

---

### T-49 · A cena de materiais custa 4,9 MB e 29,6 s de pintura `P1` `M`

O cenário e os dois atlas do SVG são PNG. Medido num `dist` servido localmente, primeira
visita fria a 1,6 Mbps com `Network.emulateNetworkConditions`, viewport de 1440px:

| Tela | Total na rede | Imagens | LCP |
|---|---|---|---|
| A prateleira | 1973 kB | 1615 kB | **2564 ms** no `h1` |
| A máquina do grupo | **5936 kB** | **4908 kB** | **29 600 ms** em `maquina-materiais.png` |

Os três são RGB **sem canal alfa** — o recorte é feito por `clipPath`, não pelo arquivo:

| Arquivo | Dimensão | Peso | Desenhado em |
|---|---|---|---|
| `public/images/maquina-materiais.png` | 1177×1337 | 1944 kB | aro em 370px; caixa em 372×184 |
| `src/images/bancada-capsulas.png` | 1659×948 | 1615 kB | largura da viewport, banda de até 1120px |
| `public/images/capsula-material.png` | 1254×1254 | 1348 kB | **30px** (as soltas) e **44px** (a entregue) |

O terceiro é o pior: 1,3 MB para um sprite de 44px de lado, ~90x mais pixels do que a tela
usa mesmo a 3x de densidade.

**Proposta, em duas partes que não se dependem.** Re-encodar os três em WebP mantendo as
dimensões em pixel — sem tocar em coordenada nenhuma. E reduzir a escala de
`capsula-material` **sem** mexer nos recortes: `width`/`height` do `<image>` são unidades de
usuário, então um arquivo menor por trás do mesmo `width="1254"` deixa `silhueta-capsula` e
o `viewBox` do `symbol` valendo como estão. O único ajuste é a verificação
`os dois materiais carregam nas dimensões dos recortes` em `e2e-roleta.mjs`, que compara
`naturalWidth` com o atributo: ela passa a cobrar **proporção**, que é o que de fato
desloca peça quando alguém troca a imagem.

**Já corrigido junto desta entrada:** `bancada-capsulas.png` viajava **duas vezes** — 1615 kB
em `images/` (copiado de `public/`) e 1615 kB outra vez em `media/`, emitido pelo `url()` da
folha. O cenário passou para `src/images/`, onde só o empacotador o pede, e o `dist` caiu de
**7,7 MB para 6,2 MB**. A regra de onde cada imagem mora está no `DESIGN.md`.

---

## 4. Deriva de documentação

**Todas as sete foram corrigidas.** Deriva é o único tipo de achado desta auditoria em que
apontar não basta: um documento errado reescreve o trabalho de quem o ler amanhã, e nenhuma
delas exigia decisão de produto.

| | Arquivo | O que dizia | O que passou a dizer |
|---|---|---|---|
| D-01 | `.impeccable/surfaces/src-app-group-history-html.md` | a bancada é `note-editor.html` | é `game-sheet.html`, e o `note-editor` não existe mais |
| D-02 | `.impeccable/surfaces/src-index-html.md` | a lista é local, compartilhada pelo fragmento | um grupo é um link, e o estado vive num log no Firestore |
| D-03 | idem | "390px não pôde ser capturado" | como capturar (`setDeviceMetricsOverride`), e o que foi medido a 390 e a 320 |
| D-04 | `FIREBASE.md` (3ª linha) | o modo por link "continua existindo e não muda" | ele saiu em setembro de 2026, e `e2e-flows` prova |
| D-05 | `DESIGN.md` (O Álbum) | grade 2×2 com `Cápsulas`, `Etiquetadas`, `Rodadas`, `Já saíram` | duas colunas travadas, seis valores, com os nomes de hoje |
| D-06 | `DESIGN.md` (Duas Linhas da Barra) | o nome cede na **máquina** | cede onde há saída escrita — o **álbum** e a oficina —, com a medida a 320px |
| D-07 | `README.md` | "as sete estão listadas abaixo", e faltava a de acabamento | as **nove**, com `e2e-acabamento`, as contagens desta rodada e as duas armadilhas do emulador |

Três delas ganharam mais do que a correção: o briefing do index recebeu a seção de **notas de
medição** (para a próxima pessoa não repetir a conclusão errada sobre 390px), o `DESIGN.md`
recebeu o número medido a 320px, e o `README` recebeu o aviso do `--only firestore,auth` e do
emulador zumbi — as duas coisas que custaram uma rodada inteira de investigação aqui.


### D-01 · O briefing do álbum apontava para um arquivo que não existe `P2` `XS` ✅ FEITO

**Onde:** [.impeccable/surfaces/src-app-group-history-html.md](.impeccable/surfaces/src-app-group-history-html.md) — `related_targets` e a seção "Decisões".

**O que:** o briefing cita `src/app/note-editor.html` como a bancada de etiqueta
compartilhada. Esse arquivo não existe mais no repositório; a ficha do jogo é
[game-sheet.html](src/app/game-sheet.html).

**Por quê:** quem seguir o briefing vai procurar um arquivo fantasma e, pior, pode recriar
um segundo formulário de etiqueta — exatamente o que o briefing queria impedir.

**Proposta:** trocar `note-editor.html` por `game-sheet.html` nos `related_targets` e no
texto. Não é tarefa de design — é conserto de contrato.

---

### D-02 · O briefing do index descrevia um produto que foi removido `P2` `XS` ✅ FEITO

**Onde:** [.impeccable/surfaces/src-index-html.md](.impeccable/surfaces/src-index-html.md)

**O que:** o briefing ainda diz "A lista fica local salvo quando compartilhada pelo fragmento
do link" e "Atualizações de participantes entre navegadores exigem recompartilhar o link,
porque o GitHub Pages não tem persistência compartilhada". O modo por link estático saiu em
setembro de 2026 e existe Firestore desde então.

**Por quê:** é a descrição do produto anterior. Um agente que ler isso vai desenhar para uma
restrição que não existe mais — e pode reintroduzir a explicação de "recompartilhe o link".

**Proposta:** reescrever o briefing do index para o produto atual (Firestore, o link é a
credencial, a prateleira é a raiz).

---

### D-03 · A "decisão não resolvida" do index citava uma medição que já não vale `P3` `XS` ✅ FEITO

**Onde:** [.impeccable/surfaces/src-index-html.md](.impeccable/surfaces/src-index-html.md) — última linha.

**O que:** "O layout estreito foi validado a 500px: o Chrome headless desta máquina impõe
viewport mínimo de ~500 CSS px, então 390px não pôde ser capturado."

**Por quê:** o `DESIGN.md` atual traz medidas explícitas a 390×780 (`175px` de barra, `130px`
por célula da nav inferior, `107px` em 320) — ou seja, alguém **conseguiu** medir a 390px
depois disso. A restrição registrada como aberta já foi vencida e a nota deixou de ser
verdadeira.

**Proposta:** apagar a nota ou substituí-la pelo método que passou a funcionar.

---

---

### D-04 · O `FIREBASE.md` abria dizendo que o modo por link continua existindo `P1` `XS` ✅ FEITO

**Onde:** [FIREBASE.md:3](FIREBASE.md#L3) — a terceira linha do arquivo.

> *"Modo novo, ao lado do atual. O modo por link (`#grupo=...`) **continua existindo e não
> muda** — há gente usando, e `compatibility.spec.ts` prova que os resultados antigos seguem
> intactos."*

O modo por link foi removido em setembro de 2026. O `README`, o `PRODUCT.md` e o
`e2e-flows` dizem isso — há inclusive um teste chamado *"um link do formato antigo cai na
prateleira, sem inventar um grupo"*. E `compatibility.spec.ts` **não existe** no repositório.

**Por quê é `P1` e não `P2` como as outras derivas:** é a **primeira coisa** que alguém lê
ao abrir o documento do modelo de dados. Quem estiver mexendo nas rules ou no `group-store`
começa a leitura acreditando que existe um segundo produto a preservar — e vai desenhar
defesas para ele.

**Proposta:** trocar o parágrafo pelo estado atual. Uma frase resolve: o log sincronizado é
o produto inteiro; o modo por link saiu em setembro de 2026 e os links antigos caem na
prateleira.

---

### D-05 · O `DESIGN.md` descrevia a grade de números do álbum que não existe mais `P2` `XS` ✅ FEITO

Registrado em L-05, repetido aqui para o índice: a seção *O Álbum* promete
`2×2 (Cápsulas, Etiquetadas, Rodadas, Já saíram)`. São **seis** valores hoje, e nenhum dos
quatro rótulos sobreviveu. A regra ("a grade fecha") continua valendo; a descrição, não.

---

### D-06 · A Regra das Duas Linhas descrevia o oposto do que o CSS faz `P2` `XS` ✅ FEITO

Registrado em T-19, repetido aqui: o `DESIGN.md` diz que o nome do crachá cede *"com dois
comprimidos na fileira — a máquina"* e que *"O álbum tem um comprimido só e mostra o nome
inteiro"*. Medido, é o contrário: a regra é `.topbar:has(.back-link) .who-name`, o
`back-link` existe no álbum e na oficina, e é lá que o nome cede.

O comportamento está certo — quem tem a saída escrita na barra é quem precisa de espaço. É a
descrição que está trocada, e ela é o que alguém lê antes de mexer.

---

### D-07 · Nove suítes, e o README listava sete `P3` `XS` ✅ FEITO

**Onde:** [README.md](README.md#8-antes-de-dizer-que-terminou) — *"As sete estão listadas
abaixo"*.

O bloco lista de fato **nove** comandos verificáveis (`test`, `test:rules`, `test:store`,
`test:migration`, `test:a11y`, `test:etiqueta`, `e2e-flows`, `e2e-roleta`, mais o `build`), e
existe ainda uma décima que **não** está no bloco: `node tests/e2e-acabamento.mjs`, com 59
verificações, citada só no [HANDOFF.md:175](HANDOFF.md#L175).

A `e2e-acabamento` é a suíte que cobre o seletor de reações inteiro — inclusive o emote novo
deste trabalho. Quem seguir só o README não a roda, e ela é a que pega regressão de
acabamento.

**Proposta:** o bloco do README passa a listar as **nove** com as contagens desta rodada, e a
frase acima dele passa a dizer nove.

---

## 5. Ideias de produto

Nada aqui é defeito. São coisas que o produto **poderia** ser, escolhidas por caberem no que
ele já é: sem conta, sem servidor próprio, sem custo, e com tudo derivado do log.

Cada uma traz o que ela custaria e **o argumento contra**, porque uma ideia sem contra-argumento
é uma ideia que ninguém pensou até o fim.

---

### I-01 · Levar o registro embora `M` — a rede de proteção que falta

**O buraco que ela tapa.** Três achados desta auditoria terminam no mesmo lugar: **perder o
link é perder o clube**. P-01 (esquecer uma máquina não pergunta nem desfaz), P-02 (a 13ª
máquina apaga a 1ª em silêncio) e o fato, escrito no `PRODUCT.md`, de que listar grupos é
proibido nas rules de propósito. Não há e-mail, não há conta, não há recuperação.

E o produto **já tem** o log inteiro no aparelho de cada pessoa — 5.690 bytes para o grupo
`demo`, medido.

**A ideia.** Um `Salvar o registro` que baixa o log como JSON: os eventos crus, com a versão
e o id do grupo. Não é uma exportação bonita — é o **arquivo-fonte**, do qual `replay()`
reconstrói tudo.

**Por que ela combina com este produto e não com outro.** O log é append-only e é a verdade;
a nota, o vencedor e a rodada são derivados dele. Um clube que guarda o JSON guarda o clube.
Combina com a promessa de "sem conta": sem conta também quer dizer sem refém.

**Contra.** O arquivo carrega os nomes de todo mundo e o texto de todas as resenhas — é o
conteúdo do clube num arquivo que sai do aparelho. Isso não é novo (o pôster também sai), mas
o pôster foi desenhado para **não** levar o link, e um JSON com o `id` do grupo dentro leva.
Se a ideia entrar, **o id fica de fora** pelo mesmo motivo que a URL fica fora do pôster.

**O que ela NÃO deve virar.** Um "importar" que recria o grupo. Isso exigiria escrever
eventos com carimbos de hora escolhidos pelo cliente, e é exatamente a invariante nº 2 —
*"a única entrada imprevisível é o `request.time` do servidor"*. Restaurar um log seria
poder forjar um vencedor. Levar embora, sim; trazer de volta para dentro, nunca.

---

### I-02 · O título da aba diz o que você deve `XS` — grátis, e chega onde nada mais chega

**A ideia.** Quando esta pessoa deve resenhas, `document.title` vira
`(2) Mesa do Mês — Clube da Firma`.

**Por que ela é boa aqui.** O produto não tem servidor, então não tem notificação, e-mail
nem lembrete — e o `owed-note` só funciona para quem já está com a página aberta. O título
da aba é o único canal que alcança alguém que deixou a máquina aberta numa aba e foi fazer
outra coisa. É o mesmo `(2)` que todo mundo já sabe ler.

**Custo:** uma linha de efeito sobre `pending()`, que já existe e já está computado.

**Contra.** Marcador em título de aba é um pedido de atenção, e o produto é deliberadamente
quieto (a Regra do Momento Único, o som que começa desligado). A defesa é que ele não
interrompe nada: quem não olha, não vê.

---

### I-03 · O crítico severo do clube `S` — uma conta que o clube vai querer discutir

**A ideia.** No álbum, ao filtrar por uma pessoa, mostrar **a média que ela dá** ao lado da
média do clube nos mesmos jogos: `Ana dá 7,4 · o clube dá 8,1 nos mesmos jogos`.

**Por que ela combina.** É derivada, recontada na tela, nunca gravada — exatamente o
princípio do produto. Custa **zero leitura** e **zero escrita**: o log já está carregado.

E ela responde a uma pergunta que todo clube de jogos faz em voz alta e nunca consegue
provar: *quem é o durão*. É o tipo de número que gera conversa, que é o que este produto
existe para gerar.

**Cuidado forte.** A comparação tem que ser **sobre os mesmos jogos**, e não "a média dela"
contra "a média geral do álbum" — quem só resenhou os três jogos que o clube amou pareceria
generosa por acidente. O denominador é a interseção.

**Contra, e é sério.** Isto transforma opinião em placar, e o produto **já recusou** esse
caminho uma vez: A Regra da Marca de Reescrita diz que o contador de versões saiu porque
*"transformava a autoria numa pontuação que o clube nunca discutiu"*. A diferença é que
"quem reescreve mais" não é uma pergunta interessante e "quem é o durão" é — mas quem
escreveu aquela regra é quem decide se a diferença basta.

---

### I-04 · O clube já jogou isso `S` — a memória que o álbum não tem

**A ideia.** Ao escrever o nome de um jogo na ficha, se o clube **já jogou** um jogo com esse
nome, dizer: `Vocês já jogaram Overcooked 2 em março, e o clube deu 9,2.`

**Por que.** O produto guarda um ano de jogos e não tem nenhuma forma de perceber repetição.
Um clube de seis pessoas em duas rodadas por ano acumula doze jogos; ninguém lembra do quarto.
E a informação já está toda no log carregado.

**Custo:** uma comparação por título normalizado, no `commitNote`. Sem rede.

**Contra.** Repetir de propósito é legítimo — revanche, expansão, "vamos zerar de novo". O
aviso não pode bloquear nada, e a redação não pode soar como correção. É **memória**, não
validação.

**Cuidado com a normalização.** Comparar títulos é uma normalização nova, e este projeto tem
uma cicatriz sobre normalizar nomes ([`naming.ts`](src/app/naming.ts) é congelada de
propósito). A saída é que esta comparação **nunca decide identidade** — ela só mostra uma
frase. Nada é gravado a partir dela, então errar custa uma frase boba e não um histórico
partido.

---

### I-05 · Quem já resenhou, na cara do cartão `XS`

**A ideia.** No cartão do álbum e na célula do registro, a contagem `2 resenhas de 6` vira
duas cápsulas + `e mais 4`, com as cápsulas de quem **já** escreveu.

**Por que.** O produto é uma coleção de cápsulas, e a única contagem que hoje é um número
seco é justamente a que fala de pessoas. Ver a própria cápsula ali é a diferença entre
"faltam quatro" e "falta **você**" — que é o que o `owed-note` tenta dizer com palavras.

**Custo:** as cápsulas já estão desenhadas em cinco lugares; é reuso.

**Contra.** O cartão do álbum já é denso — a Regra da Medida em Foco existe para conter isso.
E o lacre esconde a média mas mostra a fila; trocar a fila por rostos pode virar cobrança
pública em vez de informação. É exatamente o tipo de coisa que precisa ser vista antes de
ser decidida.

---

### I-06 · A rodada que fecha `S` — o momento que o produto tem e não celebra

**A ideia.** Quando a última cápsula de uma rodada sai, a máquina diz que a rodada **fechou**
— o álbum ganha a régua daquela rodada com a nota média dela, e o palco marca o capítulo.

**Por que.** A rodada é a unidade do produto: *"uma rodada termina quando todos saíram; a
próxima abre com o globo cheio"*. É a coisa mais próxima de um final que este produto tem, e
hoje ela passa numa frase de apoio: *"Todos já saíram — a próxima rodada abre com o globo
cheio."*

Um clube que fecha a rodada 3 acabou de completar uma coleção. O produto inteiro é sobre
completar coleções.

**Contra, e ele é a Regra do Momento Único.** Não pode haver um segundo momento autoral. Se
esta ideia entrar, ela entra **dentro** da entrega que já existe — a última cápsula cai com o
confete de sempre, e o que muda é o **texto** e a régua no álbum, não a animação. Qualquer
coisa que anime sozinha aqui quebra a regra mais protegida do sistema.

---

### I-07 · Uma prévia de link que valha a pena colar `XS`

Registrada em T-05 como defeito de metadados; aqui como ideia, porque o teto dela é maior.

Com `og:image` estático, todo link colado no WhatsApp ganha o mesmo cartão. Mas o **id do
grupo mora no fragmento**, que nenhum robô recebe — então a prévia é obrigatoriamente
genérica, e isso é privacidade de graça.

O que dá para fazer com uma prévia genérica: torná-la **um convite**. `Alguém te chamou para
uma mesa` com a máquina desenhada. É o único ponto do produto que fala com quem **ainda não
é** usuário, e hoje ele é uma linha de texto cinza.

**Contra.** Uma prévia que promete demais decepciona: quem clica cai numa porta que pergunta
o nome. Ela tem que prometer exatamente isso.

---

### I-08 · O que **não** fazer

Anti-ideias, porque um documento de melhorias sem elas convida à próxima má ideia.

- **Notificação, e-mail ou lembrete.** Exige servidor, exige Blaze, e a invariante nº 7 é
  clara: *"Nunca habilite faturamento no Firebase."* O caminho para lembrar alguém é o
  I-02, que é grátis.
- **Conta e senha.** *"O link é a credencial"* é a decisão que faz o produto existir sem
  custo. Conta traria recuperação de acesso — e traria também servidor, e-mail, LGPD e um
  cadastro antes da primeira mesa.
- **Um campo de vencedor, "só para acelerar".** Já foi um buraco de segurança real neste
  repositório. Está escrito na invariante nº 1.
- **Reordenar a paleta para "melhorar as cores".** A cor de cada pessoa vive no log como
  índice. Reordenar repinta todo mundo, em todos os grupos, para sempre.
- **Um segundo momento animado.** A entrega é o único. Qualquer contador que sobe, entrada
  por scroll ou pulso de atenção desfaz o que faz esta página parecer um objeto e não um
  site.
- **Unificar `josé` e `jose`.** A aspereza é intencional e está na invariante nº 3. O jeito
  certo de resolver o problema real por trás dela é o **G-01** — perguntar antes de criar
  uma segunda pessoa —, e não mexer na normalização.

---

## 6. A crítica formal da máquina (playbook `critique`)

> ⚠️ **Rodada parcialmente degradada.** O playbook exige duas avaliações isoladas em
> subagentes. A **Avaliação A** (revisão de design) rodou e está inteira abaixo. A
> **Avaliação B** (detector + evidência de navegador) foi interrompida pelo limite de sessão
> antes de devolver a tabela dela. O detector, porém, **já havia sido rodado nesta auditoria**
> e voltou limpo: `node .claude/skills/impeccable/scripts/detect.mjs src/` → **0 achados**,
> saída 0. O que falta da B é a medição de camadas, `z-index`, nós de DOM e tempo de layout —
> não há síntese A×B completa, e por isso esta seção é a A com as minhas verificações por
> cima, e não a crítica sintetizada que o playbook pede.

### Veredito de especificidade: **alta, com uma rachadura no lugar mais visível**

Nenhum outro produto usa esta composição sem mudar nada: o palco assimétrico, as 84
caneluras desenhadas uma a uma ([machine.ts:140](src/app/machine.ts#L140)), a chapa repintada
com a cor de quem ganhou, e a rotação de destino que sai da **mesma conta** que desenha as
cunhas ([synced-group.ts:611](src/app/synced-group.ts#L611)) — a cápsula para na calha porque
a matemática manda, não porque alguém ajustou um deslocamento.

**A rachadura é uma palavra.** O botão principal diz `Girar a roleta`, a confirmação diz
`Tem certeza que deseja girar a roleta?` e o nome acessível da peça diz
`Girar a roleta de novo`. *Roleta* é o vocabulário do sorteador genérico — e a três linhas de
distância a mesma tela acerta: *"Toque no globo para ver a **entrega** de novo"*, *"A cápsula
já saiu do globo"*. O produto tem palavra própria e não a usa onde ela mais pesaria.

### C-01 · A frase que ensina a regra de não repetição é inalcançável `P1` `S`

**Onde:** [synced-group.html:127](src/app/synced-group.html#L127) —
`@if (!pool().length) { Todos já saíram — a próxima rodada abre com o globo cheio. }`

**Conferi no replay, e procede.** [group-log.ts:481](src/app/group-log.ts#L481):

```ts
pool = available.filter((id) => id !== winnerId);
if (!pool.length) { round += 1; pool = activeIds(); drawnThisRound = new Set(); }
```

O bolo é **reabastecido no mesmo evento que o esvazia**. Então `state.pool` nunca fica vazio
depois do último giro de uma rodada — ele já volta cheio.

`!pool().length` só é verdadeiro quando `activeIds()` devolve vazio, ou seja, quando o grupo
**não tem nenhum membro ativo**. E nesse estado a frase é falsa: não há "próxima rodada com o
globo cheio", há um globo vazio porque todo mundo saiu.

**A única frase da tela que ensina o motivo de o produto existir aparece só onde ela mente.**
Fechar uma rodada — completar a coleção, que é a prova que o produto oferece — passa como um
dígito trocando no adesivo, de `R1` para `R2`.

**Proposta:** a condição certa não é o bolo vazio, é a **rodada ter virado neste giro**. O
replay já sabe disso; o estado não expõe. Um `spin.round !== state.round` no último giro, ou
um campo derivado `fechouRodada` no `SpinRecord`, dá a condição — e aí a frase aparece
exatamente uma vez, no giro que completou a coleção.

### C-02 · O aviso de cota é a quarta superfície de papel `P2` `XS`

**Onde:** [synced-group.html:64](src/app/synced-group.html#L64) ·
[styles.scss:593](src/styles.scss#L593)

`.usage-note` é `--paper-quiet` com `--note-ink` sobre o esmalte, no alto da máquina. A Regra
da Única Quebra lista **três** ocorrências de papel e exige que uma quarta *"prove que é
administração — gravar o mesmo tipo de evento que as outras três"*. O aviso de cota não grava
nada; é infraestrutura.

E o texto dele (`Muitos pedidos deste aparelho hoje`) é exatamente o tipo de explicação de
máquina que a Regra do Texto proíbe — sobrevive pela exceção do erro-com-saída, mas o
**material** está errado: papel é onde se opera, e ali não se opera nada.

*(Detalhe de acabamento junto: a regra usa `!important` em `color` e `font-size`. Um
`!important` na folha de sistema é uma disputa de especificidade que ficou sem resolver.)*

### C-03 · O giro de verdade é indistinguível do ensaio `P1` `M`

`spin()` ([synced-group.ts:521](src/app/synced-group.ts#L521)) produz os **mesmos** 4,3
segundos, o **mesmo** confete, o **mesmo** `h1` e o **mesmo** parágrafo que `replayScene()`.
Nenhum aviso, nenhuma diferença de cópia, nenhuma marca.

A confirmação diz *"não pode ser desfeito"* e, dois segundos depois, a consequência chega
vestida de reprise. O `DESIGN.md` diz *"encenar não é decidir"*; a tela faz **decidir parecer
encenar**.

Some-se ao T-07 (a cena roda sozinha em toda visita, dizendo `Entregando` no presente) e o
resultado é o pior dos dois: quem abre o link pela primeira vez acha que **causou** um
sorteio, e quem gira de verdade não recebe nada que marque o gesto irreversível.

**Proposta:** uma batida a mais só no giro verdadeiro — o aviso do rodapé, que já existe e já
é usado por toda outra escrita, dizendo `Breno saiu do globo.` O confete e a cena continuam
os mesmos; o que muda é haver **um** sinal que só a decisão produz.

### C-04 · A manivela gira enquanto o servidor não respondeu `P2` `S`

Complemento honesto ao **T-32**, que eu corrigi pela metade.

`spin()` liga `isSpinning` de forma síncrona e só chama o servidor três linhas depois.
`.machine.is-spinning` dispara a animação da manivela ([styles.scss:126](src/styles.scss#L126))
e o assentamento das cápsulas soltas no mesmo instante.

Eu tirei o globo do recuo de sete voltas (T-32) — ele agora fica **parado** esperando. Mas a
**manivela continua girando 720°** durante a espera, e o `h1` continua afirmando `Entregando`
sobre um giro que o servidor ainda não decidiu. Se ele recusar, a manivela terá girado para
nada.

**A correção do T-32 melhorou o defeito e não o fechou.** O fechamento é a mesma ideia: nada
na peça se move antes da resposta. `is-spinning` precisa virar dois estados — *perguntando* e
*entregando* —, e só o segundo anima.

### C-05 · O globo diz 2 e a grade diz 1, e no celular nada reconcilia `P2` `S`

Já registrado como **T-16d** pela minha medição; a Avaliação A achou o pedaço que faltava.

O decalque `2 NO GIRO` ([machine.html:69](src/app/machine.html#L69)) é a **única** legenda que
explica a diferença entre o globo (a foto do instante do giro) e a contagem (o bolo de agora).
E ele é desktop-only: [styles.scss:627](src/styles.scss#L627) apaga `.decals` abaixo de 980px.

No celular, onde os dois números ficam a 600px um do outro, a legenda que os separa não
existe.

### C-06 · Heurísticas de Nielsen, com nota

| # | Heurística | Nota | Em uma frase |
|---|---|---|---|
| 1 | Visibilidade do estado | **3** | Contagem regressiva, `lido agora`, `aria-busy` e toast — mas o globo e a grade discordam (C-05). |
| 2 | Correspondência com o mundo real | **3** | Calha, bandeja, manivela, canelura: metáfora de primeira linha, furada pela palavra "roleta". |
| 3 | Controle e liberdade | **2** | A cena de 4,3s roda sozinha, não pula, e trava a ação primária (T-07). |
| 4 | Consistência e padrões | **3** | A cor de uma pessoa é a mesma em seis lugares; desconta "roleta"/"entrega" e a quarta superfície de papel. |
| 5 | Prevenção de erro | **3** | A confirmação diz a consequência; desconta que a cena automática ensina que girar é casual. |
| 6 | Reconhecer em vez de lembrar | **3** | Quase tudo está na tela; desconta ter de lembrar que o globo é uma foto. |
| 7 | Flexibilidade e eficiência | **3** | Reencenar, atalho da resenha devida, som; desconta três destinos duplicados e nenhum jeito de pular a cena. |
| 8 | Estética e minimalismo | **3** | Duas faixas e um rodapé; desconta 3 das 4 células da grade de série repetirem o que já está visível. |
| 9 | Erros: reconhecer e recuperar | **3** | `explain()` fala português com saída; desconta o fallback cru em inglês (T-22). |
| 10 | Ajuda e documentação | **2** | Não é `n/a`: a própria regra abre exceção para "o que um controle faz quando não se vê", e a cena automática é exatamente isso, e não é dita. |

**Média 2,8 de 4.** As duas notas 2 apontam para o mesmo lugar: a cena de abertura.

### C-07 · Carga cognitiva e jornada

**Carga.** Um único ponto de decisão com mais de quatro opções — o registro, com cinco
células de peso visual idêntico mais três controles. Não é grave porque só um alvo é amarelo.
**A primeira dobra tem 8 controles e exatamente 1 amarelo**, e a Regra da Escala Sozinha
funciona.

**Densidade que não paga:** das quatro células da grade de série, `Rodada 1` repete o `R1` do
adesivo, `Giros 5` repete o `5 GIROS` do mesmo adesivo, e `Grupo` repete o rodapé. **Quatro
células, um dado novo** (`No globo agora`), cobrando 2,6rem de margem e uma faixa costurada.

**Jornada.** O pico é autoral e bom. O vale é a espera de rede (C-04). E o **fim** — a regra
do pico-e-fim — não existe: fechar a rodada é o clímax do conceito e não acontece na tela
(C-01).

**Bandeiras por persona:**

- **Quem abre o link pela primeira vez** vê uma cena rodar sozinha dizendo `Entregando` no
  presente, e conclui — com razão — que abrir o link disparou um sorteio. Durante esses 4,3s
  o botão principal está cinza sem dizer por quê. É a bandeira mais vermelha da superfície.
- **Quem administra** tem dois caminhos para a gaveta e dois para o álbum na mesma página, e
  **nenhum** para o link do grupo (T-16c). A espera de 30s só existe como rótulo de um botão
  `disabled`, que o teclado pula e o leitor de tela não anuncia.
- **Quem só quer ler** paga 4,3s de animação, ouve a região viva anunciar `Entregando` a cada
  visita para uma cena que não vê, e encontra no registro uma célula lacrada **idêntica** a
  uma célula sem resenha nenhuma — o álbum tem `.album-sealed` para separar as duas; o
  registro não tem nada.

### C-08 · Observações menores da crítica

- `caption="Toque no globo…"` diz *toque* num desktop com mouse.
- `.machine-replay:disabled` mantém `opacity: 1` (certo, não apaga a máquina) — mas então
  clicar durante a cena não dá retorno nenhum.
- O `h1` do palco é o nome do vencedor **e** o `aria-labelledby` da seção: sem giro, a região
  passa a se chamar `Pronta para girar`, que é um estado, não um nome de região.
- `winnerText()` devolve branco quando a cor não alcança 4.5:1 sobre esmalte, e
  [styles.scss:151](src/styles.scss#L151) define `.winner-name { color: var(--live) }` — o
  inline vence. Funciona, e é frágil: apagar o `[style.color]` reabre um buraco de contraste
  sem que nada avise.
- Só há dois níveis de cabeçalho na página, e o `h1` é um nome próprio: navegar por títulos
  não leva a lugar nenhum útil.

### C-09 · As três perguntas que ficam para o clube

1. **Se um giro de verdade e uma carga de página produzem os mesmos 4,3 segundos, o mesmo
   confete e a mesma frase, o que o "não pode ser desfeito" está comprando?**
2. **O globo é a foto do último giro ou o estado de agora?** Hoje a tela mantém as duas
   respostas a 400px de distância e apaga a legenda que as separa justamente no celular.
3. **Se a coleção completa é a prova, por que fechar uma rodada é a única coisa desta tela
   que o produto não comemora — e a frase que a anuncia é inalcançável?**
