/**
 * `aria-modal="true"` promete que o resto da página está inerte enquanto o diálogo existe.
 * Sem prender o Tab, a promessa é falsa: o foco sai por baixo do diálogo e vai passear numa
 * página que o leitor de tela já anunciou como indisponível — e não há como voltar a não ser
 * tabulando o documento inteiro.
 *
 * Vive fora dos componentes porque a máquina e a bancada de etiqueta fazem a mesma promessa.
 */
export function trapFocusWithin(document: Document, containerId: string, event: Event): void {
  const key = event as KeyboardEvent;
  const card = document.getElementById(containerId);
  if (!card) return;

  const focusable = [
    ...card.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]',
    ),
  ];
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (key.shiftKey && active === first) {
    key.preventDefault();
    last.focus();
  } else if (!key.shiftKey && active === last) {
    key.preventDefault();
    first.focus();
  }
}
