---
name: "Mesa do Mês"
description: "Máquina de cápsulas em esmalte azul-noite que entrega a escolha determinística do mês."
colors:
  enamel: "#10233f"
  enamel-deep: "#0a1830"
  enamel-raised: "#17304f"
  enamel-lit: "#1e3d63"
  chrome: "#e3eaf2"
  chrome-dim: "#93a6be"
  sky: "#bccde6"
  ok: "#1f5c3a"
  error-light: "#ffc9d6"
  note-ink: "#4a3c1c"
  field: "#ffffff"
  field-line: "#a9b1bf"
  field-focus: "#b5761c"
  field-error: "#a3123f"
  field-error-ink: "#8f0f37"
  paper: "#faf6ec"
  paper-quiet: "#f0e9d9"
  ink: "#16233a"
  ink-quiet: "#5b6779"
  white: "#ffffff"
  yellow: "#ffc53d"
  capsule-amber: "#ffc53d"
  capsule-mint: "#4fe0c8"
  capsule-coral: "#ff6b7d"
  capsule-violet: "#a78bff"
  capsule-tangerine: "#ff9a3c"
  capsule-rose: "#ff8fc7"
  line: "rgba(200, 220, 255, .17)"
  line-strong: "rgba(200, 220, 255, .34)"
  line-paper: "rgba(22, 35, 58, .18)"
typography:
  display:
    fontFamily: "Fredoka Variable, Trebuchet MS, sans-serif"
    fontSize: "clamp(3rem, 7.4vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.93
    letterSpacing: "-0.03em"
  display-narrow:
    fontFamily: "Fredoka Variable, Trebuchet MS, sans-serif"
    fontSize: "clamp(2.7rem, 14vw, 4.2rem)"
    fontWeight: 600
    lineHeight: 0.93
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Fredoka Variable, Trebuchet MS, sans-serif"
    fontSize: "clamp(2.4rem, 4.6vw, 4rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  count:
    fontFamily: "Fredoka Variable, Trebuchet MS, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Fredoka Variable, Trebuchet MS, sans-serif"
    fontSize: "1.42rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title-compact:
    fontFamily: "Fredoka Variable, Trebuchet MS, sans-serif"
    fontSize: "1.32rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  subtitle:
    fontFamily: "Fredoka Variable, Trebuchet MS, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  action:
    fontFamily: "Fredoka Variable, Trebuchet MS, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "normal"
  label-strong:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "normal"
  serial:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "0.74rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
    fontFeature: "tnum"
  serial-label:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "0.62rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  plate: "16px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "0.55rem"
  sm: "0.9rem"
  md: "1.4rem"
  lg: "2.2rem"
  xl: "3.4rem"
  section: "clamp(4.5rem, 9vw, 8rem)"
  gutter: "5vw"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.enamel-deep}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "0.78rem 1.35rem"
    height: "48px"
  button-primary-hover:
    backgroundColor: "#ffd469"
  button-primary-disabled:
    backgroundColor: "{colors.chrome-dim}"
    textColor: "{colors.enamel-deep}"
  button-secondary:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.white}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "0.7rem 1.2rem"
    height: "46px"
  button-secondary-hover:
    backgroundColor: "{colors.enamel-lit}"
  link-text:
    textColor: "{colors.chrome}"
    typography: "{typography.label}"
    height: "44px"
  input-text:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.78rem 0.95rem"
    height: "48px"
  machine-plate:
    backgroundColor: "rgba(200, 220, 255, .06)"
    textColor: "{colors.sky}"
    typography: "{typography.serial-label}"
    rounded: "{rounded.sm}"
    padding: "0.34rem 0.62rem"
  month-sticker:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.enamel-deep}"
    rounded: "{rounded.circle}"
    size: "5.6rem"
  serial-cell:
    textColor: "{colors.white}"
    typography: "{typography.serial}"
    padding: "0.85rem 0.9rem"
  person-capsule:
    backgroundColor: "{colors.paper-quiet}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    size: "2.7rem"
  chart-cell-capsule:
    rounded: "999px 999px 4px 4px"
    width: "1.55rem"
    height: "1.1rem"
  toast:
    backgroundColor: "{colors.enamel-raised}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "0.7rem 0.7rem 0.7rem 1.15rem"
    height: "58px"
