---
name: "Mesa do Mês"
description: "Máquina de cápsulas em esmalte azul-noite onde cada pessoa é uma cápsula que ela mesma pinta."
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
  remove-ink: "#6d5560"
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
  capsule-breu: "#0f0f12"
  capsule-grafite: "#505359"
  capsule-nevoa: "#b6bfbc"
  capsule-gelo: "#f2fbff"
  capsule-ciano: "#5ee7ff"
  capsule-azul-piscina: "#00a1db"
  capsule-cobalto: "#1d5bb8"
  capsule-indigo: "#1f2c66"
  capsule-pinho: "#1b5245"
  capsule-folha: "#2e8f46"
  capsule-lima: "#58d92e"
  capsule-broto: "#cbff70"
  capsule-baunilha: "#ffff8f"
  capsule-girassol: "#ffdf2b"
  capsule-tangerina: "#f0771a"
  capsule-carmim: "#e32239"
  capsule-vinho: "#851540"
  capsule-ameixa: "#401a24"
  capsule-tijolo: "#9c3b30"
  capsule-terracota: "#c95d3c"
  capsule-salmao: "#ed8a5f"
  capsule-pessego: "#ffbca6"
  capsule-rosa: "#eb75be"
  capsule-roxo: "#77388c"
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

O produto não é uma página sobre um sorteio: é uma máquina de cápsulas vista de frente. Cada participante é uma cápsula encaixada no aro do globo de acrílico, com a cor e o símbolo que ela mesma escolheu; o globo é a roleta; a coleção completa é a regra de não repetir, tornada visível. O gabinete é esmalte azul-noite com brilho especular, aro cromado canelado e acrílico translúcido, e ocupa a tela inteira em vez de flutuar dentro de um cartão. A recusa central é explícita: nada aqui usa o card branco centralizado com um botão "Sortear" que todo sorteador web entrega.

A densidade é de objeto, não de dashboard. Uma única peça enorme à esquerda, um nome em escala gigante à direita, e entre os dois nenhuma decoração que não seja parte da máquina — a canelura do aro é desenhada traço a traço, a manivela tem eixo e botão reais, a calha e a bandeja existem porque a cápsula precisa cair em algum lugar. Rótulos de série em monoespaçada anotam peças reais com valores reais. O mundo nunca fala em sorte: o registro e a coleção completa são a prova, e a legenda da máquina diz que a manivela entrega, não decide.

Há exatamente uma quebra no esmalte: a seção da coleção é papel quente impresso (`paper`), onde a administração acontece. Sair do azul é o sinal de que se mudou de modo — de assistir para operar. O movimento é igualmente contido: um único momento autoral por visita, e nada mais na página anima sozinho.

**Key Characteristics:**
- Máquina de cápsulas em esmalte azul-noite sangrando na tela, nunca um cartão centralizado.
- Uma roda de vinte e quatro cores de cápsula, escolhidas pela própria pessoa, que são a única fonte de cor viva.
- A cor da cápsula vencedora repinta o corpo da máquina e carrega o nome em escala gigante.
- Monoespaçada apenas em valores de série e medição; nunca como fantasia técnica.
- Papel quente como única quebra do esmalte, reservado à administração — que agora vive em gavetas, não em seções.
- Um único momento animado: manivela, giro, encaixe, queda, abertura e o confete do que estava dentro.

## Colors

Uma paleta de esmalte industrial — azul-noite profundo, cromo e céu frio — atravessada por uma roda de vinte e quatro cores de cápsula que são a única fonte de alegria cromática do sistema.

### Primary
- **Esmalte Azul-Noite** (`enamel`): o corpo da máquina e o fundo padrão de todo o documento. É o chão do mundo; a página começa nele e volta para ele.
- **Esmalte Profundo** (`enamel-deep`): a faixa do cabeçalho, o rodapé, a seção do registro, a prateleira da raiz, o poço do globo, a boca da calha e a janela da bandeja. É o interior da máquina — tudo que está atrás de vidro ou dentro de uma cavidade.
- **Amarelo de Cápsula** (`yellow`): a ação primária, o adesivo redondo da rodada, o anel de foco e o marcador de estado. É também o **Âmbar** da roda de cápsulas, e essa coincidência é intencional: a marca é uma cápsula.

