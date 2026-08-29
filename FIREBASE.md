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
  tipo: 'member_added' | 'member_removed' | 'spin'
  em: timestamp                          ← obrigatoriamente request.time
  nome?: string                          ← member_added
  memberId?: string                      ← member_removed
  autor?: string                         ← quem operou, não verificado
```

## Dois buracos encontrados e fechados

Sondas adversariais contra o emulador acharam duas falhas no desenho original:

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

## Rules

O arquivo real é `firestore.rules`, e ele é a fonte da verdade — não há esboço aqui para
divergir dele. `tests/firestore-rules.test.mjs` prova 35 comportamentos contra o emulador:

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
| 0. Decisões de produto | ✅ tomadas, acima |
| 1. Não quebrar o modo atual | ✅ intocado, testes congelados verdes |
| 2. Motor por log, puro | ✅ `group-log.ts`, 85 testes (60 deles com log aleatório) |
| 2b. Guarda de uso, puro | ✅ `usage-guard.ts`, 19 testes |
| 3. Firestore + rules + emulador | ✅ projeto `sorteador-ed1c9`, rules publicadas, 35 testes |
| 3b. Auth anônima ligada | ⛔ **pendente**, dois cliques no Console |
| 4. Camada de dados (`group-store.ts`) | pendente |
| 5. Interface do modo sincronizado | pendente |
| 6. Importar link antigo para grupo | pendente |

## O que ainda depende de você

Dois cliques no Console, e nada além disso:

1. **Authentication → Sign-in method → Anônimo → Ativar.** Sem isso o app inteiro é negado
   pelas rules, porque elas exigem `request.auth != null` até para ler.
2. **Authentication → Settings → Authorized domains → adicionar `igorsolerc.github.io`.**

Ordem correta das fases 3b em diante, e limpeza de sobra:

- Apagar o projeto GCP vazio `mesa-do-mes-sorteador`, criado numa tentativa que esbarrou nos
  Termos de Serviço. Está órfão e não custa nada, mas é lixo.
