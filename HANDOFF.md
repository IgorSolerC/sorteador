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
5. **Toda cor de cápsula escolhe tinta clara ou escura com contraste de pelo menos 4.5:1.**
   `palette.spec.ts` mede as 24 sobre a cápsula e também o nome vencedor sobre o esmalte.
   Tons profundos continuam na chapa, no aro e no brilho, mas não podem fazer texto sumir.
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
  game-sheet.*         A FICHA DO JOGO: quatro faces (boletim / resenha / jogo / mesa)
  game-bench.ts        a orquestração da ficha, compartilhada por máquina e álbum
  notice.ts            o rodapé de aviso: um relógio por vez, e ele morre com a tela
  confetti.ts          canvas, 64 partículas, sai da bandeja. Folha absoluta (rola com a
                       página) e uma partícula rasterizada uma vez, depois só copiada
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
  tipo: member_added | member_removed | member_styled | spin
      | spin_annotated | spin_reviewed | spin_seated
  em: timestamp                               ← obrigatoriamente request.time
  nome? memberId? cor? emoji?                 ← membros
  giro? titulo? descricao?                    ← o jogo do giro
  nota? status? horas? texto? retirada?       ← a resenha de UMA pessoa
  diversao? historia? qualidade?
  jogabilidade? dificuldade?                  ← critérios, inteiros 0..10, opcionais
  memberId? mesa?                             ← a mesa: quem jogou aquele jogo
  autor?                                      ← não verificado, é um crachá
                                                (obrigatório só em spin_reviewed)
```

- **`subtitulo` saiu em 09/2026 e a rule ainda o ACEITA.** Uma aba aberta no minuto do deploy
  ainda o manda. O replay não o lê. Não apague os eventos antigos: a contagem local nunca
  fecharia com `versaoLog`.
- **Nenhuma média é gravada.** Nota do clube, média de critério, tempo médio e completude são
  recontados pelo replay a cada carga. Um campo de média gravável é um número que alguém
  escreve à mão — a mesma classe de buraco do campo `estado` que já existiu aqui.
- **`spin_seated` corrige o ELENCO, nunca o sorteio.** `eligible` — o globo daquele giro — é
  imutável, porque o vencedor sai dele. A mesa é um campo derivado separado (`seated`), montado
  em três camadas: o globo, as correções, e por cima de tudo quem resenhou. A terceira camada é
  o que impede "6 resenhas de 5".
- **`versaoLog` sobe na MESMA escrita em lote do evento** (`getAfter()`). Um evento não entra
  sozinho. É isso que permite o cache local buscar só o delta: **1 leitura no caso comum**.
- **Todo `spin` tem que carimbar `ultimoGiroEm == request.time`**, e só um `spin` pode mexer
  nela. Faltava a primeira metade; sem ela a espera de 30s era conselho.
- `member_styled`: `cor` e `emoji` são independentes. Omitir um = "deixe como está".

---

## 5. Suítes e como rodar

```bash
npm test -- --watch=false   # 309 unitários e de componente
npm run test:rules          # 105 rules no emulador (sobe o próprio, sem rede)
npm run test:store          # 43 de integração da camada de dados
npm run test:migration      # 13 da migração de histórico
npm run test:a11y           # 11 telas x 3 larguras — precisa de npm start + emulador
npm run test:etiqueta       # 74 de ponta a ponta num navegador real — idem
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
- **`fillText` de emoji sob rotação erra o cache de glifos a cada chamada**, e o preço
  acompanha a área do canvas — foi por isso que o confete engasgava só no desktop. Rasterize a
  partícula uma vez num canvas de apoio e copie com `drawImage`.
- **Elemento absoluto do tamanho da tela cria overflow de rolagem; `fixed` não.** Meça a
  viewport por `documentElement.clientWidth/clientHeight` (que exclui as barras) e devolva o
  elemento a `0x0` quando ele terminar.
- **Ler um signal dentro de um `effect` o transforma em dependência.** O confete montava o
  carimbo lendo `emoji()` e `color()`: sem `untracked`, repintar a cápsula de quem acabou de
  ganhar soltaria um confete que ninguém pediu.
- **`ngModel` num `<input type="number">` devolve `number | null`, não string.** Chamar
  `.trim()` no que ele entrega derruba o `submit` inteiro, e o teste vê só "não emitiu nada".
