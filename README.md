# Mesa do Mês

Aplicação Angular para escolher de forma determinística quem define o jogo mensal de um clube. Pode ser hospedada gratuitamente no GitHub Pages e não usa API.

## Como o sorteio funciona

1. Os nomes são normalizados, deduplicados e ordenados.
2. A lista completa e o índice do ciclo alimentam uma função hash estável.
3. Essa semente embaralha os participantes de forma determinística.
4. O mês, o ano e a data de início definem a posição ocupada dentro do ciclo.

Com a lista inalterada, cada participante vence exatamente uma vez por ciclo. A mesma lista, o mesmo mês e o mesmo ano sempre geram o mesmo vencedor, independentemente da ordem em que os nomes foram adicionados.

Alterar a lista cria uma nova edição do sorteio. O algoritmo é reproduzível, mas não foi criado para loterias, premiações financeiras ou contextos que exijam aleatoriedade criptográfica auditada.

## Executar localmente

Requisitos: Node.js 22.12 ou superior.

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

## Testar e compilar

```bash
npm test -- --watch=false
npm run build -- --base-href=./
```

O build estático fica em `dist/sorteador/browser`.

## Publicar no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica automaticamente os commits enviados à branch `main`.

No GitHub, abra **Settings → Pages → Build and deployment** e selecione **GitHub Actions** como fonte. Depois envie o projeto para a branch `main`.

## Grupo sincronizado, etiquetas e álbum

Além do modo por link, há o **grupo sincronizado** (`#/g/<id>`), que guarda os giros num log
append-only no Firestore. Ver [FIREBASE.md](FIREBASE.md).

- **Etiqueta.** Qualquer giro — o de agora ou o de um ano atrás — recebe um **título** e uma
  **descrição** do que o clube jogou: `Click The Button!` / `Nota final 8/10`. A etiqueta
  descreve o giro e nunca altera o vencedor.
- **Reescrever, nunca apagar.** Editar é gravar outra etiqueta; o replay faz a última valer e
  as anteriores continuam no registro, com quem escreveu cada uma.
- **O álbum** (`#/g/<id>/album`) é a parede de todas as cápsulas que já saíram, agrupadas por
  rodada e filtráveis por pessoa. Dá para etiquetar por lá também.

## Persistência e compartilhamento

- A lista editada e a data de início ficam no `localStorage` daquele navegador.
- A roleta é encenada a cada abertura ou recarregamento, sempre revelando a mesma pessoa para a mesma lista, mês e ano.
- O botão **Copiar link do grupo** inclui a lista de participantes e a data de início no fragmento do endereço (`#grupo=...&inicio=AAAA-MM`). O fragmento não é enviado ao servidor, e todos que abrirem o mesmo link calcularão a mesma edição e não verão meses anteriores à data configurada.
- Depois de adicionar ou remover alguém, gere e compartilhe um novo link.

Nenhum nome é enviado para uma API.