### Secondary — a roda de vinte e quatro cápsulas
Uma caixa de vinte e quatro tintas deliberadamente variada: quatro neutros, seis frios, quatro verdes, nove quentes e dois violetas. A mistura inclui breu, grafite e índigo profundos ao lado de gelo, ciano, lima, girassol, terracota e rosa; a coleção agora distingue pessoas por temperatura, luminosidade e saturação, não só por matiz.

A fonte da verdade é `src/app/palette.ts`; o frontmatter deste arquivo é a cópia legível. A ordem é exatamente a do JASC-PAL fornecido em 2026-09-04. Como o log guarda índices, os vinte e quatro valores podem ser afinados em posição, mas nunca reordenados.

A cor **pertence à pessoa, não à posição dela no anel**: ela escolhe a sua na gaveta da coleção, e essa cor a identifica em toda parte — a cunha no aro do globo, a bolinha do registro, o disco de iniciais, a cápsula na bandeja, o cartão no álbum, e o confete quando ela sai. É o vínculo que faz a coleção ler como coleção. Antes a cor vinha da posição, e a mesma pessoa mudava de cor quando o bolo mudava de tamanho.

### Tertiary
- **Cromo** (`chrome`) e **Cromo Fosco** (`chrome-dim`): o aro canelado, a placa da manivela, o cubo central, os links de texto e os estados desabilitados. Cromo é metal, não texto de ênfase.
- **Céu** (`sky`): todo texto de apoio sobre esmalte — parágrafos secundários, legendas, rótulos de decalque e etiquetas de série.

### Neutral
- **Branco** (`white`): texto primário sobre esmalte e o fundo dos campos de entrada.
- **Papel Quente** (`paper`) e **Papel Silencioso** (`paper-quiet`): o fundo da seção da coleção e suas caixas internas — a única superfície clara do produto.
- **Tinta** (`ink`) e **Tinta Silenciosa** (`ink-quiet`): texto primário e secundário sobre papel.
- **Linha**, **Linha Forte** e **Linha de Papel** (`line`, `line-strong`, `line-paper`): divisórias hairline. Sobre esmalte são luz azulada de baixa opacidade; sobre papel, tinta de baixa opacidade.

### Named Rules

**A Regra da Cápsula Portante.** Cada cor escolhe tinta clara ou escura por contraste medido, nunca por suposição. `capsuleInk()` garante pelo menos 4.5:1 para iniciais, nomes do aro e ferragens sobre qualquer uma das vinte e quatro tintas. Quando a cor da pessoa não alcança 4.5:1 como texto sobre o esmalte, o nome vencedor fica branco; a cor continua inequívoca na chapa, no aro, na cápsula e no brilho. `palette.spec.ts` derruba o build se qualquer um desses dois contextos falhar.

**A Regra do Passo, Não da Ordem.** A lista alterna famílias, mas seus trechos ainda têm parentes próximos. O passo 11 é primo com 24, percorre as vinte e quatro sem repetir e impede que os primeiros membros recebam uma sequência inteira do mesmo trecho. Um passo que não seja primo com o tamanho da paleta fecha um ciclo curto e repete; a paleta cresce, o passo acompanha.

**A Regra da Cor Escolhida.** A cor guardada é a **posição na paleta**, nunca um hexadecimal livre — nem no log, nem nas rules. É o que garante que toda cápsula continue passando no contraste sem que o servidor precise saber calcular contraste, e o que permite reafinar a paleta inteira sem reescrever um evento sequer.

**A Regra da Repintura Total.** Quando a rodada é revelada, o corpo da máquina (`.body-plate`) é preenchido com a cor da cápsula vencedora como campo chapado, saturado e sem mistura, e todos os elementos montados na chapa — decalques, linhas-guia, costura, aba da bandeja, lábio da calha, botão da manivela — trocam para a tinta AA calculada daquela cápsula. Nunca dilua a tinta da cápsula na chapa: ela aparece inteira; só o brilho atmosférico usa mistura.

