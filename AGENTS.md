# AGENTS.md

AI 코딩 에이전트(Codex / Claude Code)가 항상 읽는 라우터. 짧게 유지한다.

## Read First

1. `PROJECT_SPEC.md`
2. `core/CONSTITUTION.md`
3. `core/GRAPH_CONTRACT.md`
4. `STATE.md` — 현재 어느 노드인지 확인
5. `profiles/` 중 `PROJECT_SPEC.md`의 `profile` 값에 해당하는 파일 1개

설명용 문서(`docs/`)는 필요할 때만 읽는다.

## Priority

1. 사용자 가치 → 2. 정확성·안전성 → 3. 검증 가능한 증거 → 4. 단순성 → 5. 유지보수성 → 6. 기술적 세련됨

동일하거나 더 나은 사용자 가치를 주는 가장 단순한 해법을 택한다.

## Before Building

간단히 식별한다. 별도 기획 문서를 만들지 않는다.

- Mission / P0 / Freedom Zone / 성공 기준 / 주요 위험 / 최소 구현 경로

## Control Strategy

**강한 통제**: 수치·과학적 정확성, 보안·개인정보, 인증, 저장·삭제, 되돌릴 수 없는 연산.
**탐색 허용**: UI, 시각화, 인터랙션 설계, 내부 구현 대안.

`PROJECT_SPEC.md`의 Freedom Zone은 **지시가 아니라 허가**다. 그 영역에서는 스펙에 없는 더 나은 안을 제안하고 구현해도 된다. 그 영역 밖에서는 임의로 결정하지 않는다.

## Workflow

`SPEC → BUILD → VERIFY → EVALUATE → USER CHECK → COMPLETE`

결함이 있으면 `REPAIR` 판정으로 원인 노드에 회귀한다. `REPAIR`는 default terminal이 아니다.

루프·리뷰어·모듈·에이전트·그래프 노드는 **실제 문제가 확인될 때만** 추가한다.

## State

- 노드 판정이 확정되면 즉시 `STATE.md`를 갱신한다. 테스트를 재실행했으면 판정이 같아도 갱신한다.
- 판정값은 `PASS RETRY REPAIR FALLBACK ESCALATE STOP` 6개뿐이다. FALLBACK이면 `fallback_reason`과 `fallback_target`을 함께 기록한다.
- **상류 노드로 REPAIR하면 `STATE.revision`을 +1 하고, 그 하류 노드 결과를 재실행하거나 `superseded: true`로 폐기한다.** 상류만 고치고 하류를 그대로 두는 것은 금지다.
- `PROJECT_SPEC.md`의 Freedom Zone을 임의로 줄이지 마라. 줄여야 한다고 판단되면 `ESCALATE`한다.
- `RETRY` 3회 초과 → `ESCALATE`.
- 상류 노드를 수리했으면 그 사이 하류 노드를 **전부 재검증**한다.
- `terminal_reached: true` 이후 다음 노드·다음 버전을 자동 생성하지 않는다.

## Escalate to Human

다음은 스스로 결정하지 않고 사람에게 묻는다.

- P0 위반 가능성이 있으나 근거가 부족할 때
- 스펙과 실제 구현이 충돌할 때
- 도메인 사실의 정확성을 자체 검증할 수 없을 때
- 스코프를 줄이거나 늘려야 할 때

## Anti-Overengineering

복잡도를 추가하기 전에 묻는다.

> 이것이 해결하는 **구체적인** 사용자 문제나 실패는 무엇인가?

답이 없으면 추가하지 않는다. 사용 가능하다는 이유만으로 에이전트·노드·추상화·프레임워크·설정 계층을 넣지 않는다.

## Verification

컴파일 성공이나 정적 검토만으로 완료를 선언하지 않는다.
`python tools/check_package.py`를 통과시키고, 실제 실행 화면과 사용자 흐름 증거를 확보한다.
fixture·mock 통과를 실환경 검증으로 확대 해석하지 않는다.

## Completion Report

```markdown
## Result
## Evidence   (각 항목에 V0~V3 등급 표기)
## Quality Delta
## Remaining Issues
## Risk
## Next Best Action
```
