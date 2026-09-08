---
version: 1
slug: "src-app-group-history-html"
primary_target: "src/app/group-history.html"
related_targets: ["src/app/group-history.ts","src/app/game-sheet.html","src/app/group-history.scss","src/styles.scss"]
---

# Superfície: o álbum do grupo

**Rota:** `#/g/<id>/album` · **Modo:** Operate

Quem abre o álbum quer duas coisas: lembrar o que o clube jogou e registrar o que faltou
registrar. Não é uma vitrine — é a estante do clube, e a tarefa é encontrar uma cápsula e
etiquetá-la. Por isso a ordem é da mais nova para a mais antiga, o filtro por pessoa existe,
e o cartão inteiro é o controle.

## Decisões que não devem ser revertidas sem motivo

- **O papel são os objetos, não o fundo.** A parede é esmalte; os cartões é que são papel.
  Transformar o fundo em papel quebra a Regra da Única Quebra e faz a página deixar de ser a
  mesma máquina.
- **A inclinação é fixa por posição do giro**, nunca aleatória: a parede tem que estar igual
  na próxima visita. Mesma razão das cápsulas soltas dentro do globo.
- **O hover endireita o cartão.** É o gesto que o usuário nomeou como o que gostou — parecer
  etiqueta de verdade. Trocar por escala ou sombra sozinha perde o gesto.
- **A cor de uma pessoa é a da primeira cápsula dela**, não a do giro que se está desenhando.
  Sem isso a mesma pessoa muda de cor entre dois cartões e a coleção deixa de ler como coleção.
- **A ficha do jogo é a mesma da máquina** (`app-game-sheet`, em `src/app/game-sheet.html`).
  Se ela divergir entre as duas páginas, alguém vai reescrever o mesmo formulário duas vezes.
  O antigo `note-editor` não existe mais; a ficha o substituiu com quatro faces.

## Armadilhas já encontradas aqui

- `.album-serial` já colidiu com o nome da grade de estatísticas; o bloco de números é
  `.album-stats`. Nomes de classe do álbum precisam ser conferidos contra os dois arquivos.
- Um grupo que falha ao carregar rendia página em branco, porque tudo vivia dentro do ramo
  `@else if (snapshot())`. O ramo `@else` com o recado é obrigatório.
- Valores de série em colunas automáticas viram uma fileira órfã. `.album-stats` trava em
  **duas colunas** em qualquer largura, e hoje carrega seis valores.

## Provas

`src/app/group-history.spec.ts` e `npm run test:etiqueta` cobrem ordem, filtro, estado
vazio, erro de carga, o lacre na parede e o ciclo de etiqueta ponta a ponta.
`node tests/e2e-acabamento.mjs` cobre o PNG do álbum e o seletor de reações.