---

# Design System: Mesa do Mês

## Overview

**Creative North Star: "A Máquina de Cápsulas do Clube"**

O produto não é uma página sobre um sorteio: é uma máquina de cápsulas vista de frente. Cada participante é uma cápsula colorida encaixada no aro do globo de acrílico; o globo é a roleta; a coleção completa é a regra de não repetir, tornada visível. O gabinete é esmalte azul-noite com brilho especular, aro cromado canelado e acrílico translúcido, e ocupa a tela inteira em vez de flutuar dentro de um cartão. A recusa central é explícita: nada aqui usa o card branco centralizado com um botão "Sortear" que todo sorteador web entrega.

A densidade é de objeto, não de dashboard. Uma única peça enorme à esquerda, um nome em escala gigante à direita, e entre os dois nenhuma decoração que não seja parte da máquina — a canelura do aro é desenhada traço a traço, a manivela tem eixo e botão reais, a calha e a bandeja existem porque a cápsula precisa cair em algum lugar. Rótulos de série em monoespaçada anotam peças reais com valores reais. O mundo nunca fala em sorte: a cartela e a coleção completa são a prova, e a legenda da máquina diz que a manivela entrega, não decide.

Há exatamente uma quebra no esmalte: a seção da coleção é papel quente impresso (`paper`), onde a administração acontece. Sair do azul é o sinal de que se mudou de modo — de assistir para operar. O movimento é igualmente contido: um único momento autoral por visita, e nada mais na página anima sozinho.

**Key Characteristics:**
- Máquina de cápsulas em esmalte azul-noite sangrando na tela, nunca um cartão centralizado.
- Seis cores fixas de cápsula, atribuídas por posição, que são a única fonte de cor viva.
- A cor da cápsula vencedora repinta o corpo da máquina e carrega o nome em escala gigante.
- Monoespaçada apenas em valores de série e medição; nunca como fantasia técnica.
- Papel quente como única quebra do esmalte, reservado à administração.
- Um único momento animado: manivela, giro, encaixe, queda e abertura.

## Colors

Uma paleta de esmalte industrial — azul-noite profundo, cromo e céu frio — atravessada por seis cores de cápsula saturadas que são a única fonte de alegria cromática do sistema.

### Primary
- **Esmalte Azul-Noite** (`enamel`): o corpo da máquina e o fundo padrão de todo o documento. É o chão do mundo; a página começa nele e volta para ele.
- **Esmalte Profundo** (`enamel-deep`): a faixa do cabeçalho, o rodapé, a seção da cartela, o poço do globo, a boca da calha e a janela da bandeja. É o interior da máquina — tudo que está atrás de vidro ou dentro de uma cavidade.
- **Amarelo de Cápsula** (`yellow`): a ação primária, o adesivo redondo do mês, o título da seção de método, o anel de foco e o marcador de estado. É também a primeira das seis cores de cápsula, e essa coincidência é intencional: a marca é uma cápsula.

### Secondary — as seis cores de cápsula
Atribuídas por posição no ciclo (`índice % 6`), fixas e nunca sorteadas: **Âmbar** (`capsule-amber`), **Menta** (`capsule-mint`), **Coral** (`capsule-coral`), **Violeta** (`capsule-violet`), **Tangerina** (`capsule-tangerine`) e **Rosa** (`capsule-rose`). A mesma cor identifica a pessoa em toda parte: a cunha no aro do globo, a bolinha da cartela, o disco de iniciais na coleção e a cápsula entregue na bandeja. É o vínculo que faz a coleção ler como coleção.

### Tertiary
- **Cromo** (`chrome`) e **Cromo Fosco** (`chrome-dim`): o aro canelado, a placa da manivela, o cubo central, os links de texto e os estados desabilitados. Cromo é metal, não texto de ênfase.
- **Céu** (`sky`): todo texto de apoio sobre esmalte — parágrafos secundários, legendas, rótulos de decalque e etiquetas de série.

