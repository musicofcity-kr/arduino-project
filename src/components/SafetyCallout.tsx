import type { StudentExperiment } from './types';
import { Zap } from 'lucide-react';

interface SafetyCalloutProps {
  experiment: StudentExperiment;
}

export function SafetyCallout({ experiment }: SafetyCalloutProps) {
  return (
    <aside className="safety-callout" aria-labelledby="safety-title">
      <div className="safety-heading">
        <span aria-hidden="true"><Zap size={20} /></span>
        <div>
          <p className="eyebrow">연결 전 20초 안전 확인</p>
          <h3 id="safety-title">USB를 뽑은 상태에서 배선하세요</h3>
        </div>
      </div>
      <ul>
        <li>젖은 손, 액체가 있는 책상, 손상된 케이블에서는 사용하지 않아요.</li>
        <li>센서 전원 핀을 먼저 확인하고, 배선을 바꿀 때마다 UNO의 USB를 뽑아요.</li>
        {experiment.safety.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="stop-rule"><strong>열·탄 냄새·연기가 나면:</strong> 만지지 말고 USB를 뽑은 뒤 선생님에게 알려요.</p>
    </aside>
  );
}