**A Regra da Única Quebra.** O papel aparece onde se administra, e em nenhum outro lugar. São duas ocorrências, e as duas se justificam pelo mesmo motivo: a seção da coleção, onde se opera a lista, e a etiqueta do giro, que é literalmente papel colado sobre o esmalte — o mesmo material do adesivo do mês, escrito na bancada de papel que a etiqueta abre. Uma terceira superfície clara precisa antes provar que é administração.

**A Regra do Amarelo de Ação.** O amarelo é a ação primária e o anel de foco. Um segundo botão amarelo na mesma dobra dissolve a hierarquia; a alternativa é o botão de esmalte (`button-secondary`) ou o link de texto.

## Typography

**Display Font:** Fredoka Variable (fallback Trebuchet MS, sans-serif)
**Body Font:** Atkinson Hyperlegible (sans-serif)
**Label/Mono Font:** Martian Mono (fallback ui-monospace, monospace)

**Character:** Fredoka é arredondada e cheia — plástico moldado, do mesmo material da cápsula — e carrega todo título e toda ação. Atkinson Hyperlegible sustenta a leitura corrida por mandato de acessibilidade do produto, com formas desambiguadas. Martian Mono é a impressão de série na carcaça: estreita, tabular, só onde há um valor a conferir.

### Hierarchy
- **Display** (600, `clamp(3rem, 7.4vw, 6rem)`, 0.93, `-0.03em`): o nome vencedor e os títulos de estado de espera. Limitado a 12ch para que a quebra aconteça em nome próprio.
- **Headline** (600, `clamp(2.4rem, 4.6vw, 4rem)`, 0.95): títulos de seção — o registro, o álbum — e a saudação da prateleira.
- **Title** (600, `1.42rem`): subtítulos dentro da coleção (configuração, compartilhar).
- **Action** (600, `1rem`): rótulos de botão e iniciais no disco da pessoa.
- **Body** (400, `1rem`, 1.62): parágrafos, campos e instruções. Medida de 40–52ch conforme a coluna.
- **Label** (700, `0.82rem`): links de texto, dica de trilho e mensagens de estado curtas.
- **Serial** (700 mono, `0.74rem`, tabular): valores da grade de série, contadores e o link compartilhável.
- **Serial-label** (700 mono, `0.62rem`, `0.1em`, caixa alta): os rótulos acima desses valores, a data de cada giro no registro, a plaqueta e os comprimidos de navegação.

### Named Rules

**A Regra da Tipografia de Desenho.** Dentro de um SVG, `font-size` é coordenada, não passo tipográfico: as iniciais da cápsula da porta são 40 unidades num `viewBox` de 220, e escalam com o desenho junto com o resto da peça. A escala de tipos governa o texto do documento; a geometria de uma peça governa a si mesma.

**A Regra da Mono de Série.** Martian Mono só aparece em valores de série e medição: grade de série, data de cada giro, subtítulo da etiqueta, nome da cor na gaveta, placa da máquina, decalques e a contagem de cápsulas ainda no globo. Nunca como fantasia "técnica" em texto corrido, botão ou título.

**A Regra da Escala Sozinha.** A hierarquia da primeira dobra é feita só de escala e contraste: o nome enorme na cor da própria cápsula quando legível, ou branco quando a tinta é profunda; o parágrafo em céu; os valores em mono pequena. Nenhum kicker, sobrancelha ou rótulo antes do título.

**A Regra do Nome Inteiro.** O nome vencedor sempre aparece por extenso no `h1`. A degradação — primeiro nome, iniciais, uma letra — existe apenas dentro do aro do globo, onde o comprimento do arco manda.

## Layout

O produto é uma única página empilhada em faixas de largura total, com goteira lateral de `5vw` (`1.1rem` abaixo de 620px) e respiro vertical de seção em `clamp(4.5rem, 9vw, 8rem)`.

