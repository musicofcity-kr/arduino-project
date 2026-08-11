---
document: PROJECT_SPEC
package_version: 5.0.0
project: <프로젝트명>
profile: science-education        # science-education | generic-software
control_ratio_cap: 0.70
freedom_floor: 3
freedom_floor_justification: none   # 3 미만으로 낮출 때만 20자 이상 사유 필수
personal_data: none                 # none | collected
auto_grading: none                  # none | declared
---

# PROJECT SPEC

> 이 파일을 프로젝트 루트에 `PROJECT_SPEC.md`로 **복사한 뒤** 작성한다.
> `<...>` 로 남아 있는 항목은 미작성으로 간주되어 `check_package.py`가 실패시킨다.

## 1. Domain Goal

<이 프로그램이 해결해야 할 실제 문제를 한 문장으로>

## 2. Primary User

<주 사용자 — 학생 / 교사 / 연구자 / 일반>

## 3. Primary Tasks

- <사용자가 반드시 성공해야 하는 작업 1>
- <작업 2>

## 4. Success Evidence

관찰 가능한 형태로 쓴다. "잘 작동한다"는 증거가 아니다.

- <예: 처음 보는 학생이 5분 안에 첫 결과를 얻는다>
- <예: 잘못된 입력이 다음 단계로 통과하지 않는다>

## 5. P0 — Non-Negotiables

실패 시 배포 불가. **모든 항목에 증거 등급 V2 이상을 붙일 수 있어야 한다.**

- <예: 검증되지 않은 추정을 사실로 확정하지 않는다>
- <예: 학생 개인정보를 외부로 전송하지 않는다>

## 6. P1 — Important Quality

- <예: 모바일 390px에서 가로 스크롤 0>

## 7. Freedom Zone

**최소 3개. 0개는 불가능하다** (하드 하한 1). `freedom_floor`를 3 미만으로 낮추려면
front matter에 `freedom_floor_justification`을 20자 이상 써야 한다. AI가 자유롭게 탐색해도 되는 영역을 *명시적으로 예약*한다. 비워 두면 검증 실패다.

- <예: 세부 레이아웃과 시각 계층>
- <예: 컴포넌트 내부 구성 방식>
- <예: 애니메이션·전이 표현>

## 8. Main Risks

- <실패 비용이 큰 지점>

## 9. Graph

기본 그래프를 쓰면 `default`라고만 쓴다. 도메인 노드로 확장할 때만 표를 채운다.

```text
default
```

| Node | INPUT | TASK | OUTPUT | PASS 조건 | FAIL ROUTE |
|---|---|---|---|---|---|

## 10. Commands

```bash
# install

# run

# test

# build
```

## 12. Data Handling

`profile: science-education`이면 아래를 채운다. `personal_data: none`이고
`auto_grading: none`이면 이 절은 비워 둘 수 있다.

개인정보를 수집하는 경우 (`personal_data: collected`):

- purpose: <수집 목적>
- items: <최소 수집 항목>
- retention: <보관 기간과 삭제 시점>
- access: <접근 권한자>
- external_transfer: <외부 전송 여부와 대상. 없으면 "없음">

자동채점을 사용하는 경우 (`auto_grading: declared`):

- assessment_purpose: <평가 목적. 형성평가인가 총괄평가인가>
- answer_basis: <정답 근거와 출처>
- feedback_path: <오답 시 학생이 받는 피드백 경로>

## 11. Control Budget Log

규칙을 추가할 때마다 한 줄씩 기록한다. (`core/CONSTITUTION.md` §5)

| 일자 | 규칙 | 유형 | 근거 | 판정 방법 |
|---|---|---|---|---|
| | | a priori / a posteriori | | machine / human |
