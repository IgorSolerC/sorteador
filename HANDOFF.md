# Handoff — Mesa do Mês

Estado em **2026-09-04**, logo depois de publicar. Tudo verde, nada pendente que bloqueie.
Este arquivo é para quem assume o trabalho; ele não substitui `PRODUCT.md` (o quê e por quê),
`DESIGN.md` (o sistema visual) e `FIREBASE.md` (dados, rules e custo) — **leia os três antes
de mexer em qualquer coisa.**

---

## 1. O que é

Angular 21 standalone + signals, zoneless, publicado no GitHub Pages, com Firestore no plano
gratuito (**Spark — nunca habilite billing, não há Cloud Functions nem Storage**).

Um clube de jogos sorteia quem escolhe o jogo da vez. Um **grupo é um link**; quem tem o link
lê e escreve. Cada pessoa é uma **cápsula** com cor e emoji próprios.

- Produção: <https://igorsolerc.github.io/sorteador/>
- Projeto Firebase: `sorteador-ed1c9`
- Grupo real do usuário: `zDsap8v8oGdr1oZQhR9q` (MinezadaGames, 9 pessoas)

Rotas (tudo em hash, porque o Pages não reescreve caminhos):

| Rota | O que é |
|---|---|
| `/` | A prateleira: grupos que este aparelho já abriu (só `localStorage`) |
| `#/novo` | A oficina: montar um grupo |
| `#/g/<id>` | A máquina + o registro dos giros |
| `#/g/<id>/album` | O álbum: parede de todas as cápsulas que já saíram |

---

## 2. As invariantes que você não pode quebrar

Estas não são preferências. Quebrar qualquer uma reescreve o passado de gente que está usando.

1. **O log é append-only e é a verdade.** Nenhum estado derivado é gravado. Um campo de
   vencedor gravável seria um vencedor forjável — isso já foi um buraco de segurança real,
   documentado em `FIREBASE.md`. Tudo sai de `replay()` em `group-log.ts`.
2. **A única entrada imprevisível de um giro é `request.time` do servidor.** O cliente não a
   escolhe. É isso que impede quem tem o link de escrever a si mesmo um resultado.
3. **A normalização de nomes (`naming.ts`) é congelada, com asperezas.** `josé silva` e
   `jose silva` são pessoas diferentes. Ela decide o `memberId`; mudá-la reescreve histórico.
4. **A ordem de `CAPSULE_COLORS` (`palette.ts`) é congelada.** A cor de cada pessoa vive no
   log como **índice**, não hexadecimal. Reordenar repinta todo mundo. **A paleta só cresce
   pelo fim**, e `STRIDE` tem que continuar **primo com o tamanho dela** (hoje 11 e 24) —
   um passo não-primo fecha um ciclo curto e repete cores.
5. **Toda cor de cápsula passa de 4.5:1 sobre o esmalte E aceita tinta escura por cima.**
   `palette.spec.ts` mede as 24 nos dois sentidos e derruba o build se uma nova falhar.
6. **As rules vão ao ar ANTES do site.** Na ordem inversa, todo mundo recebe uma interface
   cujas escritas o servidor recusa:
   ```
   npx firebase deploy --only firestore:rules --project sorteador-ed1c9
   git push origin main   # o workflow publica o site
   ```
7. **Campo novo em evento entra opcional na rule.** `(!('campo' in d) || textoOpcional(...))`.
   Uma aba aberta no minuto do deploy não manda a chave, e recusá-la quebra quem está com o
   app na tela. Foi assim que `subtitulo` entrou.
8. **`prefers-reduced-motion` é honrado em CSS *e* em JS.** Desligar só o CSS deixa a página
   parada esperando um timer de 4,3s.

---

## 3. Mapa dos arquivos

