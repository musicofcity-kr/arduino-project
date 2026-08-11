import type { ConnectionState, StudentExperiment } from './types';

interface ConnectionPanelProps {
  experiment: StudentExperiment;
  state: ConnectionState;
  message: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

const labels: Record<ConnectionState, string> = {
  idle: '센서 연결 전',
  requesting: '기기 선택 중',
  checking: 'UNO 응답 확인 중',
  ready: '센서 준비 완료',
  measuring: '측정 중',
  error: '연결 확인 필요',
  unsupported: '브라우저 확인 필요',
};

export function ConnectionPanel({ experiment, state, message, onConnect, onDisconnect }: ConnectionPanelProps) {
  const busy = state === 'requesting' || state === 'checking';
  const connected = state === 'ready' || state === 'measuring';
  return (
    <section className="connection-panel" aria-labelledby="connection-title">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">2단계</p>
          <h2 id="connection-title">USB를 꽂고 센서를 연결해요</h2>
        </div>
        <span className={`connection-chip state-${state}`} role="status" aria-live="polite">{labels[state]}</span>
      </div>
      <p className={`connection-message ${state === 'error' || state === 'unsupported' ? 'is-error' : ''}`}>{message}</p>
      {connected ? (
        <button className="button button-secondary" type="button" onClick={onDisconnect}>연결 해제</button>
      ) : (
        <button className="button button-primary connect-button" type="button" onClick={onConnect} disabled={busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : <span aria-hidden="true">●</span>}
          {busy ? 'UNO 응답을 확인하고 있어요' : `${experiment.sensorName} 연결하기`}
        </button>
      )}
      <div className="recovery-guide">
        <details>
          <summary>연결이 안 되나요?</summary>
          <ol>
            <li><strong>기기가 안 보임:</strong> USB 데이터 케이블인지 확인하고 다시 꽂아요.</li>
            <li><strong>응답 시간 초과:</strong> UNO의 RESET 버튼을 한 번 누른 뒤 다시 연결해요.</li>
            <li><strong>센서값이 안 옴:</strong> USB를 뽑고 위 배선표와 전원 핀을 다시 확인해요.</li>
            <li><strong>계속 실패함:</strong> 다른 창의 센서 프로그램을 닫고 선생님에게 알려요.</li>
          </ol>
        </details>
      </div>
    </section>
  );
}
