# Grupo sincronizado (Firebase)

Modo novo, ao lado do atual. O modo por link (`#grupo=...`) **continua existindo e não muda** —
há gente usando, e `compatibility.spec.ts` prova que os resultados antigos seguem intactos.

## Regra de custo, acima de qualquer outra

> **Este projeto fica no plano Spark. Nunca habilite faturamento.**

Sem conta de faturamento anexada o Google não consegue cobrar: ao estourar a cota diária o
Firestore passa a devolver `resource-exhausted` até o reset em UTC. Essa é a garantia real de
custo zero — nenhum código é mais forte que ela.

Consequências que decorrem disso e não são negociáveis:

- **Sem Cloud Functions.** Hoje elas exigem Blaze. Se um dia isso mudar a decisão, é uma decisão
  de produto, não um detalhe de implementação.
- **Sem Storage, sem qualquer serviço que exija Blaze.**
- Ponha **alerta de orçamento** mesmo assim, e confira os limites atuais do Spark antes de
  confiar nos números abaixo — eles mudam, e a referência aqui é de meados de 2026.

O `UsageGuard` (`src/app/usage-guard.ts`) é a camada acima: orçamento por dispositivo e por dia
UTC, muito abaixo da cota do projeto, mais detecção de laço em rajada. Ele existe para que a
parede nunca seja alcançada, e para degradar com mensagem clara caso seja.

| | Cota Spark (projeto/dia, conferir) | Orçamento por dispositivo/dia |
|---|---|---|
| Leituras | ~50.000 | 1.500 |
| Escritas | ~20.000 | 300 |

## Decisões de produto já tomadas

1. **Quem entra no meio da rodada já é elegível** — ainda não ganhou nesta rodada.
2. **Quem sai não some do histórico.** O giro guarda um snapshot de quem estava elegível.
3. **Identidade é por nome, dentro do grupo.** `memberId(grupoId, nome)` é determinístico:
   o mesmo nome no mesmo grupo é sempre a mesma pessoa. Sair e voltar preserva o histórico —
   inclusive o "já ganhou nesta rodada", que continua valendo.

## Como o resultado é decidido

O vencedor **não é gravado como fato**. O banco guarda um log append-only e o vencedor é
derivado por função pura (`replay()` em `src/app/group-log.ts`).

A única entrada que o cliente não controla é o **carimbo de hora do servidor**. Ele entra no
hash do giro. Como o log não aceita `update` nem `delete`, uma tentativa não pode ser desfeita.

Isso não impede má-fé, mas a torna cara e visível: cada giro consome uma vaga do bolo da rodada.
Quem girar de novo por não ter gostado do resultado **não recupera a vaga anterior** — queimou a
próxima, e o log mostra. É transparência, não prevenção. Prevenção de verdade só com função no
servidor, que este projeto não pode ter.

Mitigação adicional disponível nas rules: **um giro a cada 30s por grupo**, comparando
`request.time` com `ultimoGiroEm` no doc do grupo, gravados na mesma escrita em lote.

## Schema

O doc do grupo guarda **só o que as rules sabem validar sozinhas**. Ele não guarda estado
derivado — ver a seção seguinte, porque essa decisão custou um buraco de segurança para ser
aprendida.

```
grupos/{grupoId}
  nome: string
  criadoEm: timestamp        ← request.time, imutável
  ultimoGiroEm: timestamp | null
  versaoLog: number          ← quantos eventos existem; sobe junto com cada evento

grupos/{grupoId}/eventos/{eventoId}     ← append-only, é a verdade
  tipo: 'member_added' | 'member_removed' | 'member_styled' | 'spin' | 'spin_annotated'
  em: timestamp                          ← obrigatoriamente request.time
  nome?: string                          ← member_added
  memberId?: string                      ← member_removed, member_styled
  cor?: number                           ← member_styled: posição na paleta, 0..23
  emoji?: string                         ← member_styled: até 16 unidades UTF-16
  giro?: number                          ← spin_annotated: índice do giro etiquetado
  titulo?: string                        ← spin_annotated, até 80
  subtitulo?: string                     ← spin_annotated, até 60 (opcional na regra)
  descricao?: string                     ← spin_annotated, até 280
  autor?: string                         ← quem operou, não verificado
```

