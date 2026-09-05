# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Angular, com build estatico preparado para publicacao gratuita no GitHub Pages.

## Users

Um clube de jogos escolhe a pessoa que define qual jogo o grupo vai jogar. Todos usam o mesmo link e todos podem girar; quem gira, quem entra, quem sai e quem escreve a resenha ficam no registro com o próprio nome.

## Product Purpose

Escolher de modo transparente e irreversível a pessoa responsável pelo jogo da vez, garantindo que ninguém volte a decidir antes que todos tenham assumido esse papel — e guardar o que o clube jogou em cada rodada.

## Positioning

O vencedor não depende de um clique arbitrário nem de um campo que alguém possa reescrever: ele é derivado do log de eventos, e a única entrada imprevisível é o carimbo de hora do servidor, que o cliente não escolhe. Qualquer pessoa com o link reproduz o mesmo resultado a partir do mesmo log.

## Operating Context

- Um grupo é um link. Quem tem o link lê e escreve; não há conta, senha nem convite.
- Antes de qualquer coisa, a pessoa diz quem é. O nome fica só no aparelho dela e acompanha tudo que ela fizer no registro.
- Uma rodada termina quando todos saíram; a seguinte abre com o globo cheio de novo.
- Girar é gravar. O giro fica no registro com a hora do servidor e não pode ser desfeito, e há uma espera de 30 segundos entre giros, imposta pelas rules.
- Abrir a página encena a entrega de novo, e clicar no globo a encena outra vez. A encenação nunca altera o resultado — ela sai do mesmo registro e para na mesma cápsula.

## Compatibility Commitment

O modo por link estático foi removido em setembro de 2026, a pedido: o sorteio mensal determinístico que vivia dentro do próprio endereço (`#grupo=<base64url>&inicio=AAAA-MM`) não existe mais, e os links daquele formato caem na prateleira inicial. Dois produtos com regras diferentes na mesma página custavam duas explicações a cada tela, e o que ficou faz tudo que o outro fazia sem exigir um link novo a cada pessoa que entra.

O que continua sendo contrato:

- **A rota `#/g/<id>` e `#/g/<id>/album`.** Um link de grupo em circulação tem que continuar abrindo o mesmo grupo.
- **A normalização de nomes**, inclusive suas asperezas: `josé silva` e `jose silva` são chaves distintas. Ela decide a identidade de um membro (`memberId`), e mudá-la reescreveria o histórico de quem já está num grupo.
- **O log é append-only.** Nenhum evento é reescrito ou apagado, e nenhum estado derivado é gravado. Um campo de vencedor gravável seria um vencedor forjável.
- **A paleta só cresce pelo fim.** A cor de uma pessoa é guardada como posição na paleta; reordenar `CAPSULE_COLORS` repintaria todo mundo de um grupo em uso.

## Capabilities and Constraints

- Pedir o nome de quem está usando antes de abrir qualquer rota, e trocá-lo a um clique.
- Guardar, só no aparelho, as máquinas que ele já abriu, para voltar a elas sem procurar o link.
- Montar um grupo novo, já entrando quem montou como a primeira cápsula.
- Adicionar e remover participantes numa gaveta, sem que a administração ocupe a página.
- Escolher a cor de cada pessoa numa roda de 24, e um emoji que sai como confete quando a
  cápsula dela cai. A cor identifica a pessoa no globo, no registro e no álbum inteiro, e
  continua sendo dela depois que ela sai do grupo.
- Girar, com confirmação, e ver a entrega encenada. Reencená-la a qualquer momento clicando
  no globo, sem que isso grave nada nem mude o resultado.
- Escrever o **jogo** de qualquer giro — o de agora ou um de um ano atrás — com nome e
  descrição. O jogo é de todo mundo: quem tem o link escreve e reescreve, e o rastro de quem
  escreveu fica. Ele descreve o giro e nunca altera o resultado.
- Escrever uma **resenha por pessoa** sobre esse jogo, com nota final (0 a 10) e completude
  (platinado, finalizado, incompleto) obrigatórias, e — se ela quiser — tempo de jogo em
  horas, notas de diversão, história, qualidade e jogabilidade, um grau de dificuldade entre
  cinco degraus com nome, e texto livre. Reescrever é gravar outra; retirar é gravar a
  retirada. Todas as versões continuam no registro.