- **`text-transform` do CSS aparece em `innerText`, mas só se a regra existir.** As casas da
  régua não têm `text-transform` (elas guardam dígitos), então os degraus da dificuldade saem
  em caixa mista — um `includes('IMPOSSÍVEL')` num e2e falha ali e passa no `.album-criteria`.
- **Recarregar o grupo troca o OBJETO do giro sem trocar o giro.** `replay()` reconstrói
  tudo do zero a cada carga, então um `effect` que observa `spin()` dispara numa recarga que
  não mudou nada. A ficha reenchia os rascunhos ali e apagava a resenha meio escrita de quem
  tinha só ido conferir o nome do jogo — a máquina recarrega sozinha ao voltar para a aba. A
  identidade do rascunho é `índice do giro + quem assina`, nunca o objeto.
- **Um relógio por aviso apaga o aviso seguinte.** Dois avisos em menos de 5,5s — corrigir
  duas cadeiras da mesa, por exemplo — e o relógio do primeiro derruba o segundo no meio.
  Um relógio por vez, cancelado antes do próximo: ver `notice.ts`.
- **Rajada se conta em chamadas, nunca em documentos.** `recordRead(snap.size)` empurrava um
  carimbo por documento, e a primeira visita de um aparelho a um grupo com mais de 40 eventos
  — uma `getDocs` só — parava a máquina até a virada do dia UTC. O grupo semeado tem 33: o
  defeito estava a oito eventos de aparecer em todo teste de navegador.
- **`setInterval` e `addEventListener` num componente precisam de `DestroyRef`.** Ir para o
  álbum e voltar deixava para trás um relógio e um ouvinte de `visibilitychange`, e cada
  visita à aba fazia todos os fantasmas recarregarem o grupo — leituras do orçamento
  queimadas por telas que não existem mais.

---

## 7. O que ficou aberto

Nada pendente no código. A varredura de 2026-09-05 fechou seis defeitos e um buraco de
processo, cada um com o teste que falha sem a correção:

- **A rajada parava a máquina na primeira visita.** O contador de laço somava um carimbo por
  documento, e o log inteiro chega numa busca só. Um grupo com mais de 40 eventos bloqueava
  o aparelho de quem abrisse o link, até a virada do dia UTC. Era o mais grave dos sete, e
  estava a oito eventos de acontecer no grupo semeado.
- **A ficha apagava a resenha meio escrita** quando a máquina recarregava sozinha — o que ela
  faz toda vez que a aba volta a ficar visível.
- **O aviso do rodapé herdava o relógio do anterior**, então o segundo de dois avisos
  seguidos sumia antes da hora.
- **O teto de 60 era do log, e não do globo.** Um clube que trocasse de gente ao longo dos
  anos parava de aceitar nome novo em silêncio: a tela dizia "entrou no globo", o servidor
  gravava e o replay descartava. Agora quem sai libera a vaga que ocupava.
- **A casca deixava um ouvinte de `hashchange` para trás** — a mesma armadilha que o relógio
  e o `visibilitychange` da máquina já tinham custado.
- **As rules aceitavam campo de outro tipo de evento**: um `spin` podia levar `nome` e
  `memberId` de carona. O replay os ignorava, mas o log é para sempre. A proibição agora é
  dita uma vez só, no alto de `eventoValido()`.
- **O workflow publicava sem rodar teste nenhum.** Ele roda a suíte de unidade antes de
  construir; um push vermelho não vai mais ao ar.

Duas coisas foram medidas e deixadas como estão, de propósito: o comparador do álbum reconta
`spinScores` dentro do `sort` (1010 contas em vez de 96 num álbum de oito anos — **0,66ms**
contra 0,10ms, uma vez por mudança de ordem) e o cartão chama `shareOf()` nove vezes
(~1µs por conta). Nenhum dos dois é perceptível, e trocar código medido como irrelevante é
churn.

A rodada de 2026-09-04 (noite) tinha fechado:

- **As quatro tintas da nota**, no lugar do ouro-e-mofo da tentativa anterior: ciano de 8 para
  cima com faísca, laranja entre 2 e 4, vermelho de 2 para baixo, tinta preta no miolo — e a
  platina no mesmo ciano, porque platina é metal frio. Só sobre papel; no esmalte a cor
  continua sendo das pessoas.