**Nenhum campo novo no doc do grupo.** A cor e o emoji de uma pessoa são derivados do log
como todo o resto: `replay()` os aplica ao membro, e o doc do grupo continua guardando só o
que as rules sabem validar sozinhas.

## Três buracos encontrados e fechados

Sondas adversariais contra o emulador acharam três falhas no desenho:

**1. Vencedor forjável.** O doc do grupo guardava um campo `estado` com a lista, a rodada e o
último vencedor, para que abrir o app custasse 1 leitura em vez de N. Mas nenhuma rule
consegue replicar um log para conferir esse cache — então qualquer portador do link podia
gravar `estado.ultimoVencedor = 'eu'` e todo mundo veria a mentira, porque ninguém lia o log.

Conserto: **o campo deixou de existir.** O cliente deriva do log, sempre. A classe inteira de
vulnerabilidade sumiu junto com o campo, em vez de virar mais uma regra a manter.

**2. Contador mentiroso.** Dava para gravar um evento sem incrementar `versaoLog`. O contador
existe para o cliente saber se tem novidade sem reler o log inteiro; se ele mente, um evento
fica invisível para quem confia nele.

Conserto: gravar evento agora exige, via `getAfter()`, que o contador suba **na mesma escrita
em lote**. Um evento não entra sozinho.

**3. Espera de giro que era só conselho.** As rules exigiam que um giro respeitasse os 30
segundos desde `ultimoGiroEm`, e que só um giro pudesse mexer nessa marca — mas nada obrigava
o giro a *carimbá-la*. Bastava gravar o evento de giro sem tocar no doc do grupo para o
relógio ficar parado em `null`, e o giro seguinte passava na hora, quantas vezes quisesse.
A espera existe para encarecer girar de novo até gostar do resultado; sem o carimbo, ela não
encarecia nada.

Conserto: `marcaDeGiroCarimbada()` — todo evento de tipo `spin` precisa que
`getAfter().ultimoGiroEm == request.time`. A metade que faltava do par: uma regra dizia quem
*pode* mexer na marca, e agora a outra diz quem *tem* que mexer.

## Custo de leitura, agora que o log é a verdade

Sem cache no servidor, o cliente guarda o log em `localStorage` e busca só o delta:

| Situação | Leituras |
|---|---|
| Abrir com cache em dia | 1 (só o doc do grupo) |
| Abrir com N eventos novos | 1 + N |
| Primeira vez num grupo antigo | 1 + tamanho do log |

Para um clube jovem isso é irrelevante. Se um log passar de algumas centenas de eventos, a
saída é gravar snapshots periódicos **dentro do próprio log** e replicar só a partir do
último — fica anotado como otimização futura, não é necessária agora.

Atenção: cada `get()` e `getAfter()` dentro de uma rule **conta como leitura na cota**. Gravar
um evento custa 2 leituras de regra além da escrita.

## A cápsula de cada pessoa: cor e emoji

Cada membro tem uma **cor** e um **emoji**, escolhidos por quem quiser na gaveta da coleção.
Eles descrevem a pessoa; nunca participam do sorteio. `group-log.spec.ts` trava isso: com e
sem pintura, o vencedor, o bolo e a rodada são idênticos.

**A cor é uma posição na paleta, não um hexadecimal.** Guardar `cor: 13` em vez de
`'#FFDF2B'` faz três coisas ao mesmo tempo: as rules validam um inteiro entre 0 e 23 sem
precisar saber calcular contraste; a paleta inteira pode ser reafinada sem reescrever um
evento sequer; e nenhuma cápsula pode existir fora do conjunto cuja tinta clara ou escura
`palette.spec.ts` prova passar em 4.5:1. O preço é que **reordenar `CAPSULE_COLORS` repinta todo
mundo** — a paleta só cresce pelo fim.

**Os dois campos são independentes.** Omitir um significa "deixe como está", o que permite
trocar só a cor sem apagar o emoji, com um evento por salvamento em vez de dois. Emoji em
branco é emoji retirado. Um evento sem cor e sem emoji é recusado pelas rules: ele não mudaria
nada e ainda custaria uma escrita da cota.

