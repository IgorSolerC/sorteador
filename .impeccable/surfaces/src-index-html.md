---
version: 1
slug: "src-index-html"
primary_target: "src/index.html"
related_targets: ["src/app/app.html","src/app/app.ts","src/styles.scss"]
---

## Scope and mode

Single-page Angular experience at `src/index.html`. Visitor mode: Operate.

## Audience, job, action, and constraints

Um clube de jogos confere quem escolhe o jogo do mês; uma pessoa administra a lista e a data de início. A ação principal é assistir (ou repetir) a entrega da cápsula já calculada e entender a posição no ciclo. A lista fica local salvo quando compartilhada pelo fragmento do link. Entrega estática no GitHub Pages, sem API, responsiva, acessível por teclado, respeitando movimento reduzido.

## Chosen direction and memorable moment

Máquina de cápsulas (gashapon): esmalte azul-noite, aro cromado canelado, globo de acrílico e cartela impressa em papel quente. Cada participante é uma cápsula com o nome acompanhando a curva do aro; a manivela gira, a cápsula do mês encaixa na calha, cai na bandeja e abre. A cor da cápsula vencedora inunda o fundo. A lógica de completar a coleção carrega a regra de não repetir, o que mantém o mundo honesto sobre um resultado determinístico.

## Unresolved decision

- Atualizações de participantes entre navegadores exigem recompartilhar o link, porque o GitHub Pages não tem persistência compartilhada.
- O layout estreito foi validado a 500px: o Chrome headless desta máquina impõe viewport mínimo de ~500 CSS px, então 390px não pôde ser capturado. `.machine-plate` está oculta abaixo de 620px por precaução, sem verificação a 390px.