### Neutral
- **Branco** (`white`): texto primário sobre esmalte e o fundo dos campos de entrada.
- **Papel Quente** (`paper`) e **Papel Silencioso** (`paper-quiet`): o fundo da seção da coleção e suas caixas internas — a única superfície clara do produto.
- **Tinta** (`ink`) e **Tinta Silenciosa** (`ink-quiet`): texto primário e secundário sobre papel.
- **Linha**, **Linha Forte** e **Linha de Papel** (`line`, `line-strong`, `line-paper`): divisórias hairline. Sobre esmalte são luz azulada de baixa opacidade; sobre papel, tinta de baixa opacidade.

### Named Rules

**A Regra da Cápsula Portante.** Toda cor de cápsula passa de 4.5:1 sobre `enamel`, e tinta escura sobre qualquer cor de cápsula também passa de 4.5:1. É isso que autoriza a cápsula a carregar o nome vencedor em escala gigante e a receber texto escuro por cima. Uma cor nova só entra no conjunto se cumprir os dois lados.

**A Regra da Repintura Total.** Quando a rodada é revelada, o corpo da máquina (`.body-plate`) é preenchido com a cor da cápsula vencedora como campo chapado, saturado e sem mistura, e todos os elementos montados na chapa — decalques, linhas-guia, costura, aba da bandeja, lábio da calha, botão da manivela — trocam para tinta escura. Nunca dilua essa cor em tinta de fundo: uma cor quente de cápsula misturada difusamente no azul produz oliva.

**A Regra da Única Quebra.** O papel aparece uma vez, na seção da coleção, porque é ali que se administra. Nenhuma outra superfície clara. Se algo precisa de papel, precisa antes justificar por que é administração.

**A Regra do Amarelo de Ação.** O amarelo é a ação primária e o anel de foco. Um segundo botão amarelo na mesma dobra dissolve a hierarquia; a alternativa é o botão de esmalte (`button-secondary`) ou o link de texto.

## Typography

**Display Font:** Fredoka Variable (fallback Trebuchet MS, sans-serif)
**Body Font:** Atkinson Hyperlegible (sans-serif)
**Label/Mono Font:** Martian Mono (fallback ui-monospace, monospace)

**Character:** Fredoka é arredondada e cheia — plástico moldado, do mesmo material da cápsula — e carrega todo título e toda ação. Atkinson Hyperlegible sustenta a leitura corrida por mandato de acessibilidade do produto, com formas desambiguadas. Martian Mono é a impressão de série na carcaça: estreita, tabular, só onde há um valor a conferir.

### Hierarchy
- **Display** (600, `clamp(3rem, 7.4vw, 6rem)`, 0.93, `-0.03em`): o nome vencedor e os títulos de estado de espera. Limitado a 12ch para que a quebra aconteça em nome próprio.
- **Headline** (600, `clamp(2.4rem, 4.6vw, 4rem)`, 0.95): títulos de seção — a cartela, a coleção, o método.
- **Title** (600, `1.42rem`): subtítulos dentro da coleção (configuração, compartilhar).
- **Action** (600, `1rem`): rótulos de botão e iniciais no disco da pessoa.
- **Body** (400, `1rem`, 1.62): parágrafos, campos e instruções. Medida de 40–52ch conforme a coluna.
- **Label** (700, `0.82rem`): links de texto, dica de trilho e mensagens de estado curtas.
- **Serial** (700 mono, `0.74rem`, tabular): valores da grade de série, contadores e o link compartilhável.
- **Serial-label** (700 mono, `0.58rem`, `0.1em`, caixa alta): os rótulos acima desses valores, os meses da cartela e a placa da máquina.

### Named Rules

**A Regra da Mono de Série.** Martian Mono só aparece em valores de série e medição: grade de série, mês da cartela, índice da pessoa, placa da máquina, decalques e a contagem de cápsulas ainda no globo. Nunca como fantasia "técnica" em texto corrido, botão ou título.

**A Regra da Escala Sozinha.** A hierarquia da primeira dobra é feita só de escala e cor: o nome enorme na cor da própria cápsula, o parágrafo em céu, os valores em mono pequena. Nenhum kicker, sobrancelha ou rótulo antes do título.

