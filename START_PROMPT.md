# Start Prompt

새 Codex / Claude Code 세션에서 아래를 그대로 붙여넣는다.

```text
먼저 AGENTS.md를 읽고, 이어서 PROJECT_SPEC.md, core/CONSTITUTION.md,
core/GRAPH_CONTRACT.md, STATE.md를 읽어라.
PROJECT_SPEC.md의 profile 값에 해당하는 profiles/ 파일 1개도 읽어라.

작업 전에 `python tools/check_package.py`를 실행하고 판정이 `PASS` 또는 `PASS_WITH_WARN`인지 확인하라.
`FAIL`이면 구현을 시작하지 말고 무엇이 실패했는지 먼저 보고하라. `PASS_WITH_WARN`이면 경고를 먼저 요약하고 계속 진행할 수 있다.

구현 전에 다음 6가지를 간단히 정리하라. 별도 기획 문서는 만들지 마라.
1. Mission
2. P0
3. Freedom Zone
4. 성공 기준
5. 주요 위험
6. 최소 구현 경로

원칙:
- Freedom Zone은 지시가 아니라 허가다. 그 영역에서는 스펙보다 더 나은 안을
  제안하고 구현해도 된다. 그 영역 밖에서는 임의로 결정하지 마라.
- 하네스, 루프, 그래프 노드, 에이전트, 추상화 계층은 실제 문제가 확인되기
  전에는 추가하지 마라.
- 노드 판정이 확정되면 즉시 STATE.md를 갱신하라. 테스트를 재실행했다면
  판정이 같아도 갱신하라.
- 판정값은 PASS RETRY REPAIR FALLBACK ESCALATE STOP 6개뿐이다. FALLBACK이면 reason과 target을 함께 기록하라.
- 상류 노드를 수리하면 STATE.revision을 +1 하고 하류 노드 결과를 재실행하거나
  superseded: true로 폐기하라.
- Freedom Zone은 허가다. 그 안에서는 더 나은 안을 제안하고 구현해도 된다.
  Freedom Zone을 줄여야 한다고 판단되면 임의로 줄이지 말고 ESCALATE하라.
- 판단할 수 없거나 스코프를 바꿔야 하면 ESCALATE하고 나에게 물어라.

완료 선언 전에 반드시:
1. python tools/check_package.py 가 PASS 또는 PASS_WITH_WARN (WARN 검토 완료)
2. 실제 실행 화면과 사용자 흐름 확인
3. 각 증거에 V0~V3 등급 표기
4. 미검증 범위를 릴리스 주장과 분리해 명시

컴파일 성공이나 정적 검토만으로 완료를 선언하지 마라.
fixture나 mock 통과를 실환경 검증으로 확대 해석하지 마라.
```

## 노드 진행 시 추가 프롬프트

```text
STATE.md의 active_node만 작업하라. 그 노드가 PASS가 되기 전에는
다음 노드를 구현하지 마라. 결과는 templates/NODE_RESULT_TEMPLATE.md
형식으로 graph-output/에 남겨라.

상류 노드를 수리했다면 그 사이 하류 노드를 전부 재검증하라.
```
