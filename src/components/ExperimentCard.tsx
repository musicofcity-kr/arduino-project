import type { StudentExperiment } from './types';

interface ExperimentCardProps {
  experiment: StudentExperiment;
  selected: boolean;
  onSelect: (experiment: StudentExperiment) => void;
}

export function ExperimentCard({ experiment, selected, onSelect }: ExperimentCardProps) {
  return (
    <button
      type="button"
      className={`experiment-card accent-${experiment.accent}${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(experiment)}
      aria-pressed={selected}
      aria-label={`${experiment.title} 선택. ${experiment.question}`}
    >
      <span className="experiment-icon" aria-hidden="true">{experiment.icon}</span>
      <span className="experiment-copy">
        <span className="eyebrow">{experiment.sensorName}</span>
        <strong>{experiment.title}</strong>
        <span>{experiment.question}</span>
        {experiment.draft && <span className="source-badge source-demo">공식 코드 검토 중 (draft)</span>}
      </span>
      <span className="select-label" aria-hidden="true">{selected ? '선택됨' : '선택하기'} →</span>
    </button>
  );
}