**A Regra do Nome Inteiro.** O nome vencedor sempre aparece por extenso no `h1`. A degradação — primeiro nome, iniciais, uma letra — existe apenas dentro do aro do globo, onde o comprimento do arco manda.

## Layout

O produto é uma única página empilhada em faixas de largura total, com goteira lateral de `5vw` (`1.1rem` abaixo de 620px) e respiro vertical de seção em `clamp(4.5rem, 9vw, 8rem)`.

A dobra inicial é um palco de duas colunas assimétricas (`minmax(320px, .92fr) / minmax(0, 1.08fr)`) com altura mínima de `min(760px, 100svh - 64px)`: a máquina à esquerda, separada por uma hairline vertical; o resultado à direita. O adesivo do mês fica posicionado em absoluto no canto superior direito do palco, rotacionado `-13deg`. A cartela é uma grade de células que se empacota borda a borda (`auto-fit, minmax(124px, 1fr)`) sob uma régua superior de 2px, com um tique por célula. A coleção divide-se em intro e lista (`minmax(300px, .8fr) / minmax(380px, 1.2fr)`). O método é duas colunas iguais. A grade de série sob o resultado é `auto-fit, minmax(140px, 1fr)` com bordas que se costuram sem gap.

**Responsivo.** Em `980px` tudo colapsa para uma coluna, a máquina troca a borda direita por borda inferior, e os decalques da máquina desaparecem. Em `620px` a placa da máquina some, a grade de série vira duas colunas, a cartela vira um trilho horizontal com `scroll-snap` e a dica de deslize aparece, as ações do resultado empilham em largura total e o rodapé empilha.

### Named Rules

**A Regra do Alvo de 44px.** Todo controle interativo tem no mínimo 44px de altura, e os campos e ações primárias, 48px. Vale igualmente no trilho da cartela e na lista da coleção.

**A Regra do Decalque de Bancada.** Os decalques com linha-guia na máquina são desktop-only: ocultos abaixo de 980px, porque a linha-guia precisa de espaço lateral para apontar sem cruzar a peça. A placa da máquina no cabeçalho some abaixo de 620px por ser plaqueta de identificação, não conteúdo.

## Elevation & Depth

O sistema é material, não empilhado: a profundidade vem de gradientes de acrílico e cromo dentro do SVG, de hairlines de luz sobre esmalte, e de uma parede lateral moldada sob os botões. Sombras difusas existem apenas onde uma peça física estaria de fato levantada da chapa.

### Shadow Vocabulary
- **Poço do globo** (`drop-shadow(0 22px 40px rgba(4, 10, 22, .55))`): o globo assenta sobre o gabinete.
- **Placa da manivela** (`drop-shadow(0 6px 12px rgba(4, 10, 22, .5))`) e **cápsula solta** (`drop-shadow(0 2px 3px rgba(4, 10, 22, .45))`): peças menores, sombra proporcional.
- **Adesivo do mês** (`0 10px 22px rgba(6, 14, 28, .42), 0 0 0 5px var(--paper)`): sombra de colagem mais a borda branca de adesivo recortado.
- **Parede lateral moldada** (`0 6px 0 #c48f16, 0 12px 20px rgba(4, 10, 22, .38)`): botão primário. O botão de esmalte usa `0 5px 0 #061225, 0 11px 18px rgba(4, 10, 22, .28)`.
- **Aviso flutuante** (`0 14px 30px rgba(4, 10, 22, .48)`): o toast, único elemento fora do plano da página.
- **Brilho da cápsula escolhida** (`saturate(1.25) brightness(1.14) drop-shadow(0 0 12px …)`): a cunha vencedora acende no aro.

### Named Rules

**A Regra da Parede Moldada.** O botão tem uma parede lateral de plástico moldado — preenchimento sólido mais escuro em `0 Npx 0`, acompanhado de uma sombra ambiente real e desfocada — e essa parede colapsa sob um `translateY` no `:active`, como plástico que afunda. É moldagem, não a sombra diagonal dura de bloco: nunca use deslocamento em X, e nunca use a parede sem a sombra ambiente que a acompanha.

