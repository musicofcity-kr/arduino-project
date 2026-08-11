#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
selftest.py — AI Control Package v5 검증기 자체 테스트

두 종류를 검사한다.
  1. 프로젝트 케이스 — check_package.py가 상태 계약 위반을 실제로 잡는가
  2. 패키지 자기정합 — 동봉 문서가 서로/코드와 어긋나지 않는가
     (v4에서 MIGRATION 문서가 낡은 채 남아 있던 결함의 재발 방지)

사용법:
    python tools/selftest.py

종료 코드: 0 = 전체 통과, 1 = 실패
"""

import os
import re
import sys
import json
import shutil
import tempfile
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
CHECKER = os.path.join(HERE, "check_package.py")

PACKAGE_VERSION = "5.0.0"
NOW = "2026-08-09T09:00:00+09:00"

SPEC_OK = """---
document: PROJECT_SPEC
package_version: 5.0.0
project: selftest
profile: science-education
control_ratio_cap: 0.70
freedom_floor: 3
freedom_floor_justification: none
personal_data: none
auto_grading: none
---

# PROJECT SPEC

## 1. Domain Goal
셀프테스트용 최소 스펙.

## 2. Primary User
학생

## 3. Primary Tasks
- 작업 1

## 4. Success Evidence
- 흐름을 완주한다

## 5. P0 — Non-Negotiables
- 개인정보를 전송하지 않는다
- 과학적 사실 오류를 내지 않는다

## 6. P1 — Important Quality
- 모바일 가로 overflow 0

## 7. Freedom Zone
- 레이아웃
- 아이콘
- 애니메이션

## 8. Main Risks
- 오인식

## 9. Graph

```text
custom
```

| Node | INPUT | TASK | OUTPUT | PASS 조건 | FAIL ROUTE |
|---|---|---|---|---|---|
| N0 | a | b | c | d | REPAIR N0 |
| N1 | a | b | c | d | REPAIR N0 |
| N2 | a | b | c | d | REPAIR N1 |

## 12. Data Handling

## 10. Commands
```bash
npm test
```
"""

SPEC_DEFAULT = SPEC_OK.replace("""```text
custom
```

