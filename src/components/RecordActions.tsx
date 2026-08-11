interface RecordActionsProps {
  canSave: boolean;
  hasSavedRecords: boolean;
  busy: boolean;
  status: string;
  onSave: () => void;
  onDownload: () => void;
}

export function RecordActions({ canSave, hasSavedRecords, busy, status, onSave, onDownload }: RecordActionsProps) {
  return (
    <section className="record-actions" aria-labelledby="record-actions-title">
      <div>
        <p className="eyebrow">비식별 로컬 기록</p>
        <h2 id="record-actions-title">현재 결과를 저장할까요?</h2>
        <p>이름이나 학번 없이 이 브라우저 세션의 센서값과 계산 근거만 저장합니다.</p>
      </div>
      <div className="record-buttons">
        <button type="button" className="button button-primary" disabled={!canSave || busy} onClick={onSave}>현재 결과 저장</button>
        <button type="button" className="button button-secondary" disabled={!hasSavedRecords || busy} onClick={onDownload}>저장 기록 CSV 받기</button>
      </div>
      {!canSave && <p className="record-explanation">실측 또는 그 실측값으로 계산한 최신 결과가 있어야 저장할 수 있어요. 데모·시뮬레이션 값은 저장되지 않습니다.</p>}
      {status && <p className="record-status" role="status" aria-live="polite">{status}</p>}
    </section>
  );
}