```
src/app/
  app.ts/html          casca: lê a rota do hash, guarda a porta
  identity.ts          quem está mexendo (signal + localStorage). Serviço, não componente:
                       máquina, álbum e bancadas precisam do MESMO nome
  identity-gate.*      A PORTA. Ninguém entra sem se identificar
  home.*               A PRATELEIRA (raiz)
  recent-groups.ts     lista local de grupos visitados — não dá acesso a nada
  create-group.*       a oficina (#/novo)
  synced-group.*       a máquina + o registro. É o componente central
  group-history.*      o álbum
  machine.ts/html      o SVG da máquina. Recebe `people: MachinePerson[]` prontos
  roster-bench.*       A GAVETA da coleção: duas faces (lista / bancada de uma cápsula)
  note-editor.*        a bancada da etiqueta (apresentacional)
  note-bench.ts        a orquestração da etiqueta, compartilhada por máquina e álbum
  confetti.ts          canvas, 64 partículas, sai da bandeja
  palette.ts           as 24 cores + o passo de distribuição
  group-log.ts         O CORAÇÃO: tipos de evento e replay() puro
  group-store.ts       a camada Firestore. Toda ida à rede passa pelo UsageGuard
  usage-guard.ts       orçamento por aparelho (1500 leituras / 300 escritas por dia)
  naming.ts            normalização de nomes + hashString
  focus-trap.ts        prende o Tab dentro de um aria-modal
firestore.rules        a fonte da verdade do modelo de segurança
```

**Removido em 2026-09-04, a pedido do usuário:** o modo por link estático
(`draw-engine.ts`, `share-link.ts`, `compatibility.spec.ts`). O sorteio mensal determinístico
que vivia dentro do endereço não existe mais; links `#grupo=...&inicio=...` caem na prateleira.

---

## 4. O modelo de dados, em uma tela

```
grupos/{id}
  nome, criadoEm, ultimoGiroEm, versaoLog     ← só o que as rules validam sozinhas

grupos/{id}/eventos/{eventoId}                ← append-only
  tipo: member_added | member_removed | member_styled | spin | spin_annotated
  em: timestamp                               ← obrigatoriamente request.time
  nome? memberId? cor? emoji?                 ← membros
  giro? titulo? subtitulo? descricao?         ← etiquetas
  autor?                                      ← não verificado, é um crachá
```

- **`versaoLog` sobe na MESMA escrita em lote do evento** (`getAfter()`). Um evento não entra
  sozinho. É isso que permite o cache local buscar só o delta: **1 leitura no caso comum**.
- **Todo `spin` tem que carimbar `ultimoGiroEm == request.time`**, e só um `spin` pode mexer
  nela. Faltava a primeira metade; sem ela a espera de 30s era conselho.
- `member_styled`: `cor` e `emoji` são independentes. Omitir um = "deixe como está".

---

## 5. Suítes e como rodar

```bash
npm test -- --watch=false   # 232 unitários e de componente
npm run test:rules          # 75 rules no emulador (sobe o próprio, sem rede)
npm run test:store          # 28 de integração da camada de dados
npm run test:a11y           # 8 telas x 3 larguras — precisa de npm start + emulador
npm run test:etiqueta       # 35 de ponta a ponta num navegador real — idem
node tests/e2e-flows.mjs "http://localhost:4200/?emu=1"   # 13 fluxos
npm run smoke:site          # 13 no SITE PUBLICADO, contra o Firestore de produção
```

Para trabalhar contra o emulador:

```bash
npx firebase emulators:start --only firestore,auth --project sorteador-ed1c9
npm run build:testjs && node tests/seed-emulator.mjs   # grupo "demo" com cara de real
npm start
# http://localhost:4200/?emu=1#/g/demo
```

O semeador usa o **Admin SDK** de propósito: a espera de 30s entre giros é real, e semear
cinco giros pelo caminho normal levaria dois minutos e meio.

**Capturas:** `node tests/shot.mjs <url> <saida.png> <esperaMs> <larg> <alt>`, com
`SHOT_AUTOR="Nome"` para passar pela porta e `SHOT_CLICK="sel1|sel2"` para telas que só
existem depois de um clique. **Nunca use `--virtual-time-budget`** em telas que falam com o
Firestore: o tempo virtual atropela os streams e faz uma página boa parecer travada.

---

## 6. Armadilhas que já custaram tempo

- **`size()` nas rules conta unidades UTF-16**, não bytes nem pontos de código. Um `slice`
  cru nessa medida parte um par substituto e grava meio emoji. Ver `noteText()`.