**A Regra do Material Antes da Camada.** Profundidade se resolve com gradiente, canelura e hairline dentro da peça. Uma sombra só é adicionada quando um objeto físico estaria levantado; nenhum contêiner de conteúdo recebe sombra para parecer "card".

## Shapes

A forma dominante é o círculo: o globo, o cubo, a placa da manivela, o adesivo do mês, o disco de iniciais, os botões em pílula. Contra ele, retângulos de canto grande são carcaça — a chapa do corpo com `16px`, a janela da bandeja com `8px`, o toast com `12px`, os campos com `8px` e a plaqueta com `4px`.

A silhueta assinatura é a cápsula: cúpula colorida sobre casca translúcida, dividida por uma costura. Ela reaparece em três escalas — cunha em anel no aro do globo, semicírculo completo solto no interior, e a marca do produto no cabeçalho — e em duas versões planas: a bolinha da cartela (`999px 999px 4px 4px`, com a casca desenhada por sombra interna) e o disco de iniciais da coleção (círculo com sombra interna inferior clara). A cunha ocupa o anel entre o equador (118) e o raio externo (168) em espaço de usuário do SVG; a casca transparente ocupa o anel interno (96–118).

Bordas são sempre hairline de 1px (1.5–2px quando é traço de peça). Nenhum contorno decorativo, nenhuma moldura dupla.

## Components

### Buttons
- **Shape:** pílula completa (`999px`), com parede lateral moldada.
- **Primary:** amarelo sobre tinta de esmalte, `0.78rem 1.35rem`, altura mínima 48px, tipografia Fredoka 600. É a ação "Entregar de novo" e as âncoras dos estados de espera.
- **Hover / Focus:** amarelo mais claro (`#ffd469`); foco visível é contorno amarelo de 3px com `3px` de deslocamento, herdado do global.
- **Active:** a parede lateral encolhe de 6px para 2px e o botão desce 4px (3px no de esmalte) em `.16s ease`.
- **Disabled:** cinza cromo fosco com a parede em `#6c7d94`, opacidade cheia — o botão continua legível, só não convida.
- **Secondary:** esmalte sobre branco, `0.7rem 1.2rem`, altura 46px; hover para esmalte iluminado. Vive na seção de papel, onde o amarelo brigaria com o papel.
- **Ghost / link de texto:** cromo, peso 700, sublinhado com `0.24em` de deslocamento e traço de 1.5px, altura 44px.

### Cards / Containers
Não há cards. As agrupações são feitas por costura de bordas: a grade de série e a cartela desenham suas próprias hairlines e se encaixam sem gap nem raio. A única caixa com fundo próprio é a nota de demonstração na coleção (papel silencioso, borda de tinta a 22%, raio `8px`).

### Inputs / Fields
- **Style:** fundo branco, tinta escura, borda de 1.5px em `#a9b1bf`, raio `8px`, `0.78rem 0.95rem`, altura mínima 48px. Sempre precedidos por rótulo em mono `0.64rem` caixa alta.
- **Focus:** contorno âmbar escuro (`#b5761c`), que é também a cor do cursor de texto — sobre papel, o amarelo puro não teria contraste.
- **Error:** borda `#a3123f` com `aria-invalid`, e mensagem em `#8f0f37` com `role="alert"` abaixo do campo. A mensagem nunca depende só da cor.
- **Share field:** o campo de link compartilhável usa mono `0.72rem` — é um valor a conferir, não um texto a ler.

### Navigation
A barra superior é a plaqueta rebitada no gabinete: fundo de esmalte profundo, 64px, hairline inferior. À esquerda a marca (cápsula desenhada em SVG mais o nome em Fredoka 600); à direita a plaqueta de identificação em mono caixa alta, oculta abaixo de 620px. Não há menu — a página tem uma âncora só, o link "Ver a coleção".

### Toast
Aviso fixo no canto inferior direito sobre esmalte elevado, borda de linha forte, raio `12px`, com botão amarelo de desfazer e fechar em cromo. Entra com `translateY(1rem)` → 0 em `.2s`. É `role="status"` e `aria-live="polite"`.

