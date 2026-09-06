import { BASE_CRITERIA, REVIEW_CRITERION_LABELS, SpinRecord, criterionText, formatHours, formatScore, scoreTone, spinScores } from './group-log';
import type { AlbumSort } from './group-history';

/**
 * Tela e impressão precisam contar a mesma história quando a ordem muda.
 * As medidas da platina continuam na ficha: o resumo compara os critérios de todos.
 */
export function albumMetrics(spin: SpinRecord, sort: AlbumSort) {
  const conta = spinScores(spin);
  const medidas = [
    { key: 'nota', label: 'Nota do clube', value: conta.score === null ? '—' : formatScore(conta.score), tone: scoreTone(conta.score) },
    ...BASE_CRITERIA.map((key) => ({
      key, label: REVIEW_CRITERION_LABELS[key],
      value: conta.criteria[key] ? criterionText(key, conta.criteria[key]!.average, true) : '—',
      tone: 'mid' as const,
    })),
    { key: 'tempo', label: 'Tempo de jogo', value: conta.hours ? formatHours(conta.hours.average) : '—', tone: 'mid' as const },
  ];
  const hero = medidas.find((medida) => medida.key === (sort === 'rodada' ? 'nota' : sort))!;
  return { hero, secondary: medidas.filter((medida) => medida !== hero && medida.value !== '—') };
}