- **Um emoji é um grafema, não um ponto de código.** `emojiText()` usa `Intl.Segmenter`;
  cortar por ponto de código parte uma família ao meio.
- **Ir de `/base/` para `/base/#rota` é só troca de hash — o navegador NÃO recarrega.** Em
  script de teste, escreva o `localStorage` e dê `Page.reload`. Isso derrubou o smoke inteiro.
- **`ngModel` propaga num microtask.** Em teste: `dispatchEvent(new Event('input', {bubbles:true}))`
  → `await fixture.whenStable()` → `detectChanges()`. Sem esperar, o Angular reescreve o valor
  antigo. Componente aninhado (dentro de `@if`) pode precisar de um `whenStable` extra antes.
- **`display: contents` num `<button>`** o tira da árvore de layout e leva o anel de foco junto.
- **SVG não tem z-index**: a ordem no documento *é* a camada. Os decalques da máquina ficam
  ANTES do globo de propósito.
- **`linearGradient` em caixa delimitadora de altura zero não pinta nada.** Uma linha reta
  precisa de cor chapada.
- **`toEvent()` devolve `{type:'unknown'}` para tipos desconhecidos**, nunca `null`. Descartar
  faria `events.length < versaoLog` para sempre e rebuscaria o log inteiro em toda abertura.
- **Heredoc do bash come crases e caracteres invisíveis.** Para conteúdo com regex, emoji ou
  acentos, escreva um `.py` num arquivo e rode — não `python -c` dentro de aspas duplas.
- **Arquivos com CRLF** quebram substituição por regex silenciosamente. Use a ferramenta de
  edição ou fatie por `indexOf`.

---

## 7. O que ficou aberto

Nada bloqueante. Em ordem de custo:

1. **`.impeccable/design.json` está defasado** da paleta de 24 cores (o sidecar ainda tem os
   `colorMeta` das seis antigas). A skill manda **reportar, não consertar de lado** — é
   `/impeccable document` quando o usuário pedir. Não rode sem avisar: ele regenera DESIGN.md,
   que hoje é escrito à mão.
2. **Sete achados de UX que o usuário adiou explicitamente** numa varredura anterior
   ("os demais pontos vou pensar"): a cartela quase vazia, o desequilíbrio de duas colunas na
   coleção, o CTA de grupo sincronizado enterrado, três contagens de cápsula conflitantes, e
   cabeçalhos de rodada grudentos no álbum. **Vários deixaram de existir** com a remoção do
   modo por link e com a gaveta; vale refazer a varredura em vez de partir da lista velha.
   Havia também 10 propostas funcionais (F1–F10) num artefato de sessão anterior — **o
   conteúdo delas se perdeu**; peça ao usuário se ele quiser retomá-las.
3. **`npx impeccable update` falha** com `Download failed: invalid zip data`. A instalação está
   íntegra e nada foi escrito. Não investigado.
4. **A cor dos grupos existentes mudou** com este deploy (ela deixou de vir da posição no anel
   e passou a pertencer à pessoa). Foi avisado e aceito. Se alguém reclamar, o caminho é
   **A coleção → clicar no nome → escolher a cor**, não reverter o modelo.

---

## 8. Como o usuário trabalha

- Fala português; a base de código, os comentários e os testes também. **Mantenha.**
- Comentários explicam **por que**, e frequentemente citam o bug que a linha evita. Não
  escreva comentários que repitam o código.
- Ele pede a skill **`impeccable`** para trabalho visual e espera que ela seja usada de verdade
  (detector, DESIGN.md, capturas). O detector roda em hook depois de editar arquivos de UI.
- Ele valoriza **medir em vez de supor**: a paleta foi verificada por contraste calculado, as
  camadas do SVG por leitura do DOM, o alcance das cápsulas por geometria. Um teste que erra é
  para consertar o teste, não o código — e para dizer isso em voz alta.
- Ele quer o trabalho **completo**: código + testes + documentação + publicação. Não entregue
  pela metade nem peça permissão para terminar o que já foi pedido.
