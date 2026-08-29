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

O doc do grupo é o **estado materializado**, para que abrir o app custe **1 leitura**, não N.
O log só é lido quando alguém abre o histórico.

```
grupos/{grupoId}
  nome: string
  criadoEm: timestamp
  ultimoGiroEm: timestamp | null
  versaoLog: number            ← quantos eventos existem; detecta divergência
  estado: {                    ← cache derivado, nunca a verdade
    membros: [{ id, nome, ativo, entrouEm, saiuEm }],
    rodada: number,
    bolo: [memberId],
    ultimoVencedor: { id, nome, em } | null
  }

grupos/{grupoId}/eventos/{eventoId}     ← append-only, é a verdade
  tipo: 'member_added' | 'member_removed' | 'spin'
  em: timestamp                          ← obrigatoriamente request.time
  nome?: string                          ← member_added
  memberId?: string                      ← member_removed
  autor?: string                         ← quem operou, não verificado
```

Se `estado` divergir do replay do log, **o log ganha** e o `estado` é recalculado.

## Rules (esboço a validar no emulador)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /grupos/{grupoId} {
      allow get: if true;
      allow list: if false;                 // link é a credencial; não se lista grupos
      allow create: if grupoValido();
      allow update: if soAtualizaEstado();
      allow delete: if false;

      match /eventos/{eventoId} {
        allow get, list: if true;
        allow create: if eventoValido();
        allow update, delete: if false;     // append-only
      }

      function eventoValido() {
        let d = request.resource.data;
        return d.em == request.time
          && d.tipo in ['member_added', 'member_removed', 'spin']
          && (d.tipo != 'member_added' || (d.nome is string && d.nome.size() <= 60))
          && (d.tipo != 'spin' || cooldownOk());
      }

      function cooldownOk() {
        let g = get(/databases/$(db)/documents/grupos/$(grupoId)).data;
        return g.ultimoGiroEm == null
          || request.time > g.ultimoGiroEm + duration.value(30, 's');
      }
    }
  }
}
```

**Atenção de custo:** cada `get()` dentro de uma rule conta como leitura na cota. O cooldown
custa 1 leitura por giro; leve isso no orçamento.

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
| 2. Motor por log, puro | ✅ `group-log.ts`, 23 testes |
| 2b. Guarda de uso, puro | ✅ `usage-guard.ts`, 19 testes |
| 3. Firestore + rules + emulador | ⛔ **bloqueado**: falta o projeto Firebase |
| 4. Interface do modo sincronizado | pendente |
| 5. Importar link antigo para grupo | pendente |

## Para destravar a fase 3

1. Criar um projeto Firebase **no plano Spark**, sem faturamento.
2. Criar um Firestore em modo produção.
3. Habilitar **Anonymous Authentication** (dá identidade estável por dispositivo e permite
   limitar por `uid` nas rules; não cria contas nem custa nada).
4. Registrar um app Web e passar a config (`apiKey`, `authDomain`, `projectId`, `appId`).
   Essa config **não é segredo** — a segurança vem das rules, não dela. Pode ir no repositório.
5. Autorizar `igorsolerc.github.io` nos domínios de Auth.
