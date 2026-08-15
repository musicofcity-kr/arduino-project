import type { StudentExperiment } from './types';
import { ArrowRight, Leaf, Ruler, ThermometerSun } from 'lucide-react';
import lessonChemistry from '../assets/dashboard/lesson-chemistry.jpg';
import lessonLight from '../assets/dashboard/lesson-light.jpg';
import lessonMotion from '../assets/dashboard/lesson-motion.jpg';

interface ExperimentCardProps {
  experiment: StudentExperiment;
  selected: boolean;
  disabled?: boolean;
  onSelect: (experiment: StudentExperiment) => void;
}

export function ExperimentCard({ experiment, selected, disabled = false, onSelect }: ExperimentCardProps) {
  const presentation = experiment.sensorId === 'dht11'
    ? { image: lessonChemistry, Icon: ThermometerSun, label: '기상·환경' }
    : experiment.sensorId === 'hc-sr04'
      ? { image: lessonMotion, Icon: Ruler, label: '힘과 운동' }
      : { image: lessonLight, Icon: Leaf, label: '빛과 생명' };
  const { Icon } = presentation;

  return (
    <button
      type="button"
      className={`experiment-card accent-${experiment.accent}${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(experiment)}
      aria-pressed={selected}
      aria-label={`${experiment.title} 선택. ${experiment.question}`}
      disabled={disabled}
      title={disabled ? '연결 확인 또는 측정을 마친 뒤 센서를 바꿀 수 있어요.' : undefined}
    >
      <span className="experiment-thumb" aria-hidden="true">
        <img src={presentation.image} alt="" />
        <span className="experiment-category"><Icon size={12} /> {presentation.label}</span>
      </span>
      <span className="experiment-copy">
        <strong>{experiment.title}</strong>
        <span>{experiment.question}</span>
        {experiment.draft && <span className="source-badge source-demo">공식 코드 검토 중 (draft)</span>}
      </span>
      <span className="select-label" aria-hidden="true">
        {selected ? '선택됨' : '선택하기'} <ArrowRight size={13} />
      </span>
    </button>
  );
}