A dobra inicial é um palco de duas colunas assimétricas (`minmax(320px, .92fr) / minmax(0, 1.08fr)`) com altura mínima de `min(760px, 100svh - 64px)`: a máquina à esquerda, separada por uma hairline vertical; o resultado à direita. O adesivo da rodada fica posicionado em absoluto no canto superior direito do palco, rotacionado `-13deg`. O registro é uma grade de células que se empacota borda a borda (`auto-fit, minmax(124px, 1fr)`) sob uma régua superior de 2px, com um tique por célula. A porta e a prateleira repetem a mesma assimetria do palco. A grade de série sob o resultado é `auto-fit, minmax(140px, 1fr)` com bordas que se costuram sem gap.

A página tem duas faixas e um rodapé, e mais nada: o palco e o registro. **A administração não é uma seção — é uma gaveta.** A coleção ocupava a metade de baixo de toda visita para uma tarefa que se faz uma vez por mês; agora ela abre pelo cabeçalho e some quando acaba.

**Responsivo.** Em `980px` tudo colapsa para uma coluna, a máquina troca a borda direita por borda inferior, e os decalques da máquina desaparecem. Em `620px` a placa da máquina some, a barra do topo quebra em duas linhas, a grade de série vira duas colunas, o registro vira um trilho horizontal com `scroll-snap` e a dica de deslize aparece, as ações do resultado empilham em largura total, as grades de cor e emoji passam de doze para oito colunas, e o rodapé empilha.

### Named Rules

**A Regra do Alvo de 44px.** Todo controle interativo tem no mínimo 44px de altura, e os campos e ações primárias, 48px. Vale igualmente no trilho do registro, nas linhas da gaveta e nos comprimidos de cor e emoji, que têm 44px de altura mesmo quando a coluna é mais estreita. O alvo de uma caixa de seleção é o rótulo que a envolve, e é ele que precisa cumprir a medida.

**A Regra do Decalque de Bancada.** Os decalques com linha-guia na máquina são desktop-only: ocultos abaixo de 980px, porque a linha-guia precisa de espaço lateral para apontar sem cruzar a peça. A placa da máquina no cabeçalho some abaixo de 620px por ser plaqueta de identificação, não conteúdo.

**A Regra da Grade que Fecha.** Uma grade de escolhas se divide em fileiras cheias. Vinte e quatro cores em onze colunas deixam duas sobrando numa terceira fileira, e a sobra lê como engano; doze colunas fecham em duas, oito em três. `auto-fit` é para conteúdo de tamanho livre, não para um conjunto de tamanho conhecido.

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

A silhueta assinatura é a cápsula: cúpula colorida sobre casca translúcida, dividida por uma costura. Ela reaparece em três escalas — cunha em anel no aro do globo, semicírculo completo solto no interior, e a marca do produto no cabeçalho — e em três versões planas: a bolinha do registro (`999px 999px 4px 4px`, com a casca desenhada por sombra interna), o comprimido de cor da gaveta (o mesmo desenho em 44px de altura) e o disco de iniciais (círculo com sombra interna inferior clara, que carrega o emoji da pessoa quando ela escolheu um). A cunha ocupa o anel entre o equador (118) e o raio externo (168) em espaço de usuário do SVG; a casca transparente ocupa o anel interno (96–118).

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
Quase não há cards. As agrupações são feitas por costura de bordas: a grade de série e o registro desenham suas próprias hairlines e se encaixam sem gap nem raio. As exceções são a prateleira da raiz (esmalte profundo, hairline, raio `16px`) e a faixa do ensaio do resumo na bancada da etiqueta (papel silencioso, raio `8px`) — as duas com fundo próprio porque são recipientes, não agrupamentos.

### Inputs / Fields
- **Style:** fundo branco, tinta escura, borda de 1.5px em `#a9b1bf`, raio `8px`, `0.78rem 0.95rem`, altura mínima 48px. Sempre precedidos por rótulo em mono `0.64rem` caixa alta.
- **Focus:** contorno âmbar escuro (`#b5761c`), que é também a cor do cursor de texto — sobre papel, o amarelo puro não teria contraste.
- **Error:** borda `#a3123f` com `aria-invalid`, e mensagem em `#8f0f37` com `role="alert"` abaixo do campo. A mensagem nunca depende só da cor.
- **Share field:** o campo de link compartilhável usa mono `0.72rem` — é um valor a conferir, não um texto a ler.

