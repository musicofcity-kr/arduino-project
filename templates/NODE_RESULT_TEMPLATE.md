---
document: NODE_RESULT
node: <노드명>
verdict: PASS
revision: 1
superseded: false
evidence_level: V2
evidence_unit: <예: 63 files / 503 tests>
evidence_e2e: <예: 22/22>
evidence_build: <예: 2174 modules>
recorded_at: <YYYY-MM-DDTHH:MM:SS+09:00>
---

# <노드명> RESULT

> 이 문서는 **시점 스냅샷**이다. 현재 상태는 `STATE.md`가 소유한다.
>
> `revision`은 이 결과를 만든 시점의 `STATE.revision`이다. 상류 노드를 수리해
> `STATE.revision`이 올라가면 이 문서는 자동으로 **폐기(stale)** 상태가 된다.
> 재실행하지 않고 남겨 둘 경우 `superseded: true`로 명시한다.

## INPUT

<이 노드가 받은 것>

## TASK

<수행한 작업>

## OUTPUT

<산출물 경로>

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| | | |

## Negative / Fail-closed 검증

잘못된 입력이 하류로 통과하지 않음을 보인 증거를 쓴다. **positive 증거만 있는 노드는 PASS로 보지 않는다.**

- <예: disconnected graph는 검증 결과를 열지 않음>

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| | | |

## 한계

<이 노드가 증명하지 않은 것. fixture·mock을 실환경 증거로 확대 해석하지 않는다>
