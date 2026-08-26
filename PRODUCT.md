# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Angular, com build estatico preparado para publicacao gratuita no GitHub Pages.

## Users

Um clube de jogos escolhe mensalmente a pessoa que define qual jogo o grupo vai jogar. Uma pessoa administra a lista e a data de início; as demais entram para conferir o resultado.

## Product Purpose

Escolher de modo transparente e reproduzível a pessoa responsável pelo jogo mensal do clube, garantindo que ninguém volte a decidir antes que todos tenham assumido esse papel.

## Positioning

O vencedor não depende de um servidor nem de um clique arbitrário: ele é derivado deterministicamente do mês, ano e conjunto de participantes. A roleta revela um resultado que já pode ser reproduzido por qualquer visitante com os mesmos dados.

## Operating Context

- Um sorteio é válido por mês civil.
- Em toda entrada ou recarregamento no mês, a interface encena o sorteio na roleta e termina na pessoa já calculada.
- A animação não altera o resultado: ela sempre revela a mesma pessoa para a mesma lista, mês e ano.
- Cada rodada tem um mês de início configurável. Meses anteriores a ele não produzem resultado nem histórico.
- A lista pode ser administrada na propria interface e fica persistida no navegador.

## Capabilities and Constraints

- Adicionar e remover participantes.
- Calcular o resultado a partir de mês, ano, mês de início e lista normalizada de participantes.
- Formar ciclos determinísticos para evitar repetições até todos terem vencido.
- Persistir participantes e mês de início no `localStorage`, sem memorizar se a roleta já foi assistida.
- Incluir participantes e mês de início no fragmento do link compartilhável.
- Funcionar sem API, conta, banco de dados ou custo de hospedagem.
- GitHub Pages não sincroniza alterações de participantes entre navegadores; visitantes só reproduzem o mesmo resultado quando usam a mesma lista.
- Nomes duplicados, vazios ou compostos apenas por espaços não são aceitos.

## Evidence on Hand

Não há marca, logotipo, imagens, depoimentos ou dados reais fornecidos. A interface deve usar exemplos claramente identificáveis e não inventar alegações.

## Product Principles

- O resultado deve ser reproduzível e explicável.
- A regra de não repetição deve ser garantida pelo algoritmo, não apenas pelo histórico local.
- A revelacao deve ser especial em toda visita, sem comprometer a previsibilidade do resultado.
- A administracao deve ser simples e segura em telas pequenas.
- A experiencia principal deve continuar funcional sem rede depois do primeiro carregamento.

## Accessibility & Inclusion

Respeitar preferências de movimento reduzido, navegação por teclado, contraste legível e mensagens que não dependam apenas de cor.
