---
package: AI Control Package
version: 5.0.0
released: 2026-08-09
supersedes: 4.0.0
status: release-candidate
empirical_status: single-case-observation
---

# VERSION

## 버전 규칙

`MAJOR.MINOR.PATCH`

| 자리 | 올리는 조건 |
|---|---|
| MAJOR | 기존 프로젝트의 `PROJECT_SPEC.md` 또는 `STATE.md`를 수정해야 호환되는 변경 |
| MINOR | 원칙·절차 추가 (기존 프로젝트 호환 유지) |
| PATCH | 오탈자, 설명 보강, 검증 스크립트 버그 수정 |

> v5는 `STATE.revision`, `NODE_RESULT.revision/superseded`, `PROJECT_SPEC`의 개인정보·자동채점 선언을 새로 요구한다. 기존 프로젝트 파일을 고쳐야 하므로 자체 규칙에 따라 **5.0.0**으로 올렸다.

## 개정 절차 (Amendment Protocol)

이 패키지 자체에도 Control Budget을 적용한다. 조항을 추가하려면 다음 4개를 모두 기록한다.

1. **관측된 실패** — 언제, 어느 프로젝트에서, 무엇이 잘못됐는가
2. **재발 가능성** — 1회성인가 구조적인가
3. **실패 비용** — 되돌릴 수 있는가
4. **판정 방법** — 사람이 읽어서 판단하는가, `check_package.py`가 판별하는가

4번이 "기계 판별 가능"이면 반드시 `tools/check_package.py`에 규칙을 함께 추가한다. 판정 불가능한 조항은 채택하지 않는다.

---

## CHANGELOG

### 5.0.0 — 2026-08-09

v4 독립 감사에서 **실행으로 재현된 3건**과 그에 딸린 2건을 수리했다. v4가 상태 머신 엄밀성을 크게 높인 것은 유지하되, 그 과정에서 느슨해진 지점을 되돌린다.

| # | v4에서 재현된 문제 | 5.0.0 수정 |
|---|---|---|
| V4-F1 | `freedom_floor: 0` 한 줄로 자유도 예약이 꺼지고 Control Ratio 1.00이 `PASS_WITH_WARN`. 패키지의 존재 이유를 스펙이 무력화할 수 있었다 | 하드 하한 도입. `freedom_floor < 1` 금지. 3 미만은 `freedom_floor_justification` 20자 이상 필수 (`C05` BLOCKER) |
| V4-F2 | 게이트(`C16`)가 시각 기반이라 `STATE.updated_at`만 미래로 밀면 우회됨 (실증) | revision 기반으로 교체. 시각 조작에 영향받지 않음 |
| V4-F3 | "상류 REPAIR 시 하류 산출물 폐기"가 계약에만 있고 강제되지 않음 | `C24` 신설. 상류 수리 시 하류 결과는 `revision` 상승 또는 `superseded: true` 필수 |
| V4-F4 | 과학교육 P0의 개인정보·자동채점 예외가 "스펙에 명시하면 허용"인데, 명시 여부를 검사하는 코드가 0건 (VERSION.md 개정절차 4번 자체 위반) | `C26` 신설. `personal_data`/`auto_grading` 선언과 `## 12. Data Handling` 5+3항목 강제 |
| V4-F5 | `docs/MIGRATION_v1_to_v3.md`가 낡은 채 잔존. `recorded_at: <YYYY-MM-DD>`를 안내하는데 v4의 `C23`이 그 형식을 차단 — 문서를 따르면 실패 | 마이그레이션 문서를 `docs/MIGRATION.md` 하나로 통합. self-test에 **패키지 자기정합 검사(P01/P02)** 추가해 재발을 기계로 차단 |

`control_ratio_cap`을 스스로 부풀리는 것도 `C06`에서 경고한다 (권장 상한 0.85).

self-test: 26 → **42** (프로젝트 40 + 패키지 자기정합 2).


### 4.0.0 — 2026-08-09

v3 독립 감사에서 발견된 **문서 계약과 실제 검증기 사이의 간극**을 수리한 버전이다. 새 엔지니어링 개념을 늘리지 않고 상태 머신과 검증기만 강화했다.

| # | v3에서 확인된 문제 | 4.0.0 수정 |
|---|---|---|
| V3-F1 | 기본 그래프에서 `REPAIR`가 loop 동작이면서 terminal로도 쓰임 | 정상 종료를 `COMPLETE`로 분리. `REPAIR`는 판정/회귀 동작으로만 사용 |
| V3-F2 | FALLBACK은 사유만 있고 목적지 상태가 없음 | `fallback_target` 필드 추가, 그래프 노드 유효성 검사 |
| V3-F3 | custom graph의 빈 `FAIL ROUTE`가 PASS | `C20` BLOCKER로 강제 |
| V3-F4 | `STATE.md` placeholder·프로젝트명 불일치가 PASS | `C19`에서 placeholder, project, package_version 정합 검사 |
| V3-F5 | `terminal_reached=true`인데 active/terminal 불일치가 PASS | `C12`에 terminal 상태 머신 정합 검사 |
| V3-F6 | `RETRY`인데 `retry_count=0`이 PASS | `C11`에 status-count 정합 검사 |
| V3-F7 | 존재하지 않거나 하류인 `repair_target`이 PASS | `C21`에서 target 존재/상류성 검사 |
| V3-F8 | 날짜만 기록해 최신 증거 정렬이 모호 | `updated_at`, `recorded_at`을 timezone 포함 ISO datetime으로 강제 |
| V3-F9 | self-test 10개가 위 상태 위반을 잡지 못함 | adversarial case 포함 **26개**로 확대 |
| V3-F10 | Control Ratio가 문서상 DoD처럼 보이나 checker에서는 WARN | **진단 지표(WARN)** 로 명시해 문서·검증기 의미 통일 |
| V3-F11 | 과학교육 개인정보·자동채점 조항이 모든 교육 앱에 지나치게 절대적 | 목적·최소수집·평가유형을 명시한 조건부 guardrail로 조정 |

### 3.0.0 — 2026-08-09

Selective_AI_Control_Package를 실제 프로젝트에 적용한 뒤 관측된 결함을 근거로 상태 소유권, 전이표, Freedom Floor, Control Budget, 증거 등급, profile 분리, 기계 검증기를 도입한 버전.