### Navigation
A barra superior é a plaqueta rebitada no gabinete: fundo de esmalte profundo, 64px, hairline inferior. À esquerda a marca (cápsula desenhada em SVG mais o nome em Fredoka 600); à direita os comprimidos de navegação em mono caixa alta — **A coleção** com a contagem em tabular, **O álbum** — e, por último, o crachá.

**O crachá** é quem está mexendo, sempre à vista: um disco de cápsula com as iniciais, na cor tirada do próprio nome, mais o nome truncado em `12ch`. Ele é um botão, e o que ele faz é reabrir a porta para passar a vez. Não é um menu de conta e não tem submenu: o produto não tem contas.

Abaixo de 620px a barra quebra em duas linhas e o nome do crachá encolhe para `8ch`, mas nada some — a navegação é a única saída de cada página.

### Toast
Aviso fixo no canto inferior direito sobre esmalte elevado, borda de linha forte, raio `12px`, com botão amarelo de desfazer e fechar em cromo. Entra com `translateY(1rem)` → 0 em `.2s`. É `role="status"` e `aria-live="polite"`.

### The Machine (signature)
A máquina é um único SVG (`viewBox="-26 -26 452 576"`) desenhado em espaço próprio de 400×400 para o globo: centro em (200, 200), raio interno 96, equador 118, raio externo 168, trilho de rótulo em 140. O aro cromado leva 84 caneluras desenhadas individualmente entre os raios 171 e 183. Nove cápsulas inteiras repousam fixas no interior inferior, para que a cena nunca reembaralhe.

- **Rótulos no aro:** cada nome corre tangencialmente pelo aro via `textPath`. O arco do rótulo é invertido para as cápsulas que param na metade inferior, de modo que nenhum nome fique de cabeça para baixo. O texto degrada por orçamento de arco — primeiro nome, iniciais, uma letra — conforme o número de participantes; o tamanho da fonte é `min(17, max(8, 46/√n))`.
- **Calha às seis horas:** a rotação de destino é calculada para que a cápsula vencedora pare exatamente na calha, na base do globo.
- **Estado ao vivo:** revelada a rodada, a chapa recebe a cor da cápsula, os elementos montados nela recebem a tinta AA calculada, e um brilho radial suave da mesma cor aparece atrás do palco.

### A Porta

Ninguém entra na máquina sem dizer quem é. É a primeira tela do produto e a única que não pode ser pulada, porque tudo que se faz aqui fica gravado num registro que o clube vai reler meses depois — e um registro de giros anônimos não conta história nenhuma.

- **Palco:** a mesma assimetria do palco da máquina, em esmalte, com a plaqueta da marca no canto superior esquerdo. À esquerda a cápsula; à direita o título em display, um parágrafo em céu, um campo e o botão amarelo.
- **A cápsula que se monta:** um SVG de 220×220 com o poço em gradiente radial, a cúpula na cor da pessoa, o brilho especular na curva de cima, a casca translúcida, o lábio interno e a costura em cromo chapado. As iniciais aparecem dentro da cúpula conforme se digita, e a cor sai de um hash do próprio nome — quem digita o mesmo nome vê a mesma cápsula toda vez. Vazia, a cúpula é âmbar: a primeira tela do produto não devia ser cinza.
- **Duas faces:** quem nunca entrou vê "Quem é **você?**" e um só botão. Quem está trocando vê "Quem está **na mesa?**" e ganha um "Continuar como estou" — só quem já está dentro tem para onde voltar.
- **A costura é cromo chapado**, e não o degradê do aro da máquina: um `linearGradient` em caixa delimitadora de altura zero não pinta nada, e a linha simplesmente sumia.

### A Prateleira

A raiz do produto. Antes ela era uma máquina de demonstração com seis nomes inventados; agora é a porta de casa: a saudação pelo primeiro nome, o convite para montar uma máquina, e as máquinas que este aparelho já abriu.