### The Machine (signature)
A máquina é um único SVG (`viewBox="-26 -26 452 576"`) desenhado em espaço próprio de 400×400 para o globo: centro em (200, 200), raio interno 96, equador 118, raio externo 168, trilho de rótulo em 140. O aro cromado leva 84 caneluras desenhadas individualmente entre os raios 171 e 183. Nove cápsulas inteiras repousam fixas no interior inferior, para que a cena nunca reembaralhe.

- **Rótulos no aro:** cada nome corre tangencialmente pelo aro via `textPath`. O arco do rótulo é invertido para as cápsulas que param na metade inferior, de modo que nenhum nome fique de cabeça para baixo. O texto degrada por orçamento de arco — primeiro nome, iniciais, uma letra — conforme o número de participantes; o tamanho da fonte é `min(17, max(8, 46/√n))`.
- **Calha às seis horas:** a rotação de destino é calculada para que a cápsula vencedora pare exatamente na calha, na base do globo.
- **Estado ao vivo:** revelada a rodada, a chapa recebe a cor da cápsula, os elementos montados nela viram tinta escura, e um brilho radial suave da mesma cor aparece atrás do palco.

### Motion
Existe um único momento autoral por visita, e ele é sempre o mesmo: a manivela gira duas voltas completas (`720deg`), o globo gira em `4.3s cubic-bezier(.12, .72, .12, 1)` até encaixar a cápsula na calha, as cápsulas soltas assentam com um pequeno balanço, a cápsula cai na bandeja em `.92s` e a cúpula se abre em `1.5s`. Fora disso, apenas transições de estado curtas (`.16s`–`.7s`).

### Named Rules

**A Regra do Momento Único.** Nada mais na página anima sozinho. Sem carrossel, sem contador que sobe, sem entrada por scroll, sem pulso de atenção. A animação da entrega é o único movimento autoral, e ela nunca altera o resultado — só o revela.

**A Regra do Movimento Reduzido nos Dois Lugares.** `prefers-reduced-motion` é honrado em CSS (todas as durações caem para `.01ms`) **e** em JS (a entrega roda em 120ms em vez de 4300ms). Qualquer sequência nova precisa dos dois desligamentos; desligar só o CSS deixa a página parada esperando um timer longo.

## Do's and Don'ts

### Do:
- **Do** deixar o esmalte sangrar até as bordas da tela; a máquina é o plano de fundo, não um objeto dentro de uma moldura.
- **Do** usar a cor da cápsula da pessoa em todo lugar onde ela aparece — aro, cartela, coleção, bandeja — para que a coleção leia como coleção.
- **Do** pintar a chapa da máquina com a cor da cápsula vencedora como campo chapado e trocar os elementos montados nela para tinta escura.
- **Do** reservar Martian Mono para valores de série e medição, com números tabulares.
- **Do** construir hierarquia com escala e cor: o nome enorme, o apoio em céu, os valores em mono pequena.
- **Do** manter todo controle com no mínimo 44px de altura e o contorno de foco amarelo de 3px.
- **Do** acompanhar toda cor de estado com texto — a cartela marca "Nesta rodada" e risca os meses já saídos, e os erros de campo trazem mensagem.
- **Do** honrar `prefers-reduced-motion` em CSS e em JS ao mesmo tempo.

### Don't:
- **Don't** centralizar o conteúdo em um card branco flutuante: é exatamente a entrega que este mundo recusa.
- **Don't** misturar a cor da cápsula difusamente no azul como tintura de fundo — o resultado é oliva.
- **Don't** introduzir uma cor de cápsula que não passe de 4.5:1 sobre o esmalte e não aceite tinta escura por cima.
- **Don't** trazer papel para fora da seção da coleção.
- **Don't** usar sombra dura de bloco com deslocamento diagonal e zero desfoque; a parede lateral do botão é vertical, sólida, e vem com sombra ambiente.
- **Don't** colocar kicker, sobrancelha ou rótulo acima de um título.
- **Don't** usar monoespaçada como sinal genérico de "técnico" em texto corrido, botão ou título.
- **Don't** adicionar um segundo movimento autônomo à página; a entrega é o único momento.
- **Don't** falar em sorte, azar ou aleatoriedade na interface: a cartela e a coleção completa são a prova.