- Perguntar mais duas coisas a **quem platinou**, e só a ela: a **diversão da platina**, de
  0 a 10, e a **dificuldade de platinar**, nos mesmos cinco degraus com nome da dificuldade
  do jogo. As duas são opcionais como as outras escalas, e pendem do status: quem reescreve a
  resenha como finalizada deixa de tê-las, na tela e na conta.
- **Oferecer as cápsulas do grupo na porta**, quando alguém abre o link de um grupo sem
  crachá: tocar numa delas entra com o nome exato do globo. Digitar continua existindo, como
  caminho secundário, para quem ainda não está na lista.
- **Reagir à resenha de outra pessoa** com um de quatro emoji — 😯 🔥 😭 😂 — e desfazer a
  própria reação. A lista é fechada; um campo livre viraria uma segunda caixa de texto.
- **Avisar o que esta pessoa deve**: quantos jogos ela jogou (está na mesa) e ainda não
  resenhou, com o atalho para escrever o mais recente.
- **Modo cego**, opcional e por aparelho: a nota do clube fica lacrada nos jogos que esta
  pessoa jogou e ainda não resenhou, para que a nota dela não nasça ancorada na do clube.
- **Som da máquina**, opcional e por aparelho, sintetizado: só toca quando houve um gesto.
- **Salvar o álbum como imagem**, com o que está na tela. **O link do grupo não vai nela**:
  ele é a credencial, e uma imagem compartilhada é pública para sempre.
- Mostrar a conta do clube sobre um jogo — nota média, média de cada critério, tempo médio e
  a porcentagem de platinado, finalizado e incompleto. **Nada disso é gravado**: é recontado
  a partir das resenhas toda vez que a página abre. As duas médias da platina aparecem na
  ficha do jogo, e ficam de fora do resumo do cartão do álbum de propósito.
- Corrigir a **mesa** de um giro: quem realmente jogou aquele jogo. Ela começa igual ao globo
  do dia e aceita quem entrou no clube depois, ou perde quem não apareceu. É o denominador de
  "X resenhas de Y", e quem jogou e ainda não escreveu conta como incompleto. **Corrigir a
  mesa nunca toca no sorteio**: o globo daquele giro é imutável, e é dele que o vencedor sai.
- Reunir num álbum todas as cápsulas já entregues por um grupo, agrupadas por rodada e
  filtráveis por pessoa, com o boletim de cada uma — e reordená-lo por nota do clube, por
  qualquer critério ou por tempo de jogo, quando a pergunta é comparar jogos de meses
  diferentes em vez de ler a linha do tempo.
- Funcionar sem conta, sem senha e sem custo de hospedagem, no plano gratuito do Firebase,
  com um guarda de uso por aparelho que para a máquina antes de a cota chegar perto da parede.
- Nomes duplicados, vazios ou compostos apenas por espaços não são aceitos.
- O link é a credencial: quem o tem, lê e escreve. Não há permissão por pessoa.

## Evidence on Hand

Não há marca, logotipo, imagens, depoimentos ou dados reais fornecidos. A interface deve usar exemplos claramente identificáveis e não inventar alegações.

## Product Principles

- O resultado deve ser reproduzível e explicável a partir do registro, nunca lido de um campo.
- A regra de não repetição deve ser garantida pelo replay do log, não pelo histórico local.
- A revelação deve ser especial em toda visita, sem comprometer a previsibilidade do resultado:
  encenar não é decidir.
- Quem faz algo assina o que fez. Um registro anônimo não conta história ao clube.
- A administração é uma tarefa ocasional e não deve ocupar a página que se visita todo dia.
- A identidade visual de uma pessoa pertence a ela, e é a mesma em toda parte do produto.
- Toda conta do clube é derivada do registro e recontada na tela. Um número gravável é um
  número que alguém escreve à mão.
- Quem descreve o jogo não decide nada: jogo, resenha e mesa descrevem um giro e nunca
  entram nele.

## Accessibility & Inclusion

Respeitar preferências de movimento reduzido, navegação por teclado, contraste legível e mensagens que não dependam apenas de cor.
