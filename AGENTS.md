# Instruções para agentes

**Leia [README.md](README.md) inteiro antes de tocar em qualquer arquivo.** A seção
"Como a AI deve se comportar aqui" é obrigatória, não sugestão. As três que mais se quebram
por pressa:

1. **Front-end passa pela skill `impeccable`, sempre e por inteiro** — inclusive quando a
   mudança parece trivial.
2. **Back-end só está pronto com a suíte inteira verde**, e todo bug corrigido ganha um
   teste que falha sem a correção.
3. **Meça em vez de presumir.** Afirmação de desempenho, contraste ou acessibilidade vem
   com número.

O contexto de longo prazo está em [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md),
[FIREBASE.md](FIREBASE.md) e [HANDOFF.md](HANDOFF.md). O HANDOFF lista as invariantes que
reescrevem o passado de quem usa o app se forem quebradas, e as armadilhas que já custaram
tempo a alguém.
