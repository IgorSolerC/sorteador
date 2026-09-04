/**
 * As máquinas que este aparelho já abriu.
 *
 * O link continua sendo a credencial e o único jeito de entrar num grupo — isto aqui não
 * dá acesso a nada, só evita que quem já entrou uma vez precise caçar a mensagem no
 * WhatsApp para voltar. Fica no `localStorage` e nunca sai deste aparelho; o servidor não
 * sabe que esta lista existe, e nem poderia: listar grupos é proibido nas rules, senão o
 * link deixaria de ser segredo.
 */

const KEY = 'mesa-do-mes:maquinas:v1';
const LIMIT = 12;

export interface RecentGroup {
  readonly id: string;
  readonly name: string;
  /** Quando este aparelho abriu a máquina pela última vez. */
  readonly at: number;
}

export function rememberGroup(id: string, name: string): void {
  if (!id) return;
  const kept = listGroups().filter((group) => group.id !== id);
  write([{ id, name, at: Date.now() }, ...kept].slice(0, LIMIT));
}

export function forgetGroup(id: string): void {
  write(listGroups().filter((group) => group.id !== id));
}

/** Da mais recente para a mais antiga. */
export function listGroups(): RecentGroup[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isGroup)
      .sort((a, b) => b.at - a.at)
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

function isGroup(value: unknown): value is RecentGroup {
  const group = value as RecentGroup | null;
  return !!group &&
    typeof group.id === 'string' && group.id.length > 0 && group.id.length <= 64 &&
    typeof group.name === 'string' &&
    typeof group.at === 'number';
}

function write(groups: readonly RecentGroup[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(groups));
  } catch {
    // Sem armazenamento, a porta abre sem atalhos. O link nunca deixou de funcionar.
  }
}