- **Duas colunas:** a saudação e o convite à esquerda; a prateleira à direita, numa caixa de esmalte profundo com hairline e raio `16px`.
- **A escala é de manchete, não de display.** Uma saudação é uma frase, não um nome vencedor: a escala de display a quebra em três linhas e engole a página.
- **A lista é local e não dá acesso a nada.** Quem abre uma máquina é o link, não a prateleira — e listar grupos é proibido nas rules justamente para o link continuar sendo o segredo. Cada linha carrega um disco na cor derivada do id do grupo, o nome, a data da última visita e um X para esquecer.
- **Vazia, ela se explica** com o globo fechado e uma frase, em vez de ficar em branco.

### A Gaveta da Coleção

Administrar é uma tarefa de uma vez por mês, e ela ocupava metade de toda visita. Agora abre pelo cabeçalho, faz o que tem de fazer, e some.

- **Papel, pela Regra da Única Quebra:** sobreposição de `min(38rem, 100vw - 2.4rem)` com raio `12px` sobre o mesmo véu de esmalte com `blur(2px)` da bancada da etiqueta, e a marca de registro do impressor no canto.
- **Duas faces e nunca duas camadas.** A lista e a bancada de uma cápsula trocam de lugar dentro da mesma gaveta. Um segundo modal por cima do primeiro deixaria dois véus e dois `aria-modal` disputando a mesma tecla Esc; aqui o Esc volta uma face por vez.
- **Saída no alto.** Uma gaveta que passa da altura da tela precisa de um X no canto: o "Fechar" do rodapé fica abaixo da dobra justamente quando a lista é longa.
- **A linha de uma pessoa** é o disco de cápsula (o emoji dela, ou as iniciais), o nome, a cor por extenso em mono, e a seta que anda 3px no hover.
- **A bancada de uma cápsula:** a prévia grande no cabeçalho ao lado do nome, a grade de cores, a grade de emoji, um campo para colar outro, e as três ações — salvar em botão de esmalte, voltar em texto, e **Tirar do globo** separado à direita em `remove-ink`.
- **Escolher uma cor é escolher uma cápsula:** os comprimidos da grade têm o mesmo semicírculo achatado da bolinha do registro (`999px 999px 6px 6px`), com a casca desenhada por sombra interna. O selecionado ganha um anel duplo papel-sobre-tinta, que não briga com o anel de foco amarelo.
- **Salvar só volta para a lista quando o servidor confirma.** Voltar ao emitir levaria embora a cor que a pessoa acabou de escolher se a gravação falhasse, e ela teria de escolher tudo de novo sem saber por quê.

### A Etiqueta

A etiqueta é o papel colado na cápsula depois que ela caiu: o que o clube jogou e como foi. Ela nunca é um "card de metadados" — é um objeto do mesmo mundo do adesivo da rodada.

- **Etiqueta escrita:** retângulo de papel quente (`paper`), raio `4px`, largura `min(100%, 33rem)`, rotacionado `-0.9deg` (`-0.5deg` abaixo de 620px), com sombra de colagem `0 12px 26px rgba(6, 14, 28, .45)`. Rótulo de série em mono no topo, título em Fredoka `1.42rem`, descrição em corpo `0.92rem` preservando quebras de linha, e um rodapé em mono separado por hairline de papel com a assinatura e o botão **Editar**. Uma cápsula plana na cor da pessoa fica ancorada no canto superior direito, pela Regra da Cápsula Portante.
- **Etiqueta em branco:** o mesmo objeto em `paper-quiet`, com uma segunda borda tracejada 6px para dentro — papel ainda não escrito, não um botão de "adicionar". É o `<button>` inteiro, e levanta 2px no hover.
- **Bancada:** a etiqueta é escrita numa sobreposição de papel (`12px`, `min(34rem, 100vw - 2.4rem)`) sobre um véu de esmalte com `blur(2px)`, carregando a mesma marca de registro do impressor da seção da coleção. Cabeçalho com a série do giro, o disco de iniciais na cor da cápsula e o nome em `2.4rem`. Cada campo tem contador tabular no cabeçalho do rótulo, que vira `field-error-ink` no limite. A ação é o botão de esmalte, nunca o amarelo — é papel, pela Regra do Amarelo de Ação. **Retirar** vive separado à direita, em `remove-ink`.
- **Título e subtítulo:** na etiqueta inteira eles se separam — o título em Fredoka `1.42rem`, o subtítulo logo abaixo em mono `0.74rem`, porque ele é a legenda do título (o placar, a nota), não a continuação dele. Onde só cabe uma linha, os dois viram um resumo só: `TÍTULO ● SUBTÍTULO`.
- **O ensaio do resumo:** a bancada monta esse resumo enquanto se escreve, numa faixa de papel silencioso rotulada `NO REGISTRO`. É como o campo se explica sem uma frase de ajuda.
- **No registro:** a célula inteira vira o controle que abre a bancada. Uma célula sem etiqueta diz `SEM ETIQUETA` em mono de série, e é assim que o retroativo se anuncia sem precisar de um botão por célula.

