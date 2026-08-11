---
document: MIGRATION
version: 5.0.0
targets: v1 (Selective), v3, v4 → v5.0.0
---

# 이관 절차 (단일 문서)

v4까지는 버전별 마이그레이션 문서를 따로 두었고, 그중 하나가 낡은 채 남아 **문서를 따르면 검증기가 실패하는** 상태가 됐다. v5는 이관 문서를 이 파일 하나로 통합하고, 문서와 코드의 어긋남을 `tools/selftest.py`의 P01·P02가 기계로 감시한다.

---

## A. v4 → v5 (STATE·SPEC·NODE_RESULT 수정 필요)

### 1. `STATE.md`

```yaml
package_version: 5.0.0
revision: 1                  # 신규 필수. 1 이상의 정수
```

`revision`은 **상류 노드로 REPAIR할 때마다 +1** 한다. 그 외에는 올리지 않는다.

### 2. `PROJECT_SPEC.md`

```yaml
package_version: 5.0.0
freedom_floor: 3
freedom_floor_justification: none   # 3 미만으로 낮출 때만 20자 이상
personal_data: none                 # none | collected
auto_grading: none                  # none | declared
```

`profile: science-education`이고 `personal_data: collected` 또는 `auto_grading: declared`이면 `## 12. Data Handling` 절을 채운다.

```markdown
## 12. Data Handling

- purpose: 수집 목적
- items: 최소 수집 항목
- retention: 보관 기간과 삭제 시점
- access: 접근 권한자
- external_transfer: 외부 전송 여부. 없으면 "없음"
```

자동채점을 쓰면 `assessment_purpose`, `answer_basis`, `feedback_path` 3개를 추가한다.

### 3. 모든 `NODE_RESULT`

```yaml
revision: 1
superseded: false
```

이미 상류를 수리한 상태라면, 그 하류 문서를 `superseded: true`로 표시하거나 재실행한다.

### 4. 검증

```powershell
python tools\selftest.py       # 42/42
python tools\check_package.py
```

---

## B. v3 → v5

A의 모든 항목에 더해 다음을 먼저 처리한다.

| 항목 | 변경 |
|---|---|
| `terminal_node` (default graph) | `REPAIR` → **`COMPLETE`**. `REPAIR`는 노드가 아니라 판정이다 |
| `fallback_target` | `STATE.md`에 필드 추가. `status: FALLBACK`이면 실제 그래프 노드명 필수 |
| `updated_at` / `recorded_at` | date-only 금지. timezone 포함 ISO datetime (`2026-08-09T08:03:00+09:00`) |
| custom graph 표 | 모든 행의 `FAIL ROUTE`가 비어 있지 않아야 한다 |
| `retry_count` | `RETRY`면 1~3. `PASS/REPAIR/FALLBACK/STOP`이면 0 |

---

## C. v1 (Selective_AI_Control_Package) → v5

### 1. 파일 정리

| v1 | v5 | 조치 |
|---|---|---|
| `AI_CONTROL_CORE_CONSTITUTION.md` | `core/CONSTITUTION.md` | 교체 |
| (없음) | `core/GRAPH_CONTRACT.md` | 신규 |
| `AGENTS.md` | `AGENTS.md` | 교체 |
| `PROJECT_SPEC.md` (템플릿과 동일한 파일) | — | **삭제** |
| `PROJECT_SPEC_TEMPLATE.md` | `templates/` | 이동 |
| `CURRENT_NODE.md` | `STATE.md` | 변환 후 **원본 삭제**. 상태 소유자는 하나여야 한다 |

### 2. `PROJECT_SPEC.md` 보강

1. front matter (A-2 참조)
2. `## 7. Freedom Zone` — **최소 3개.** 기존에 P1·P2로 두었으나 실제로는 AI가 정해도 되는 항목을 여기로 내린다
3. `## 11. Control Budget Log`
4. `## 12. Data Handling` (science-education이고 개인정보·자동채점을 쓰는 경우)

### 3. `STATE.md` 생성

`CURRENT_NODE.md` 내용을 옮기되, **증거 수치는 파일에 적힌 값이 아니라 지금 다시 실행한 결과를 쓴다.** 이관 시점이 드리프트를 제거할 유일한 기회다.

### 4. 노드 결과 문서에 front matter 추가

```yaml
---
document: NODE_RESULT
node: N5
verdict: PASS
revision: 1
superseded: false
evidence_level: V2
evidence_unit: <실행 결과>
evidence_e2e: <실행 결과>
evidence_build: <실행 결과>
recorded_at: 2026-08-09T08:03:00+09:00
---
```

---

## D. 이관 직후 흔히 나오는 실패

전부 정상적인 지적이다.

| 검사 | 원인 | 조치 |
|---|---|---|
| `C05` | Freedom Zone 미작성 또는 `freedom_floor`를 임의로 낮춤 | 3개 이상 작성. 낮출 사정이 있으면 사유 20자 이상 |
| `C15` | 상태 파일이 최근 테스트 결과보다 오래됨 | 테스트 재실행 후 `STATE.md` 갱신 |
| `C22` | date-only 시각 | timezone 포함 datetime으로 교체 |
| `C24` | 상류를 고치고 하류를 그대로 둠 | `revision` +1 또는 하류에 `superseded: true` |
| `C25` | `revision` 필드 누락 | `STATE.md`와 모든 `NODE_RESULT`에 추가 |
| `C26` | 개인정보·자동채점 선언 미비 | `## 12. Data Handling` 작성 |
| `C18` | 로컬에만 있는 증거 | 커밋하거나 `evidence_committed: false`로 정직하게 표기 |