**Quem sai e volta volta com a própria cápsula.** `replay()` preserva `colorIndex` e `emoji`
quando um `member_added` reencontra um membro que já existia. A identidade visual da pessoa é
o que faz o álbum inteiro dela ler como coleção; perdê-la ao voltar quebraria a parede.

**Um emoji é um símbolo, não um texto curto.** `emojiText()` corta por **grafema** — o que o
navegador desenha como uma coisa só — e não por ponto de código: uma bandeira ou uma família
com juntores seria partida ao meio e gravaria os cacos. O teto de 16 unidades UTF-16 existe
porque uma família chega perto disso; um emoji simples ocupa 2.

## Etiquetas: o que foi jogado e como foi

Um giro pode receber um **título**, um **subtítulo** e uma **descrição** — `Click The Button!`
/ `Nota 8/10` / `Jogamos em cinco`. Onde só cabe uma linha, título e subtítulo viram
`TÍTULO ● SUBTÍTULO`. Elas descrevem o giro; nunca participam dele. `group-log.spec.ts` trava
isso: com e sem etiquetas, o vencedor, o bolo e a rodada são idênticos.

**A etiqueta é um evento, não um campo.** O giro não ganhou colunas: quem etiqueta grava um
`spin_annotated` apontando para o índice do giro. Editar é gravar outro; o replay faz a
última valer, e as anteriores continuam no log — é assim que a interface mostra "editado
por Fulano" sem que exista um caminho para reescrever o passado. Retirar a etiqueta é
gravá-la em branco, e a retirada também fica registrada.

**Por que o índice do giro, e não o id do documento.** `replay()` já atribui
`index = spins.length` no momento em que processa o giro, e esse número é função só do
prefixo do log: eventos futuros nunca o mudam, e um giro que virou no-op continua no-op.
O índice é tão congelado quanto o vencedor, e o cache local não precisou mudar de formato.
Por isso etiquetar o giro de ontem e o de um ano atrás é literalmente a mesma operação, sem
backfill nenhum nos grupos que já existem.

**Alternativa rejeitada: uma subcoleção `anotacoes/{giro}` com `allow update`.** Custaria uma
segunda consulta em toda carga — o cache por `versaoLog` não a cobre — dobrando o custo do
caso comum, hoje 1 leitura. E reintroduziria exatamente a classe de bug do campo `estado`
descrita acima: um documento mutável que nenhuma regra consegue conferir contra o log.

**O subtítulo é opcional na regra, e não só no conteúdo.** `(!('subtitulo' in d) || ...)`:
uma aba aberta antes de o campo existir não manda a chave, e recusá-la quebraria quem estava
com o app na tela no minuto da publicação. O replay lê a ausência como vazio. Foi o teste de
regras que pegou isso — três casos antigos passaram a falhar assim que a validação virou
obrigatória.

**O que as rules garantem.** O índice é inteiro, não-negativo e menor que `versaoLog` — o
`get` do grupo já estava lá para o contador, então a checagem não custa leitura nova. Título,
subtítulo e descrição são opcionais e limitados. Uma etiqueta não pode carregar `nome` nem
`memberId`, e nenhum outro tipo de evento pode carregar campos de etiqueta ou de pintura.

A espera de 30s **não** se aplica a etiquetar nem a pintar — corrigir um título nunca bloqueia
o próximo giro. Em contrapartida, **só um giro pode mexer em `ultimoGiroEm`** (senão etiquetar
em rajada empurraria a espera e travaria a máquina do grupo inteiro sem girar uma vez) **e
todo giro tem que mexer** (senão a espera vira conselho — ver o terceiro buraco acima).

**Medida de texto.** `size()` nas rules conta **unidades UTF-16**, o mesmo que `.length` em
JavaScript — não bytes, não pontos de código. Isso foi medido por sonda no emulador depois
que o teste de integração recusou um título de emoji que parecia caber. É por isso que
`noteText()` corta caractere a caractere até o orçamento em unidades: um `slice` cru na
mesma medida partiria um par substituto e gravaria meio emoji.

