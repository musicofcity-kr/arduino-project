---
document: STATE
package_version: 5.0.0
project: <프로젝트명>
graph: default
revision: 1
active_node: SPEC
status: PASS
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: <YYYY-MM-DDTHH:MM:SS+09:00>
evidence_level: V0
evidence_committed: false
evidence_unit: none
evidence_e2e: none
evidence_build: none
open_question: none
stop_reason: none
fallback_reason: none
---

# STATE

> **이 파일이 그래프 상태의 유일한 소유자다.** (`core/GRAPH_CONTRACT.md` §4)
> 노드 결과 문서는 시점 스냅샷이며 현재 상태가 아니다.
> 테스트를 재실행했다면 노드 판정이 그대로여도 이 파일을 갱신한다.

## 필드 규격

| 필드 | 허용값 | 비고 |
|---|---|---|
| `active_node` | 그래프에 정의된 노드명 | default는 `SPEC/BUILD/VERIFY/EVALUATE/USER CHECK/COMPLETE` |
| `status` | `PASS` `RETRY` `REPAIR` `FALLBACK` `ESCALATE` `STOP` | 이 6개 외 금지 |
| `retry_count` | 0~3 | `RETRY`면 1~3. PASS/REPAIR/FALLBACK/STOP은 0 |
| `repair_target` | 노드명 또는 `none` | `REPAIR`일 때 필수. 현재 노드 또는 상류 노드만 허용 |
| `fallback_target` | 노드명 또는 `none` | `FALLBACK`일 때 필수. 안전한 대체 경로 노드 |
| `terminal_node` | 그래프에 정의된 노드명 | default는 반드시 `COMPLETE` |
| `terminal_reached` | `true` / `false` | true이면 `active_node==terminal_node` 및 `status=PASS` |
| `revision` | 1 이상의 정수 | 상류 REPAIR로 작업을 되돌릴 때마다 +1. 하류 결과 폐기 기준 |
| `updated_at` | timezone 포함 ISO datetime | 예: `2026-08-09T08:03:00+09:00` |
| `evidence_level` | `V0` `V1` `V2` `V3` | P0는 V2 이상 |
| `evidence_committed` | `true` / `false` | 원격에 커밋되지 않은 증거는 `false` |
| `evidence_unit` | 예: `63 files / 503 tests` | 최신 실행 결과 |
| `evidence_e2e` | 예: `22/22` | 최신 실행 결과 |
| `evidence_build` | 예: `2174 modules` | 최신 실행 결과 |
| `open_question` | 문장 또는 `none` | `ESCALATE`일 때 필수 |
| `stop_reason` | 문장 또는 `none` | `STOP`일 때 필수 |
| `fallback_reason` | 문장 또는 `none` | `FALLBACK`일 때 필수 |

## 현재 판정 요약

<한 문단으로 현재 상태와 다음 행동>

## 미검증 범위

릴리스 주장과 분리해서 명시한다.

- <예: 실제 기기 카메라 미검증>
- <예: 실제 수업 학습효과 미검증>