| Node | INPUT | TASK | OUTPUT | PASS 조건 | FAIL ROUTE |
|---|---|---|---|---|---|
| N0 | a | b | c | d | REPAIR N0 |
| N1 | a | b | c | d | REPAIR N0 |
| N2 | a | b | c | d | REPAIR N1 |
""", """```text
default
```
""")

STATE_OK = """---
document: STATE
package_version: 5.0.0
project: selftest
graph: custom
revision: 1
active_node: N2
status: PASS
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: N2
terminal_reached: true
updated_at: 2026-08-09T09:00:00+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 10 files / 100 tests
evidence_e2e: 5/5
evidence_build: 200 modules
open_question: none
stop_reason: none
fallback_reason: none
---
# STATE
"""

STATE_DEFAULT = """---
document: STATE
package_version: 5.0.0
project: selftest
graph: default
revision: 1
active_node: SPEC
status: PASS
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-09T09:00:00+09:00
evidence_level: V1
evidence_committed: false
evidence_unit: none
evidence_e2e: none
evidence_build: none
open_question: none
stop_reason: none
fallback_reason: none
---
# STATE
"""


def node_doc(name, unit="none", e2e="none", build="none",
             date=NOW, revision=1, superseded="false", verdict="PASS"):
    return ("---\ndocument: NODE_RESULT\nnode: %s\nverdict: %s\nrevision: %s\n"
            "superseded: %s\nevidence_level: V2\nevidence_unit: %s\n"
            "evidence_e2e: %s\nevidence_build: %s\nrecorded_at: %s\n---\n# %s\n"
            % (name, verdict, revision, superseded, unit, e2e, build, date, name))


T0 = "2026-08-09T07:00:00+09:00"
T1 = "2026-08-09T08:00:00+09:00"

DEFAULT_NODES = [
    node_doc("N0", date=T0),
    node_doc("N1", date=T1),
    node_doc("N2", "10 files / 100 tests", "5/5", "200 modules", date=NOW),
]


def build_fixture(root, spec=None, state=None, nodes=None):
    os.makedirs(os.path.join(root, "graph-output"), exist_ok=True)
    os.makedirs(os.path.join(root, "tools"), exist_ok=True)
    shutil.copytree(os.path.join(PKG, "profiles"),
                    os.path.join(root, "profiles"), dirs_exist_ok=True)
    shutil.copytree(os.path.join(PKG, "templates"),
                    os.path.join(root, "templates"), dirs_exist_ok=True)
    shutil.copy(CHECKER, os.path.join(root, "tools", "check_package.py"))
    open(os.path.join(root, "PROJECT_SPEC.md"), "w", encoding="utf-8").write(
        SPEC_OK if spec is None else spec)
    open(os.path.join(root, "STATE.md"), "w", encoding="utf-8").write(
        STATE_OK if state is None else state)
    for body in (DEFAULT_NODES if nodes is None else nodes):
        name = body.split("node:")[1].split("\n")[0].strip()
        open(os.path.join(root, "graph-output", "%s_RESULT.md" % name),
             "w", encoding="utf-8").write(body)


def run(root):
    r = subprocess.run([sys.executable, CHECKER, root, "--json"],
                       capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {"verdict": "ERROR", "checks": [], "raw": r.stdout + r.stderr}


def check_of(res, cid):
    for c in res.get("checks", []):
        if c["id"] == cid:
            return c["result"]
    return "ABSENT"


CASES = []


def case(name, expect_verdict, expect=None):
    def deco(fn):
        CASES.append((name, fn, expect_verdict, expect or {}))
        return fn
    return deco


# ---------------------------------------------------------------- 정상 경로
@case("T01 정상 custom 프로젝트", "PASS")
def t01(root):
    build_fixture(root)


@case("T02 정상 default 시작 상태", "PASS")
def t02(root):
    build_fixture(root, spec=SPEC_DEFAULT, state=STATE_DEFAULT, nodes=[])


# ------------------------------------------------------------ 스펙/자유도
@case("T03 미작성 템플릿", "FAIL", {"C02": "FAIL", "C03": "FAIL"})
def t03(root):
    build_fixture(root)
    shutil.copy(os.path.join(PKG, "templates", "PROJECT_SPEC_TEMPLATE.md"),
                os.path.join(root, "PROJECT_SPEC.md"))


@case("T04 STATE 부재", "FAIL", {"C08": "FAIL"})
def t04(root):
    build_fixture(root)
    os.remove(os.path.join(root, "STATE.md"))


@case("T05 Freedom Zone 항목 부족", "FAIL", {"C05": "FAIL"})
def t05(root):
    build_fixture(root, spec=SPEC_OK.replace("- 레이아웃\n- 아이콘\n- 애니메이션", "- 레이아웃"))


@case("T06 freedom_floor=0으로 자유도 무력화 시도", "FAIL", {"C05": "FAIL"})
def t06(root):
    spec = (SPEC_OK.replace("freedom_floor: 3", "freedom_floor: 0")
                   .replace("- 레이아웃\n- 아이콘\n- 애니메이션", "- (없음)"))
    build_fixture(root, spec=spec)


@case("T07 freedom_floor 하향에 사유 없음", "FAIL", {"C05": "FAIL"})
def t07(root):
    spec = (SPEC_OK.replace("freedom_floor: 3", "freedom_floor: 1")
                   .replace("- 레이아웃\n- 아이콘\n- 애니메이션", "- 레이아웃"))
    build_fixture(root, spec=spec)


@case("T08 freedom_floor 하향 + 정당한 사유", "PASS")
def t08(root):
    spec = (SPEC_OK
            .replace("freedom_floor: 3", "freedom_floor: 1")
            .replace("freedom_floor_justification: none",
                     "freedom_floor_justification: 인증 문서에 UI 변형 범위가 고정된 규제 대상 소프트웨어")
            .replace("- 레이아웃\n- 아이콘\n- 애니메이션", "- 레이아웃"))
    build_fixture(root, spec=spec)


@case("T09 control_ratio_cap 자체를 부풀림", "PASS_WITH_WARN", {"C06": "FAIL"})
def t09(root):
    build_fixture(root, spec=SPEC_OK.replace("control_ratio_cap: 0.70", "control_ratio_cap: 0.99"))


@case("T10 Control Ratio 초과는 WARN", "PASS_WITH_WARN", {"C06": "FAIL"})
def t10(root):
    spec = SPEC_OK.replace("## 6. P1 — Important Quality\n- 모바일 가로 overflow 0",
                           "## 6. P1 — Important Quality\n- a\n- b\n- c\n- d\n- e\n- f\n- g")
    build_fixture(root, spec=spec)


@case("T11 profile 파일 없음", "FAIL", {"C07": "FAIL"})
def t11(root):
    build_fixture(root, spec=SPEC_OK.replace("profile: science-education", "profile: nonexistent"))


# ------------------------------------------------------------- 상태 머신
@case("T12 허용되지 않은 status", "FAIL", {"C09": "FAIL"})
def t12(root):
    build_fixture(root, state=STATE_OK.replace("status: PASS", "status: DONE"))


@case("T13 ESCALATE인데 질문 없음", "FAIL", {"C10": "FAIL"})
def t13(root):
    build_fixture(root, state=STATE_OK.replace("status: PASS", "status: ESCALATE")
                                      .replace("terminal_reached: true", "terminal_reached: false")
                                      .replace("active_node: N2", "active_node: N1"))


@case("T14 FALLBACK 목적지 누락", "FAIL", {"C10": "FAIL"})
def t14(root):
    build_fixture(root, state=STATE_OK.replace("status: PASS", "status: FALLBACK")
                                      .replace("fallback_reason: none", "fallback_reason: 외부 API 장애")
                                      .replace("terminal_reached: true", "terminal_reached: false")
                                      .replace("active_node: N2", "active_node: N1"))


@case("T15 FALLBACK 목적지가 미정의 노드", "FAIL", {"C21": "FAIL"})
def t15(root):
    build_fixture(root, state=STATE_OK.replace("status: PASS", "status: FALLBACK")
                                      .replace("fallback_reason: none", "fallback_reason: 외부 API 장애")
                                      .replace("fallback_target: none", "fallback_target: N9")
                                      .replace("terminal_reached: true", "terminal_reached: false")
                                      .replace("active_node: N2", "active_node: N1"))


@case("T16 retry 상한 초과", "FAIL", {"C11": "FAIL"})
def t16(root):
    build_fixture(root, state=STATE_OK.replace("retry_count: 0", "retry_count: 4"))


@case("T17 RETRY인데 count=0", "FAIL", {"C11": "FAIL"})
def t17(root):
    build_fixture(root, state=STATE_OK.replace("status: PASS", "status: RETRY")
                                      .replace("terminal_reached: true", "terminal_reached: false")
                                      .replace("active_node: N2", "active_node: N1"))


@case("T18 terminal=true인데 active가 terminal 아님", "FAIL", {"C12": "FAIL"})
def t18(root):
    build_fixture(root, state=STATE_OK.replace("active_node: N2", "active_node: N1"))


@case("T19 default terminal을 REPAIR로 지정", "FAIL", {"C12": "FAIL"})
def t19(root):
    build_fixture(root, spec=SPEC_DEFAULT,
                  state=STATE_DEFAULT.replace("terminal_node: COMPLETE", "terminal_node: REPAIR"),
                  nodes=[])


@case("T20 STOP인데 terminal_reached=true", "FAIL", {"C12": "FAIL"})
def t20(root):
    build_fixture(root, state=STATE_OK.replace("status: PASS", "status: STOP")
                                      .replace("stop_reason: none", "stop_reason: 안전 위험"))


@case("T21 종료 선언인데 증거 등급 미달", "FAIL", {"C14": "FAIL"})
def t21(root):
    build_fixture(root, state=STATE_OK.replace("evidence_level: V2", "evidence_level: V1"))


@case("T22 REPAIR 목적지가 하류 노드", "FAIL", {"C21": "FAIL"})
def t22(root):
    build_fixture(root, state=STATE_OK.replace("status: PASS", "status: REPAIR")
                                      .replace("repair_target: none", "repair_target: N2")
                                      .replace("active_node: N2", "active_node: N1")
                                      .replace("terminal_reached: true", "terminal_reached: false"))


# --------------------------------------------------- revision / 게이트 / 폐기
@case("T23 게이트 위반: 비PASS 상태에서 하류 결과가 살아있음", "FAIL", {"C16": "FAIL"})
def t23(root):
    state = (STATE_OK.replace("active_node: N2", "active_node: N0")
                     .replace("status: PASS", "status: REPAIR")
                     .replace("repair_target: none", "repair_target: N0")
                     .replace("terminal_reached: true", "terminal_reached: false"))
    build_fixture(root, state=state)


@case("T24 게이트 우회 시도: updated_at만 미래로 밀기", "FAIL", {"C16": "FAIL"})
def t24(root):
    state = (STATE_OK.replace("active_node: N2", "active_node: N0")
                     .replace("status: PASS", "status: REPAIR")
                     .replace("repair_target: none", "repair_target: N0")
                     .replace("terminal_reached: true", "terminal_reached: false")
                     .replace("updated_at: 2026-08-09T09:00:00+09:00",
                              "updated_at: 2030-01-01T00:00:00+09:00"))
    build_fixture(root, state=state)


@case("T25 상류 REPAIR 후 하류 폐기 완료", "PASS")
def t25(root):
    state = (STATE_OK.replace("active_node: N2", "active_node: N0")
                     .replace("status: PASS", "status: REPAIR")
                     .replace("repair_target: none", "repair_target: N0")
                     .replace("revision: 1", "revision: 2")
                     .replace("terminal_reached: true", "terminal_reached: false")
                     .replace("evidence_unit: 10 files / 100 tests", "evidence_unit: none")
                     .replace("evidence_e2e: 5/5", "evidence_e2e: none")
                     .replace("evidence_build: 200 modules", "evidence_build: none"))
    nodes = [node_doc("N0", revision=2, date=NOW),
             node_doc("N1", revision=1, superseded="true", date=T1),
             node_doc("N2", revision=1, superseded="true", date=T0)]
    build_fixture(root, state=state, nodes=nodes)


@case("T26 상류 REPAIR인데 하류 미폐기", "FAIL", {"C24": "FAIL"})
def t26(root):
    state = (STATE_OK.replace("active_node: N2", "active_node: N1")
                     .replace("status: PASS", "status: REPAIR")
                     .replace("repair_target: none", "repair_target: N0")
                     .replace("terminal_reached: true", "terminal_reached: false"))
    build_fixture(root, state=state)


@case("T27 STATE.revision 누락", "FAIL", {"C25": "FAIL"})
def t27(root):
    build_fixture(root, state=STATE_OK.replace("revision: 1\n", ""))


@case("T28 NODE_RESULT revision이 STATE보다 큼", "FAIL", {"C25": "FAIL"})
def t28(root):
    nodes = [node_doc("N0", date=T0), node_doc("N1", date=T1),
             node_doc("N2", "10 files / 100 tests", "5/5", "200 modules", revision=9)]
    build_fixture(root, nodes=nodes)


# ------------------------------------------------------------ 증거/정체성
@case("T29 증거 드리프트", "FAIL", {"C15": "FAIL"})
def t29(root):
    build_fixture(root, state=STATE_OK.replace("evidence_e2e: 5/5", "evidence_e2e: 3/3"))


@case("T30 STATE project placeholder", "FAIL", {"C19": "FAIL"})
def t30(root):
    build_fixture(root, state=STATE_OK.replace("project: selftest", "project: <프로젝트명>"))


@case("T31 STATE project와 SPEC 불일치", "FAIL", {"C19": "FAIL"})
def t31(root):
    build_fixture(root, state=STATE_OK.replace("project: selftest", "project: other"))


@case("T32 graph mode 불일치", "FAIL", {"C20": "FAIL"})
def t32(root):
    build_fixture(root, spec=SPEC_DEFAULT, state=STATE_OK, nodes=[])


@case("T33 custom FAIL ROUTE 빈칸", "FAIL", {"C20": "FAIL"})
def t33(root):
    build_fixture(root, spec=SPEC_OK.replace("| N1 | a | b | c | d | REPAIR N0 |",
                                             "| N1 | a | b | c | d |  |"))


@case("T34 updated_at date-only 금지", "FAIL", {"C22": "FAIL"})
def t34(root):
    build_fixture(root, state=STATE_OK.replace("updated_at: 2026-08-09T09:00:00+09:00",
                                               "updated_at: 2026-08-09"))


@case("T35 NODE_RESULT recorded_at date-only 금지", "FAIL", {"C22": "FAIL"})
def t35(root):
    nodes = [node_doc("N0", date="2026-08-09"), node_doc("N1", date=T1),
             node_doc("N2", "10 files / 100 tests", "5/5", "200 modules")]
    build_fixture(root, nodes=nodes)


@case("T36 NODE_RESULT verdict invalid", "FAIL", {"C23": "FAIL"})
def t36(root):
    nodes = [node_doc("N0", verdict="OK", date=T0), node_doc("N1", date=T1),
             node_doc("N2", "10 files / 100 tests", "5/5", "200 modules")]
    build_fixture(root, nodes=nodes)


# ------------------------------------- 과학교육 프로파일 개인정보/자동채점 선언
@case("T37 개인정보 수집 선언인데 Data Handling 미작성", "FAIL", {"C26": "FAIL"})
def t37(root):
    build_fixture(root, spec=SPEC_OK.replace("personal_data: none", "personal_data: collected"))


@case("T38 개인정보 수집 선언 + Data Handling 완비", "PASS")
def t38(root):
    spec = SPEC_OK.replace("personal_data: none", "personal_data: collected").replace(
        "## 12. Data Handling\n",
        "## 12. Data Handling\n\n"
        "- purpose: 학급 내 활동 결과 저장\n"
        "- items: 닉네임, 학급코드\n"
        "- retention: 학기 종료 후 30일 내 삭제\n"
        "- access: 담당 교사 1인\n"
        "- external_transfer: 없음\n")
    build_fixture(root, spec=spec)


@case("T39 자동채점 선언인데 근거 미작성", "FAIL", {"C26": "FAIL"})
def t39(root):
    build_fixture(root, spec=SPEC_OK.replace("auto_grading: none", "auto_grading: declared"))


@case("T40 personal_data 값이 허용 밖", "FAIL", {"C26": "FAIL"})
def t40(root):
    build_fixture(root, spec=SPEC_OK.replace("personal_data: none", "personal_data: maybe"))


# ============================================================================
# 패키지 자기정합 검사 — v4의 MIGRATION 문서 staleness 재발 방지
# ============================================================================

def package_consistency_failures():
    fails = []
    version_re = re.compile(r"^(?:package_)?version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s*$", re.M)
    date_only_re = re.compile(
        r"^\s*-?\s*(recorded_at|updated_at):\s*<?[0-9]{4}-[0-9]{2}-[0-9]{2}>?\s*$", re.M)
    for dirpath, dirnames, filenames in os.walk(PKG):
        dirnames[:] = [d for d in dirnames if d not in {"__pycache__", ".git"}]
        for fn in sorted(filenames):
            if not fn.endswith(".md"):
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, PKG)
            text = open(path, encoding="utf-8-sig").read()
            head = text[:text.find("\n---", 3)] if text.startswith("---") else ""
            for v in version_re.findall(head):
                if v != PACKAGE_VERSION:
                    fails.append("%s: version=%s (기대 %s)" % (rel, v, PACKAGE_VERSION))
            for m in date_only_re.finditer(text):
                fails.append("%s: %s가 date-only — checker가 차단하는 형식" % (rel, m.group(1)))
    return fails


def stale_count_failures():
    """문서가 self-test 개수를 잘못 적고 있는지 검사한다."""
    fails = []
    expected = str(len(CASES) + 2)
    pat = re.compile(r"self-?test[^\n]{0,40}?(\d+)\s*(?:개|/)", re.I)
    for rel in ("README.md", "docs/MIGRATION.md", "docs/VALIDATION_REPORT.md"):
        path = os.path.join(PKG, rel)
        if not os.path.isfile(path):
            continue
        text = open(path, encoding="utf-8-sig").read()
        for m in pat.finditer(text):
            if m.group(1) != expected:
                fails.append("%s: self-test 개수 %s (실제 %s)" % (rel, m.group(1), expected))
    return fails


def main():
    passed = failed = 0
    print("AI Control Package v%s 셀프테스트" % PACKAGE_VERSION)
    print("프로젝트 케이스 %d개 + 패키지 자기정합 2개\n" % len(CASES))

    for name, fn, want_verdict, want_checks in CASES:
        tmp = tempfile.mkdtemp(prefix="acp_")
        try:
            fn(tmp)
            res = run(tmp)
            got = res.get("verdict", "ERROR")
            ok = (got == want_verdict) or (want_verdict == "PASS" and got == "PASS_WITH_WARN")
            detail = []
            for cid, want in want_checks.items():
                g = check_of(res, cid)
                if g != want:
                    ok = False
                    detail.append("%s=%s(기대 %s)" % (cid, g, want))
            if ok:
                passed += 1
                print("  PASS  %s" % name)
            else:
                failed += 1
                print("  FAIL  %s — verdict=%s(기대 %s) %s"
                      % (name, got, want_verdict, " ".join(detail)))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    for label, fails in (("P01 패키지 문서 버전/날짜 형식 정합", package_consistency_failures()),
                         ("P02 문서의 self-test 개수 표기 정합", stale_count_failures())):
        if fails:
            failed += 1
            print("  FAIL  %s — %s" % (label, "; ".join(fails[:4])))
        else:
            passed += 1
            print("  PASS  %s" % label)

    print("\n통과 %d / 실패 %d" % (passed, failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
