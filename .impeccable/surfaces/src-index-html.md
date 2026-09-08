---
version: 1
slug: "src-index-html"
primary_target: "src/index.html"
related_targets: ["src/app/app.html","src/app/app.ts","src/app/machine.html","src/styles.scss"]
---

## Scope and mode

Single-page Angular experience at `src/index.html`. Visitor mode: Operate.

## Audience, job, action, and constraints

Um clube de jogos confere quem escolhe o jogo da vez, e guarda o que jogou. A ação principal é assistir (ou repetir) a entrega da cápsula já calculada e entender a posição no ciclo. **Um grupo é um link**: quem o tem lê e escreve, e o estado inteiro vive num log append-only no Firestore, replicado na tela. Entrega estática no GitHub Pages, sem API própria, responsiva, acessível por teclado, respeitando movimento reduzido.

## Chosen direction and memorable moment

Máquina de cápsulas (gashapon) sobre uma bancada azul-noite, seguindo uma referência de objeto 3D: esmalte com volume, aro cromado canelado, discos da manivela e do cubo em aço escovado suave, globo de acrílico com refração e cartela impressa em papel quente. Cada participante é uma cápsula com a cor e o emoji que ela mesma escolheu, e o nome acompanhando a curva do aro; a manivela gira, a cápsula da vez encaixa na calha, cai na bandeja e abre. A carcaça conserva o azul-noite; a cor vencedora permanece nos setores, no pino, na manopla e na cápsula entregue. A lógica de completar a coleção carrega a regra de não repetir, o que mantém o mundo honesto sobre um resultado derivado do log.

O cenário atual é `src/images/bancada-capsulas.png`, com prompt em metadados e no arquivo `.prompt.txt`: três cápsulas grandes nas bordas de uma bancada e centro livre para a máquina e o resultado. O fundo é absoluto e rola com o documento. A máquina fica nítida à esquerda; o resultado fica à direita num painel com gradiente azul translúcido e desfoque de `22px`, reduzido a `14px` abaixo de 620px. Em transparência reduzida e cores forçadas, a imagem some e as superfícies ficam sólidas.

Na implementação SVG atual, a traseira da base recua 6 unidades à direita e 14 para cima, tornando o tampo visível. A sombra suave da manivela pertence ao grupo externo parado: sua direção permanece fixa enquanto o braço interno gira (`dx=1.5`, `dy=4`, desvio `3.5`, opacidade `.45`). Os discos usam gradiente amplo e textura de aço escovado. Reflexos difusos acompanham as curvas; a máscara do verniz deixa intacta a faixa radial `128–153` dos nomes.

## Unresolved decision

- **Fidelidade material em evolução.** A referência 3D define a direção, mas a execução SVG ainda foi percebida como vetorial na comparação lado a lado. As descrições acima registram o código atual e não representam aprovação visual final; uma próxima revisão de materiais deve atualizar este registro conforme a implementação entregue.
- **Não há atualização ao vivo.** A máquina relê o grupo ao montar, ao voltar para a aba, depois de cada escrita desta pessoa e no botão `Atualizar` — nunca porque o servidor mudou. Numa noite de clube, quem não girou continua vendo o vencedor anterior. Está anotado em `MELHORIAS-UX.md` (M-01) com a conta de leituras de um `onSnapshot` no doc do grupo.

## Notas de medição

- **A viewport de verdade vem de `Emulation.setDeviceMetricsOverride`**, e não do `--window-size`: a janela do Chrome headless tem largura mínima de ~500 CSS px, então `--window-size=390` mede 500 e as duas larguras dão o mesmo resultado. Com o override, 390px e 320px são medíveis — as suítes do projeto (`audit-a11y.mjs`, `e2e-acabamento.mjs`) já fazem assim.
- Medido a 390px e a 320px: nenhum estouro horizontal e nenhum alvo abaixo do piso na barra. `.machine-plate` está oculta abaixo de 620px, e isso está **verificado**, não presumido.
- **Contraste sobre o cenário, medido em pixel composto.** `audit-a11y.mjs` decodifica a imagem do cenário, lê os pixels sob a caixa de cada texto, compõe os véus e cobra o pior caso. Dezessete telas em três larguras: 0 achados. Menor folga: `album-serial` em **4.74:1** (alvo 4.5). Contra-prova: com `--vidro-leitura` em 40% a mesma conta acha três reprovações, a pior em **1.97:1**.
- **Peso da cena, primeira visita fria a 1,6 Mbps num `dist` servido localmente.** A prateleira: 1973 kB no total, LCP de **2564 ms** no `h1`. A máquina do grupo: **5936 kB**, dos quais **4908 kB** de imagem, e LCP de **29 600 ms** em `maquina-materiais.png`. Os três PNG são RGB sem canal alfa: `maquina-materiais` 1177x1337 (1944 kB), `bancada-capsulas` 1659x948 (1615 kB) e `capsula-material` 1254x1254 (1348 kB) — este último desenhado em 30 e 44 px de lado, ou seja ~90x mais pixels do que a tela usa a 3x. O peso está **medido e aberto**: a correção de formato e de escala não foi feita nesta entrega.
