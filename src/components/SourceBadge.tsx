import type { SourceKind } from './types';

const sourceLabels: Record<SourceKind, string> = {
  real: '실측 · 센서에서 받음',
  derived: '계산 · 실측값으로 계산',
  simulation: '시뮬레이션 · 모델 결과',
  demo: '데모 · 예시 데이터',
  none: '측정 전',
};

export function SourceBadge({ source, compact = false }: { source: SourceKind; compact?: boolean }) {
  return (
    <span className={`source-badge source-${source}${compact ? ' is-compact' : ''}`}>
      <span className="source-dot" aria-hidden="true" />
      {compact && source !== 'none' ? sourceLabels[source].split(' · ')[0] : sourceLabels[source]}
    </span>
  );
}
