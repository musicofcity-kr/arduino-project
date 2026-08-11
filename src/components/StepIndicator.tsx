interface StepIndicatorProps {
  current: 1 | 2 | 3;
}

const steps = ['탐구 선택', '센서 연결', '바로 측정'];

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <nav className="step-nav" aria-label="탐구 진행 단계">
      <ol>
        {steps.map((step, index) => {
          const number = (index + 1) as 1 | 2 | 3;
          const state = number < current ? 'done' : number === current ? 'current' : 'upcoming';
          return (
            <li key={step} className={`step-item step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="step-number" aria-hidden="true">{state === 'done' ? '✓' : number}</span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
