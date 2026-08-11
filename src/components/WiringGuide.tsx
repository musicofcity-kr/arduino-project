import type { StudentExperiment } from './types';

export function WiringGuide({ experiment }: { experiment: StudentExperiment }) {
  return (
    <section className="wiring-guide" aria-labelledby="wiring-title">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">선택한 센서 · {experiment.sensorName}</p>
          <h2 id="wiring-title">선을 같은 줄끼리 연결해요</h2>
        </div>
        <span className="power-off-badge">USB 분리</span>
      </div>
      <div className="wiring-board" role="img" aria-label={`${experiment.sensorName}와 Arduino UNO 배선표`}>
        <div className="board-label sensor-label">센서</div>
        <div className="board-label uno-label">Arduino UNO</div>
        {experiment.wiring.map((wire, index) => (
          <div className={`wire-row wire-${index + 1}`} key={`${wire.sensorPin}-${wire.unoPin}`}>
            <span className="pin pin-sensor">{wire.sensorPin}</span>
            <span className="wire-line" aria-hidden="true"><i /></span>
            <span className="pin pin-uno">{wire.unoPin}</span>
            {wire.note && <small>{wire.note}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}
