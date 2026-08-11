---
document: PACKAGE_VALIDATION
package_version: 5.0.0
validated_at: 2026-08-09T18:00:00+09:00
---

# AI Control Package v5 — 검증 기록

## 1. 실행한 명령과 결과

```text
python -m py_compile tools/check_package.py tools/selftest.py
→ PASS

python tools/selftest.py
→ 통과 42 / 실패 0
```

## 2. v4에서 재현했던 결함이 v5에서 차단되는지

각 항목은 실제 fixture로 재현한 뒤 수정 여부를 확인한 것이다.

| 결함 | v4 결과 | v5 결과 | 확인 케이스 |
|---|---|---|---|
| `freedom_floor: 0`으로 자유도 무력화 | `PASS_WITH_WARN` | **FAIL (C05)** | T06 |
| `freedom_floor` 하향에 사유 없음 | 검사 없음 | **FAIL (C05)** | T07 |
| 게이트를 `updated_at` 미래 조작으로 우회 | `PASS` | **FAIL (C16)** | T24 |
| 비PASS 상태에서 하류 결과 존재 | `PASS` | **FAIL (C16)** | T23 |
| 상류 REPAIR 후 하류 미폐기 | 검사 없음 | **FAIL (C24)** | T26 |
| 개인정보 수집 선언만 하고 근거 미작성 | 검사 없음 | **FAIL (C26)** | T37 |
| 자동채점 선언만 하고 근거 미작성 | 검사 없음 | **FAIL (C26)** | T39 |
| `control_ratio_cap` 자체를 부풀림 | 검사 없음 | **WARN (C06)** | T09 |
| 패키지 문서가 코드와 어긋난 채 방치 | 검사 없음 | **FAIL (P01/P02)** | 자기정합 |

## 3. 오탐 방지 확인

정상 경로가 막히지 않는지도 확인했다.

| 케이스 | 기대 | 결과 |
|---|---|---|
| 정상 custom 프로젝트 | PASS | PASS (T01) |
| 정상 default 시작 상태 | PASS | PASS (T02) |
| 정당한 사유가 있는 `freedom_floor` 하향 | PASS | PASS (T08) |
| 상류 REPAIR 후 하류를 올바르게 폐기 | PASS | PASS (T25) |
| 개인정보 수집 + Data Handling 완비 | PASS | PASS (T38) |

## 4. 아직 증명하지 않는 것

- 이 패키지가 전면 통제 방식보다 더 좋은 산출물을 만든다는 **실증** (단일 사례, 대조군 없음)
- Freedom Floor 3, 하드 하한 1, Control Ratio 0.70/0.85의 **최적성** (전부 임의 기본값)
- 모든 실제 프로젝트의 custom graph 표기법을 완전히 파싱한다는 보장
- `revision`·`superseded`는 **기록 위조를 막지 못한다.** 사고성 우회를 막을 뿐이며, 의도적 위조는 사람 리뷰의 영역이다

따라서 상태는 `release-candidate`로 유지한다. `docs/AB_EXPERIMENT_PROTOCOL.md`가 실행되기 전까지 승격하지 않는다.