### O Álbum

O álbum é a parede de etiquetas: cada cápsula que já saiu da máquina, colada no esmalte. A superfície continua sendo o esmalte — o papel são os objetos, não o fundo, e é isso que mantém a Regra da Única Quebra de pé com dezenas de cartões na tela.

- **Cabeçalho:** título display, um parágrafo de apoio em céu e a grade de série em 2×2 (`Cápsulas`, `Etiquetadas`, `Rodadas`, `Já saíram`). Quatro colunas estreitas viravam 3 + 1 órfão; 2×2 fecha o bloco.
- **Fileira de pessoas:** faixa de esmalte profundo com um comprimido por pessoa que já saiu, carregando a cápsula plana na cor dela, o emoji ao lado do nome e a contagem em mono tabular. O selecionado é amarelo — aqui o amarelo é marcador de estado, o segundo papel que a Regra do Amarelo de Ação lhe dá, e não uma ação concorrente. A cor é a que a pessoa escolheu, e ela continua sendo a mesma em toda a parede mesmo depois de sair do grupo. O emoji fica **ao lado** do comprimido, não dentro: `1.15rem × .82rem` é pequeno demais para um símbolo ser lido.
- **Régua de rodada:** filete de 2px com o número da rodada à esquerda e a contagem à direita, em mono de série. A ordem é da rodada mais nova para a mais antiga, e dentro de cada uma do giro mais recente para trás: quem abre o álbum quer ver o que acabou de acontecer.
- **Cartão:** a etiqueta de papel, com inclinação fixa por posição (`-1.7°` a `1.8°`, seis valores em rodízio) para que a parede nunca se remexa entre duas visitas. Cabeçalho com a cápsula plana e o nome em `1.42rem`, picote de papel, título do jogo, descrição cortada em quatro linhas e o rodapé de assinatura preso na base para que os cartões de uma fileira terminem alinhados. O cartão inteiro é o controle que abre a bancada.
- **Hover:** o cartão **endireita** para `0°` e sobe 4px, com a sombra crescendo — o gesto de descolar uma figurinha da parede. É transição de estado, não movimento autônomo: a Regra do Momento Único continua valendo. Abaixo de 620px a inclinação cai à metade, para que a borda do cartão não beire a goteira.
- **Cápsula em branco:** papel silencioso com a segunda borda tracejada 6px para dentro, dizendo `SEM ETIQUETA` em mono. É como o retroativo se anuncia, sem precisar de um botão por cartão.

### Motion
Existe um único momento autoral, e ele é sempre o mesmo: a manivela gira duas voltas completas (`720deg`), o globo gira em `4.3s cubic-bezier(.12, .72, .12, 1)` até encaixar a cápsula na calha, as cápsulas soltas assentam com um pequeno balanço, a cápsula cai na bandeja em `.92s`, a cúpula se abre em `1.5s` — e o que estava dentro sai.

**O confete** é a última batida desse momento, não um segundo: sessenta e quatro partículas em canvas, num leque para cima e para os lados, com gravidade de `1500px/s²` e vida de `2.6s`. Sai da bandeja quando a máquina está na tela, e do alto do centro quando não está. Com emoji, saem emoji; sem emoji, saem cápsulas na cor da pessoa. Canvas e não elementos: sessenta e quatro nós no DOM custariam sessenta e quatro reflows por quadro, e nada aqui precisa ser lido nem clicado.

