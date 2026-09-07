---
target: sistema de reação com emojis
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:D:\\Projetos\\Sorteador\\src\\app\\review-reactions.ts"
target_fingerprint: "sha256:7036050356be9282ac965209b73fcad98ef9eca20c77b7747ee01fbaff81f45b"
target_path: "D:\\Projetos\\Sorteador\\src\\app\\review-reactions.ts"
timestamp: 2026-09-07T13-50-57Z
slug: src-app-review-reactions-ts
---
# Crítica do sistema de reações com emojis

## Saúde de design

| # | Heurística | Nota | Principal questão |
|---|---|---:|---|
| 1 | Visibilidade do estado | 2 | A seleção fecha e salva, mas falta confirmação textual local durante a gravação. |
| 2 | Correspondência com o mundo real | 3 | “Reagir” é natural; alguns emojis continuam ambíguos sem nome visível. |
| 3 | Controle e liberdade | 4 | Reação reversível, fechamento externo e Esc com retorno de foco. |
| 4 | Consistência e padrões | 3 | O componente oferece 9 emojis, enquanto a documentação ainda descreve 12. |
| 5 | Prevenção de erros | 3 | Lista fechada e salvamento evitam duplicidade; a ambiguidade dos glifos permanece. |
| 6 | Reconhecimento em vez de memória | 2 | Os nomes existem para leitores de tela, mas não aparecem para quem usa toque. |
| 7 | Flexibilidade e eficiência | 3 | Clique, hover e teclado funcionam; Enter foca a primeira opção. |
| 8 | Estética minimalista | 3 | O estado compacto é bom; o popover tem peso vertical e sobreposição excessivos. |
| 9 | Recuperação de erros | 3 | Tocar novamente desfaz; falha assíncrona não tem recuperação explícita no componente. |
| 10 | Ajuda e documentação | 2 | A semântica acessível é boa, mas falta ajuda visual contextual. |
| **Total** |  | **28/40** | **Bom — base sólida, com ajustes de densidade e clareza.** |

## Veredito de especificidade

O estado compacto é autoral e coerente com a etiqueta de papel da Mesa do Mês. O seletor aberto perde parte dessa identidade e vira uma barra de emojis relativamente genérica. O detector retornou zero achados em `review-reactions.ts`; o desconforto com o padding é uma decisão de composição, não uma infração automática.

## Impressão geral

A divulgação progressiva é muito melhor do que uma fileira permanente. O maior ganho agora virá de tirar ar do popover sem sacrificar os alvos de toque. O gatilho compacto mede 44 px e tem zero padding vertical explícito. O popover usa 8,8 px em cima e embaixo: no desktop, seus 17,6 px externos representam 28,6% dos 61,58 px totais. Em 390 px, mede 109,58 px em duas linhas. Reduzir o invólucro para 4–6 px preserva os alvos de 44 × 44 px.

## O que funciona

- Divulgação progressiva: a resenha permanece protagonista até existir intenção de reagir.
- Fluxo acessível: Enter abre e foca; Esc fecha, atualiza o estado e devolve foco.
- Medidas sólidas: alvos 44 × 44 px, contraste 4,74:1 e 14,57:1, sem overflow horizontal em 1440, 900 e 390 px.

## Problemas prioritários

1. **[P2] Padding vertical forte no popover.** Reduzir o padding externo de 8,8 px para 4–6 px, mantendo os botões em 44 px; no gatilho, aliviar somente o cromo. Comando: `$impeccable layout`.
2. **[P2] O painel cobre o conteúdo que está sendo julgado.** No celular, 256 × 109,58 px cobrem cabeçalho e critérios. Preservar uma faixa legível ou revelar o painel como extensão do rodapé. Comando: `$impeccable layout`.
3. **[P2] Nove emojis sem nomes visíveis.** `title` não ajuda no toque; mostrar um nome contextual curto ao focar ou pressionar. Comando: `$impeccable clarify`.
4. **[P3] A segunda linha móvel parece sobra.** A composição 5 + 4 pede centralização e uma regra documentada. Comando: `$impeccable polish`.
5. **[P3] Hover abre durante leitura casual.** 140 ms é pouco para uma camada que cobre texto; aumentar a intenção ou usar hover só como antecipação. Comando: `$impeccable harden`.

## Personas

- **Sam:** foco e rótulos são fortes; falta confirmação anunciada após gravação ou falha.
- **Casey:** alvos adequados, mas o painel alto encobre contexto e nove glifos sem nomes geram hesitação.
- **Jordan:** “Reagir” é claro; o ponto da reação própria e emojis parecidos não são autoexplicativos.

## Observações menores

- O resumo de até três emojis mais a contagem é compacto e útil.
- Se a reação própria não estiver entre as três mais populares, o ponto não diz qual foi.
- O comentário “Quatro emoji” no SCSS e a antiga regra de 12 reações estão desatualizados.
- O popup permaneceu dentro do viewport e sem overflow nas três larguras medidas.

## Perguntas de projeto

- O seletor deve priorizar rapidez absoluta ou também ensinar o significado de cada reação?
- Ele precisa flutuar sobre a resenha ou deveria se revelar como extensão do cartão?
- Nove opções são necessárias ou quatro a seis reações mais distintas atenderiam melhor?