**Custo.** Etiquetar é 1 leitura + 2 escritas, idêntico a adicionar alguém ou a pintar uma
cápsula. Nenhum índice novo. Cada edição soma um evento ao log, o que entra na mesma conta de
crescimento acima.

## Quem está mexendo

O nome de quem opera é perguntado na porta, antes de qualquer rota, e vai no campo `autor` de
todo evento. **Ele não é verificado e não pretende ser**: as rules continuam sem saber quem é
quem, e o link continua sendo a única credencial. É um crachá que a pessoa escreve para si
mesma — o que ele resolve é um registro que o clube relê meses depois e no qual ninguém sabia
quem tinha girado. Fica no `localStorage` do aparelho e nunca sai dele por outro caminho.

A prateleira da página inicial guarda, também só no aparelho, os grupos que ele já abriu. Ela
não dá acesso a nada: listar grupos é proibido nas rules justamente para o link continuar
sendo o segredo, e essa lista é só um atalho para não caçar a mensagem no WhatsApp.

## Rules

O arquivo real é `firestore.rules`, e ele é a fonte da verdade — não há esboço aqui para
divergir dele. `tests/firestore-rules.test.mjs` prova 75 comportamentos contra o emulador:

```
npm run test:rules
```

Não precisa de projeto nem de rede. Rode antes de qualquer deploy de rules.

## O link

`https://igorsolerc.github.io/sorteador/#/g/<grupoId>`

O id é a única credencial: quem tem o link lê e escreve. Precisa ser **imprevisível** (id
automático do Firestore, 20 caracteres, serve). Um link vazado significa que estranhos podem
mexer na lista e girar — considere depois um segundo segredo só para administrar.

## Estado atual da implementação

| Fase | Situação |
|---|---|
| 0. Decisões de produto | ✅ |
| 1. Não quebrar o modo atual | ⬛ retirado: o modo por link estático foi removido em setembro de 2026 |
| 2. Motor por log, puro | ✅ `group-log.ts` |
| 2b. Guarda de uso, puro | ✅ `usage-guard.ts` |
| 3. Firestore + rules | ✅ `sorteador-ed1c9`, 75 testes no emulador |
| 4. Camada de dados | ✅ `group-store.ts`, 28 testes de integração |
| 5. Interface | ✅ `#/g/<id>`, verificada em produção |
| 6. Criar grupo | ✅ `#/novo`, com quem monta já entrando como primeira cápsula |
| 7. Fumaça em produção | ✅ 13/13 |
| 8. Ponta a ponta no navegador | ✅ 36/36 do ciclo completo: etiqueta, cápsula, reencenação e álbum |
| 9. Merge e deploy | ✅ pela branch `main`, com publicação automática no GitHub Pages |

## Como rodar cada suíte

```
npm test              # 233 unitários e de componente
npm run test:rules    # 75 rules no emulador, sem projeto nem rede
npm run test:store    # 28 de integração da camada de dados
npm run test:a11y     # 8 telas x 3 larguras, contra o servidor local
npm run test:etiqueta # 35 verificações de ponta a ponta num navegador real
node tests/seed-emulator.mjs        # um grupo de mentira com cara de real, no emulador
node tests/shot.mjs <url> <saida.png> <esperaMs> <larg> <alt>
```

**Nunca capture com `--virtual-time-budget`** para telas que falam com o Firestore: o tempo
virtual adianta o relógio e atropela os streams, fazendo uma página boa parecer travada.
`tests/shot.mjs` dirige o Chrome por CDP e espera tempo real.

## O que ainda depende de você

Dois cliques no Console, e nada além disso:

1. **Authentication → Sign-in method → Anônimo → Ativar.** Sem isso o app inteiro é negado
   pelas rules, porque elas exigem `request.auth != null` até para ler.
2. **Authentication → Settings → Authorized domains → adicionar `igorsolerc.github.io`.**

Ordem correta das fases 3b em diante, e limpeza de sobra:

- Apagar o projeto GCP vazio `mesa-do-mes-sorteador`, criado numa tentativa que esbarrou nos
  Termos de Serviço. Está órfão e não custa nada, mas é lixo.