**A cena é reencenável, e reencenar não é decidir.** A máquina abre girando, e o globo inteiro é um botão que a roda de novo — sempre parando na mesma cápsula, porque a rotação de destino sai do mesmo registro. É a diferença entre assistir e decidir, que é a promessa do produto. O confete fecha toda encenação completa — na abertura automática, no replay pedido ao clicar no globo e no giro verdadeiro — usando o emoji da pessoa quando ela escolheu um.

Fora disso, apenas transições de estado curtas (`.16s`–`.7s`).

### Named Rules

**A Regra do Momento Único.** Nada mais na página anima sozinho. Sem carrossel, sem contador que sobe, sem entrada por scroll, sem pulso de atenção. A animação da entrega é o único movimento autoral — o confete é a última batida dela, não um segundo momento — e ela nunca altera o resultado, só o revela.

**A Regra do Alvo do Tamanho da Peça.** Quando uma peça inteira é o controle, o controle é uma caixa de verdade em volta dela, e não um alvo invisível por cima. `display: contents` num botão o tira da árvore de layout e leva o anel de foco junto; a máquina é um `<button>` com largura própria, e o anel contorna a máquina.

**A Regra do Movimento Reduzido nos Dois Lugares.** `prefers-reduced-motion` é honrado em CSS (todas as durações caem para `.01ms`) **e** em JS (a entrega roda em 120ms em vez de 4300ms). Qualquer sequência nova precisa dos dois desligamentos; desligar só o CSS deixa a página parada esperando um timer longo.

## Do's and Don'ts

### Do:
- **Do** deixar o esmalte sangrar até as bordas da tela; a máquina é o plano de fundo, não um objeto dentro de uma moldura.
- **Do** usar a cor da cápsula da pessoa em todo lugar onde ela aparece — aro, registro, gaveta, bandeja, álbum e confete — para que a coleção leia como coleção.
- **Do** guardar a cor como posição na paleta, nunca como hexadecimal livre, para que o contraste continue garantido sem o servidor precisar calculá-lo.
- **Do** pintar a chapa da máquina com a cor da cápsula vencedora como campo chapado e trocar os elementos montados nela para a tinta AA calculada.
- **Do** reservar Martian Mono para valores de série e medição, com números tabulares.
- **Do** construir hierarquia com escala e cor: o nome enorme, o apoio em céu, os valores em mono pequena.
- **Do** manter todo controle com no mínimo 44px de altura e o contorno de foco amarelo de 3px.
- **Do** acompanhar toda cor de estado com texto — o registro marca "Último", a gaveta nomeia a cor por extenso, e os erros de campo trazem mensagem.
- **Do** honrar `prefers-reduced-motion` em CSS e em JS ao mesmo tempo.

### Don't:
- **Don't** centralizar o conteúdo em um card branco flutuante: é exatamente a entrega que este mundo recusa.
- **Don't** misturar a cor da cápsula difusamente no azul como tintura de fundo — o resultado é oliva.
- **Don't** introduzir uma cor de cápsula sem definir e testar a tinta clara ou escura que a torna legível em cada superfície.
- **Don't** trazer papel para fora de onde se administra: a gaveta da coleção, a bancada da etiqueta e a própria etiqueta.
- **Don't** empilhar um modal sobre outro: duas faces na mesma gaveta, e o Esc volta uma de cada vez.
- **Don't** deixar uma grade de escolhas com uma fileira órfã; o número de colunas divide o número de itens.
- **Don't** usar sombra dura de bloco com deslocamento diagonal e zero desfoque; a parede lateral do botão é vertical, sólida, e vem com sombra ambiente.
- **Don't** colocar kicker, sobrancelha ou rótulo acima de um título.
- **Don't** usar monoespaçada como sinal genérico de "técnico" em texto corrido, botão ou título.
- **Don't** adicionar um segundo movimento autônomo à página; a entrega é o único momento.
- **Don't** falar em sorte, azar ou aleatoriedade na interface: o registro e a coleção completa são a prova.