- **Dificuldade virou palavra**: cinco degraus (`Nenhuma`…`Impossível`) gravados na mesma
  escala 0–10 de todo critério — 0, 2, 5, 8, 10 —, então rules, média e denominador não
  mudaram. No boletim ela é um traço na régua, e não um filete que enche.
- **A mesa de cada giro**, com "X resenhas de Y" e a quarta face da ficha para corrigir o
  elenco. Ela nunca alcança o globo do giro.
- **A completude passou a ser sobre quem jogou**: quem está na mesa e não resenhou conta como
  incompleto.
- **Tempo de jogo em horas inteiras** (1 a 2000), opcional, com média na ficha e no cartão.
- **O álbum ordena** por nota do clube, por qualquer critério ou por tempo — e aí desmancha as
  rodadas de propósito.
- **A face da resenha foi refeita em duas faixas** (o que ela cobra / o que ela aceita). Os
  cinco selos de "obrigatória"/"opcional", que apareciam em duas posições diferentes, viraram
  um cabeçalho por faixa mais `aria-required`.
- **Dois defeitos achados de passagem:** o aviso de parada de segurança tinha 1.72:1 (tinta
  escura sobre esmalte, porque o fundo era translúcido), e o "saiu para Fulano" repetia em
  miúdo o nome que já estava em 1.42rem no alto do cartão.

A rodada de 2026-09-04 (tarde) tinha fechado:

- **Confete corrigido nos dois defeitos relatados:** ele engasgava no desktop (medido no app:
  `148ms` por quadro a 2560x1440, `131ms` a 430x932) e ficava preso à tela em vez de rolar com
  a página. Com o carimbo rasterizado uma vez e a folha absoluta, os dois tamanhos passaram a
  fechar em `8.3ms`, e a folha acompanha o scroll pixel a pixel (medido).
- **Vazamento na máquina:** `setInterval` e `visibilitychange` agora morrem com o componente.
- **Código morto retirado:** `spinNote()` e `annotatedSpins()` (sem chamador nem teste), o
  reexport de `CAPSULE_COLOR_COUNT` em `group-log.ts`, `SPIN_COOLDOWN_S` em `synced-group.ts`,
  `summaryOf()` no álbum, quatro regras de CSS de telas que não existem mais, e o bloco de
  comentário de briefing que ainda ia dentro do `index.html` publicado (com fatos vencidos:
  falava em seis cores de cápsula, e hoje são 24).
- **`README.md` virou o contrato de trabalho do repositório**, com `AGENTS.md` e `CLAUDE.md`
  apontando para ele — é onde estão as regras de como a AI trabalha aqui.

**Aberto, e não corrigido de propósito:** os briefings em `.impeccable/surfaces/` descrevem o
modo por link estático que saiu (`src-index-html.md` fala em "data de início" e "compartilhada
pelo fragmento do link"). Reparar drift de artefato não é efeito colateral de tarefa de
design; peça `/impeccable doctor` quando quiser fechá-lo.

A rodada anterior tinha fechado:

1. **Sidecar atualizado:** `.impeccable/design.json` agora registra as 24 cores JASC na ordem
   real e `DESIGN.md` documenta a tinta adaptativa clara/escura.
2. **Varredura de UX refeita em desktop e celular:** os achados de layout antigos já tinham
   desaparecido com a gaveta e a remoção do modo por link. A ambiguidade que restava foi
   corrigida: a máquina histórica diz `N NO GIRO`, enquanto a grade diz `NO GLOBO AGORA`.
3. **Atualizador destravado:** o `npx` em cache ainda executava o CLI 3.5.0 e baixava um ZIP
   inválido. `npx --yes impeccable@3.6.1 update` atualizou as cópias do projeto para 4.1.3.
4. **Paleta substituída por solicitação explícita:** os índices continuam na mesma ordem do
   log, mas os 24 valores agora são os do JASC-PAL fornecido. Como há tons profundos, texto e
   ferragens usam `capsuleInk()`; o caminho de ajuste continua sendo **A coleção → pessoa**.
5. **Celebração unificada:** toda cena da roleta — abertura automática, replay ao clicar e giro
   verdadeiro — termina com o confete do emoji vencedor, quando essa pessoa escolheu um.

As propostas F1–F10 continuam irrecuperáveis: o artefato que continha o texto se perdeu antes
deste handoff. Não são tratadas como backlog sem uma nova descrição do usuário.

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
