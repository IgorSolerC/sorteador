---
version: 1
slug: "src-app-group-history-html"
primary_target: "src/app/group-history.html"
related_targets: ["src/app/group-history.ts","src/app/note-editor.html","src/styles.scss"]
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
- **A bancada de etiqueta é a mesma da máquina** (`app-note-editor`). Se ela divergir entre as
  duas páginas, alguém vai reescrever o mesmo formulário duas vezes.

## Armadilhas já encontradas aqui

- `.album-serial` já colidiu com o nome da grade de estatísticas; o bloco de números é
  `.album-stats`. Nomes de classe do álbum precisam ser conferidos contra os dois arquivos.
- Um grupo que falha ao carregar rendia página em branco, porque tudo vivia dentro do ramo
  `@else if (snapshot())`. O ramo `@else` com o recado é obrigatório.
- Quatro valores de série em colunas automáticas viram 3 + 1 órfão. O bloco é 2×2.

## Provas

`src/app/group-history.spec.ts` (14 casos) e `npm run test:etiqueta` cobrem ordem, filtro,
estado vazio, erro de carga e o ciclo de etiqueta ponta a ponta.
