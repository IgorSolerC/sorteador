# Mesa do Mês

Aplicação Angular para escolher quem define o jogo da vez de um clube — e para guardar o que
o clube jogou. Hospedada de graça no GitHub Pages, com Firestore no plano gratuito.

## Como funciona

Um **grupo é um link**. Quem tem o link entra, gira, mexe na lista e escreve as resenhas; não
há conta, senha nem convite. Antes de qualquer coisa o app pergunta **quem é você** — o nome
fica só no seu aparelho e acompanha tudo que você fizer no registro do grupo.

Cada pessoa é uma **cápsula**, com uma cor escolhida numa roda de 24 e um emoji que sai como
confete quando ela é sorteada. Uma rodada termina quando todos saíram; a próxima abre com o
globo cheio de novo.

O vencedor **não é lido de um campo**: ele é derivado de um log de eventos que ninguém pode
reescrever nem apagar, e a única entrada imprevisível é o carimbo de hora do servidor, que o
cliente não escolhe. Abrir a página encena a entrega de novo, e clicar no globo a encena
outra vez — sempre parando na mesma cápsula, porque encenar não é decidir.

Ver [FIREBASE.md](FIREBASE.md) para o modelo de dados, as rules e o custo por operação.

> Não foi criado para loterias, premiações financeiras ou contextos que exijam aleatoriedade
> criptográfica auditada.

## Rotas

| Rota | O que é |
|---|---|
| `/` | A prateleira: as máquinas que este aparelho já abriu |
| `#/novo` | A oficina: montar uma máquina nova |
| `#/g/<id>` | A máquina de um grupo, com o registro dos giros |
| `#/g/<id>/album` | O álbum: a parede de todas as cápsulas que já saíram |

O modo por link estático — o sorteio mensal que vivia dentro do próprio endereço
(`#grupo=...&inicio=...`) — **foi removido em setembro de 2026**. Links daquele formato caem
na prateleira inicial.

## Etiquetas

Qualquer giro — o de agora ou o de um ano atrás — recebe **título**, **subtítulo** e
**descrição** do que o clube jogou. Onde só cabe uma linha, os dois primeiros viram
`Click The Button! ● Nota 8/10`.

Editar é gravar outra etiqueta: o replay faz a última valer, e as anteriores continuam no
registro com quem escreveu cada uma. A etiqueta descreve o giro e nunca altera o vencedor.

## Executar localmente

Requisitos: Node.js 22.12 ou superior.

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

Para trabalhar contra o emulador em vez da produção, suba o emulador, semeie um grupo e abra
com `?emu=1`:

```bash
npx firebase emulators:start --only firestore,auth --project sorteador-ed1c9
npm run build:testjs && node tests/seed-emulator.mjs
# http://localhost:4200/?emu=1#/g/demo
```

## Testar e compilar

```bash
npm test -- --watch=false   # 232 unitários e de componente
npm run test:rules          # 75 rules no emulador, sem projeto nem rede
npm run test:store          # 28 de integração da camada de dados
npm run test:a11y           # 8 telas x 3 larguras, contra o servidor local
npm run test:etiqueta       # 35 verificações de ponta a ponta num navegador real
npm run build -- --base-href=./
```

O build estático fica em `dist/sorteador/browser`.

As suítes que precisam de emulador (`test:rules`, `test:store`) sobem o seu próprio e liberam
as portas antes; as que dirigem um navegador (`test:a11y`, `test:etiqueta`) esperam o
`npm start` e o emulador já rodando.

## Publicar no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica
automaticamente os commits enviados à branch `main`.

No GitHub, abra **Settings → Pages → Build and deployment** e selecione **GitHub Actions**
como fonte.

**As rules vão antes do site.** Publicar o site primeiro entrega a todo mundo uma interface
cujas escritas as rules antigas recusam:

```bash
npx firebase deploy --only firestore:rules --project sorteador-ed1c9
```

## O que fica no seu aparelho

- **Seu nome**, que assina o que você faz no registro. Não é uma conta e não tem senha.
- **As máquinas que você abriu**, para voltar a elas sem procurar o link. A lista não dá
  acesso a nada: quem abre uma máquina é o link.
- **Uma cópia do log** de cada grupo, para que abrir custe 1 leitura em vez de N.

Nada disso sai do aparelho por outro caminho, e o servidor não sabe que essas listas existem.
