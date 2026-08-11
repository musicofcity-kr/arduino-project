---
document: GRAPH_CONTRACT
version: 5.0.0
scope: domain-neutral
---

# Graph Contract

> LangGraph 같은 실행형 DAG 엔진을 요구하지 않는다. **파일 기반 순차 제어**를 규정한다. v5는 게이트 판정을 시각(timestamp)에서 **revision**으로 옮겨, 상태 파일의 시각 조작으로 게이트를 우회할 수 없게 한다.

## 1. 기본 그래프

새 프로젝트의 주 경로는 이것이다. **더 늘리지 않는다.**

```text
SPEC → BUILD → VERIFY → EVALUATE → USER CHECK ──PASS──→ COMPLETE
                    ↑             │
                    └── REPAIR ───┘
```

- `COMPLETE`는 정상 종료를 표현하는 **유일한 default terminal node**다.
- `REPAIR`는 default graph의 별도 노드가 아니라 **판정/회귀 동작**이다. 결함 원인 노드로 돌아간다.
- `RETRY`, `FALLBACK`, `ESCALATE`, `STOP` 역시 판정이며 노드명이 아니다.

도메인 노드(N0, N1, …)로 확장하는 것은 다음 조건이 모두 참일 때만 허용한다.

1. 산출물이 단일 세션에서 완결되지 않는다
2. 중간 산출물이 다음 단계의 입력이 된다
3. 잘못된 중간 산출물이 하류로 전파되면 되돌리기 비싸다

세 조건 중 하나라도 거짓이면 기본 그래프를 그대로 쓴다.

## 2. 노드 계약

custom graph의 모든 노드는 다음 6개를 문서에 명시한다.

```text
INPUT → TASK → OUTPUT → PASS 조건 → FAIL ROUTE → NEXT
```

`FAIL ROUTE`가 비어 있는 노드는 **정의되지 않은 노드**로 간주하고 진행하지 않는다. `check_package.py`가 이를 BLOCKER로 검사한다.

## 3. 전이표

각 작업 판정은 아래 6개 중 하나다. **노드명과 판정명을 혼용하지 않는다.**

| 판정 | 의미 | 목적지 | STATE 필수 필드 | 사람 개입 |
|---|---|---|---|---|
| `PASS` | 성공 기준 충족 | 다음 노드 또는 terminal | 증거 갱신 | 진행 승인 |
| `RETRY` | 일시적 실패, 같은 방식 재시도 가능 | 같은 노드 | `retry_count=1..3` | 불필요 |
| `REPAIR` | 결함 원인 수정 필요 | 현재 또는 상류 원인 노드 | `repair_target` | 불필요 |
| `FALLBACK` | 주 경로 불가, 안전한 대안으로 전환 | 정의된 대체 노드 | `fallback_reason`, `fallback_target` | 사후 통보 |
| `ESCALATE` | AI가 판단할 수 없음 | 사람 — 그래프 일시 정지 | `open_question` | **필수** |
| `STOP` | 안전·윤리·법적 위험 | 그래프 중단 | `stop_reason` | **필수** |

### 3.1 강제 규칙

- `RETRY`는 노드당 최대 3회. 4번째 재시도 대신 `ESCALATE`한다.
- `REPAIR` 대상은 현재 노드 또는 상류 노드만 허용한다. 상류 수리 시 `revision`을 올리고 하류 산출물을 전부 재검증하거나 `superseded: true`로 폐기한다. **`C24`가 이를 기계로 강제한다.**
- `FALLBACK`은 사유와 목적지를 둘 다 기록하며 목적지는 그래프에 정의되어 있어야 한다.
- `ESCALATE`와 `STOP`에서는 진행하지 않는다.
- 판정값은 이 6개 외에 추가하지 않는다.

## 4. 상태 소유권

### 4.1 단일 소유자

**`STATE.md` 하나가 그래프 상태의 유일한 소유자다.** 노드 결과 문서는 시점 스냅샷이다.

### 4.2 revision — 폐기의 단일 기준 (v5 신설)

- `STATE.revision`은 1 이상의 정수다.
- **상류 노드로 REPAIR할 때마다 +1** 한다. 그 외에는 올리지 않는다.
- 모든 `NODE_RESULT`는 자신이 만들어진 시점의 `revision`을 기록한다.
- 노드 결과가 **살아있다(live)** = `revision == STATE.revision` **그리고** `superseded != true`.

이 정의로 두 가지가 동시에 해결된다.

| 문제 | 처리 |
|---|---|
| 비PASS 상태에서 하류 노드를 먼저 만드는 것 | 하류에 live 결과가 있으면 `C16` BLOCKER |
| 상류를 고치고 하류를 그대로 두는 것 | `C24` BLOCKER — revision을 올리거나 `superseded: true` 필수 |

시각 비교가 아니므로 `updated_at`을 미래로 밀어도 우회되지 않는다. 우회하려면 노드 문서를 명시적으로 `superseded`로 표시하거나 revision을 위조해야 하며, 그것은 사고가 아니라 기록 위조다.

### 4.3 갱신 규칙

- 노드 판정 확정 직후 `STATE.md` 갱신
- 테스트 재실행 시 판정이 같아도 증거와 `updated_at` 갱신
- `updated_at`은 timezone 포함 ISO datetime 사용
- 상류 REPAIR 시 `revision`을 올리고, 재실행하지 않을 하류 문서는 `superseded: true`로 표시
- 증거 수치는 가장 최근 실행 결과
- 원격 미커밋 증거는 `evidence_committed: false`

## 5. 종료 상태

### 5.1 default graph

```yaml
terminal_node: COMPLETE
terminal_reached: false
```

`terminal_reached: true`는 아래를 모두 만족해야 한다.

1. `active_node == terminal_node`
2. `status == PASS`
3. 증거 등급 `V2` 이상

### 5.2 custom graph

`terminal_node`는 custom graph 표에 실제로 정의된 노드여야 한다.

- `terminal_reached: true` 이후 AI는 다음 노드나 다음 버전을 자동 생성하지 않는다.
- `STOP`은 정상 terminal 도달이 아니다. `terminal_reached`는 `false`로 유지한다.

## 6. 루프 계약

루프는 반드시 4개를 둔다.

1. 최대 재시도 횟수
2. 최대 수정 범위
3. 목표 기준 또는 개선 임계값
4. 회귀 확인 절차

```text
Baseline → Change → Measure → Compare → 개선되었는가?
```

> "바뀌었다"와 "좋아졌다"를 구분한다. Baseline 없이 시작한 루프는 무효다.

## 7. 멀티에이전트 최소 원칙

기본 구조는 Builder + Independent Reviewer 2인이다. 세 번째 역할은 2인 구조에서 놓친 결함이 실제로 발생한 뒤에만 추가한다.

Reviewer는 Builder의 `[DONE]` 주장을 증거로 인정하지 않고 요구사항, 실제 산출물, 평가 기준, 테스트 결과를 교차검증한다.
