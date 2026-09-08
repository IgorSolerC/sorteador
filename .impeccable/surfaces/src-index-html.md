---
version: 1
slug: "src-index-html"
primary_target: "src/index.html"
related_targets: ["src/app/app.html","src/app/app.ts","src/styles.scss"]
---

## Scope and mode

Single-page Angular experience at `src/index.html`. Visitor mode: Operate.

## Audience, job, action, and constraints

Um clube de jogos confere quem escolhe o jogo da vez, e guarda o que jogou. A ação principal é assistir (ou repetir) a entrega da cápsula já calculada e entender a posição no ciclo. **Um grupo é um link**: quem o tem lê e escreve, e o estado inteiro vive num log append-only no Firestore, replicado na tela. Entrega estática no GitHub Pages, sem API própria, responsiva, acessível por teclado, respeitando movimento reduzido.

## Chosen direction and memorable moment

Máquina de cápsulas (gashapon): esmalte azul-noite, aro cromado canelado, globo de acrílico e cartela impressa em papel quente. Cada participante é uma cápsula com a cor e o emoji que ela mesma escolheu, e o nome acompanhando a curva do aro; a manivela gira, a cápsula da vez encaixa na calha, cai na bandeja e abre. A cor da cápsula vencedora repinta a chapa da máquina. A lógica de completar a coleção carrega a regra de não repetir, o que mantém o mundo honesto sobre um resultado derivado do log.

## Unresolved decision

- **Não há atualização ao vivo.** A máquina relê o grupo ao montar, ao voltar para a aba, depois de cada escrita desta pessoa e no botão `Atualizar` — nunca porque o servidor mudou. Numa noite de clube, quem não girou continua vendo o vencedor anterior. Está anotado em `MELHORIAS-UX.md` (M-01) com a conta de leituras de um `onSnapshot` no doc do grupo.

## Notas de medição

- **A viewport de verdade vem de `Emulation.setDeviceMetricsOverride`**, e não do `--window-size`: a janela do Chrome headless tem largura mínima de ~500 CSS px, então `--window-size=390` mede 500 e as duas larguras dão o mesmo resultado. Com o override, 390px e 320px são medíveis — as suítes do projeto (`audit-a11y.mjs`, `e2e-acabamento.mjs`) já fazem assim.
- Medido a 390px e a 320px: nenhum estouro horizontal e nenhum alvo abaixo do piso na barra. `.machine-plate` está oculta abaixo de 620px, e isso está **verificado**, não presumido.
