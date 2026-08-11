#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_package.py — AI Control Package v5 검증 게이트

CONSTITUTION.md §9.1 (Machine-checked Definition of Done)을 기계 판정한다.
표준 라이브러리만 사용한다. 외부 패키지 설치가 필요 없다.

사용법:
    python tools/check_package.py             # 현재 폴더를 프로젝트 루트로
    python tools/check_package.py <경로>
    python tools/check_package.py --json      # 기계 판독용 출력

종료 코드:
    0  = 모든 BLOCKER 통과 (WARN이 있을 수 있음)
    1  = BLOCKER 1개 이상 실패
    2  = 실행 오류 (경로/파일 읽기 오류 등)
"""

import sys
import os
import re
import json
import hashlib
from datetime import datetime

PACKAGE_VERSION = "5.0.0"

VALID_STATUS = ["PASS", "RETRY", "REPAIR", "FALLBACK", "ESCALATE", "STOP"]
VALID_EVIDENCE = ["V0", "V1", "V2", "V3"]
DEFAULT_GRAPH = ["SPEC", "BUILD", "VERIFY", "EVALUATE", "USER CHECK", "COMPLETE"]
DEFAULT_TERMINAL = "COMPLETE"
MAX_RETRY = 3

# Freedom Floor 하드 하한 — 프로젝트가 자기 스펙으로 무력화할 수 없다.
HARD_FREEDOM_FLOOR = 1
RECOMMENDED_FREEDOM_FLOOR = 3
MIN_JUSTIFICATION_LEN = 20
RECOMMENDED_RATIO_CAP = 0.85

DATA_KEYS = ["purpose", "items", "retention", "access", "external_transfer"]
GRADING_KEYS = ["assessment_purpose", "answer_basis", "feedback_path"]

BLOCKER = "BLOCKER"
WARN = "WARN"

SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", ".venv", "__pycache__", ".next", "templates"
}

PLACEHOLDER_RE = re.compile(r"<[^>\n]{1,160}>")


# ----------------------------------------------------------------------
# 기본 유틸
# ----------------------------------------------------------------------

def read_text(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return f.read()


def parse_front_matter(text):
    """--- 로 감싼 앞부분을 평면 key: value 사전으로 파싱한다.
    중첩 매핑은 지원하지 않는다 (STATE 스키마는 의도적으로 평면이다)."""
    out = {}
    if not text.startswith("---"):
        return out
    end = text.find("\n---", 3)
    if end == -1:
        return out
    block = text[3:end]
    for line in block.splitlines():
        line = line.rstrip()
        if not line.strip() or line.strip().startswith("#"):
            continue
        if line.startswith((" ", "\t")):
            continue
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        v = v.strip()
        if "#" in v:
            v = v.split("#", 1)[0].strip()
        v = v.strip('"').strip("'")
        out[k.strip()] = v
    return out


def strip_code_fences(text):
    return re.sub(r"```.*?```", "", text, flags=re.S)


def body_after_front_matter(text):
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[end + 4:]
    return text


def get_section(text, keyword):
    """제목에 keyword가 들어간 ## 섹션 본문을 반환한다."""
    lines = body_after_front_matter(text).splitlines()
    buf, capturing = [], False
    for line in lines:
        if line.startswith("## "):
            if capturing:
                break
            capturing = keyword.lower() in line.lower()
            continue
        if capturing:
            buf.append(line)
    return "\n".join(buf)


def count_items(section_text):
    """placeholder(<...>)가 아닌 실제 목록 항목 수를 센다."""
    n = 0
    for line in strip_code_fences(section_text).splitlines():
        s = line.strip()
        if not (s.startswith("- ") or s.startswith("* ")):
            continue
        item = s[2:].strip()
        if not item or PLACEHOLDER_RE.fullmatch(item):
            continue
        n += 1
    return n


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def find_docs(root, doc_type):
    """front matter의 document 값이 doc_type인 md 파일 목록."""
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if not fn.endswith(".md"):
                continue
            p = os.path.join(dirpath, fn)
            try:
                head = read_text(p)[:1600]
            except Exception:
                continue
            fm = parse_front_matter(head)
            if fm.get("document") == doc_type:
                found.append(p)
    return sorted(found)


def is_placeholder(value):
    return not value or bool(PLACEHOLDER_RE.search(value))


def parse_iso_datetime(value):
    """timezone 포함 ISO-8601 datetime만 허용한다. 예: 2026-08-09T08:03:00+09:00"""
    if not value or "T" not in value:
        return None
    try:
        normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
        dt = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if dt.tzinfo is None:
        return None
    return dt


def parse_graph(spec):
    """PROJECT_SPEC의 Graph 섹션을 읽어 (mode, order, fail_routes)를 반환한다.

    표에 실제 노드 행이 하나라도 있으면 custom, 없으면 default로 본다.
    """
    graph_sec = get_section(spec, "Graph")
    order = []
    fail_routes = {}
    for line in graph_sec.splitlines():
        s = line.strip()
        if not (s.startswith("|") and s.endswith("|")):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if len(cells) < 6:
            continue
        node = cells[0]
        if not node or node.lower() == "node" or set(node) <= set("-: "):
            continue
        order.append(node)
        fail_routes[node] = cells[5]
    if order:
        return "custom", order, fail_routes
    return "default", list(DEFAULT_GRAPH), {}


def parse_int(value, default=None):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def labeled_values(section_text):
    """`- key: value` 형태의 줄을 사전으로 만든다."""
    out = {}
    for line in strip_code_fences(section_text).splitlines():
        s = line.strip()
        if not (s.startswith("- ") or s.startswith("* ")):
            continue
        item = s[2:]
        if ":" not in item:
            continue
        k, v = item.split(":", 1)
        out[k.strip().lower()] = v.strip()
    return out


def is_live(doc, state_revision):
    """현재 revision에서 유효한(폐기되지 않은) 노드 결과인가."""
    if str(doc.get("superseded", "")).lower() == "true":
        return False
    return doc.get("revision") == state_revision


def latest_by_node(node_docs):
    out = {}
    for d in node_docs:
        old = out.get(d["node"])
        if old is None or (d.get("dt") and (not old.get("dt") or d["dt"] > old["dt"])):
            out[d["node"]] = d
    return out


# ----------------------------------------------------------------------
# 결과 수집
# ----------------------------------------------------------------------

class Report:
    def __init__(self):
        self.rows = []

    def add(self, cid, severity, ok, message):
        self.rows.append({
            "id": cid,
            "severity": severity,
            "result": "PASS" if ok else "FAIL",
            "message": message,
        })

    def blockers(self):
        return [r for r in self.rows if r["severity"] == BLOCKER and r["result"] == "FAIL"]

    def warns(self):
        return [r for r in self.rows if r["severity"] == WARN and r["result"] == "FAIL"]


# ----------------------------------------------------------------------
# 검사 본체
# ----------------------------------------------------------------------

def run_checks(root, rep):
    spec_path = os.path.join(root, "PROJECT_SPEC.md")
    state_path = os.path.join(root, "STATE.md")
    tpl_spec = os.path.join(root, "templates", "PROJECT_SPEC_TEMPLATE.md")

    # --- C01 SPEC 존재 ---------------------------------------------------
    if not os.path.isfile(spec_path):
        rep.add("C01", BLOCKER, False, "PROJECT_SPEC.md 없음")
        return
    rep.add("C01", BLOCKER, True, "PROJECT_SPEC.md 존재")
    spec = read_text(spec_path)
    spec_fm = parse_front_matter(spec)

    # --- C02 템플릿 미작성 감지 ------------------------------------------
    if os.path.isfile(tpl_spec) and sha256(spec_path) == sha256(tpl_spec):
        rep.add("C02", BLOCKER, False, "PROJECT_SPEC.md가 템플릿과 동일. 아직 작성되지 않음")
    else:
        rep.add("C02", BLOCKER, True, "PROJECT_SPEC.md가 템플릿과 다름")

    # --- C03 필수 섹션/Front matter placeholder --------------------------
    unfilled = []
    for key in ["Domain Goal", "Primary User", "Primary Tasks", "Success Evidence", "P0"]:
        sec = strip_code_fences(get_section(spec, key))
        if PLACEHOLDER_RE.search(sec) or not sec.strip():
            unfilled.append(key)
    for key in ["project", "profile"]:
        if is_placeholder(spec_fm.get(key, "")):
            unfilled.append("frontmatter.%s" % key)
    if unfilled:
        rep.add("C03", BLOCKER, False, "미작성 항목: " + ", ".join(unfilled))
    else:
        rep.add("C03", BLOCKER, True, "필수 섹션과 front matter 작성 완료")

    # --- C04 P0 최소 1개 --------------------------------------------------
    p0 = count_items(get_section(spec, "P0"))
    rep.add("C04", BLOCKER, p0 >= 1, "P0 항목 %d개" % p0)

    # --- C05 Freedom Floor (하드 하한 + 하향 시 사유 강제) ----------------
    floor = parse_int(spec_fm.get("freedom_floor", RECOMMENDED_FREEDOM_FLOOR), None)
    fz = count_items(get_section(spec, "Freedom Zone"))
    just = spec_fm.get("freedom_floor_justification", "")
    problems = []
    if floor is None:
        problems.append("freedom_floor 파싱 실패")
    else:
        if floor < HARD_FREEDOM_FLOOR:
            problems.append("freedom_floor=%d — 하드 하한 %d 미만은 허용되지 않음 "
                            "(자유도 예약을 스펙으로 무력화할 수 없다)"
                            % (floor, HARD_FREEDOM_FLOOR))
        elif floor < RECOMMENDED_FREEDOM_FLOOR:
            if is_placeholder(just) or len(just.strip()) < MIN_JUSTIFICATION_LEN:
                problems.append("freedom_floor=%d < 권장 %d — freedom_floor_justification "
                                "%d자 이상 필요"
                                % (floor, RECOMMENDED_FREEDOM_FLOOR, MIN_JUSTIFICATION_LEN))
        if fz < max(floor, HARD_FREEDOM_FLOOR):
            problems.append("Freedom Zone %d개 < 요구 %d개"
                            % (fz, max(floor, HARD_FREEDOM_FLOOR)))
    rep.add("C05", BLOCKER, not problems,
            "Freedom Zone %d개 / floor=%s %s"
            % (fz, floor, "정상" if not problems else "— " + "; ".join(problems)))

    # --- C06 Control Ratio: 진단 지표 (BLOCKER가 아님) --------------------
    p1 = count_items(get_section(spec, "P1"))
    denom = p0 + p1 + fz
    if denom == 0:
        rep.add("C06", WARN, False, "Control Ratio 계산 불가 (항목 0개)")
    else:
        try:
            cap = float(spec_fm.get("control_ratio_cap", 0.70))
        except ValueError:
            cap = 0.70
        ratio = (p0 + p1) / denom
        note = ""
        if cap > RECOMMENDED_RATIO_CAP:
            note = " / control_ratio_cap=%.2f은 권장 범위(≤%.2f) 초과" % (cap, RECOMMENDED_RATIO_CAP)
        rep.add("C06", WARN, ratio <= cap and cap <= RECOMMENDED_RATIO_CAP,
                "Control Ratio %.2f (상한 %.2f) — 진단 WARN, 완료 차단 아님%s"
                % (ratio, cap, note))

    # --- C07 프로파일 존재 ------------------------------------------------
    prof = spec_fm.get("profile", "")
    pp = os.path.join(root, "profiles", "PROFILE_%s.md" % prof.replace("-", "_")) if prof else ""
    rep.add("C07", BLOCKER, bool(prof) and os.path.isfile(pp),
            "프로파일 '%s' %s" % (prof or "미지정", "확인" if pp and os.path.isfile(pp) else "파일 없음"))

    # --- C08 STATE 존재 ---------------------------------------------------
    if not os.path.isfile(state_path):
        rep.add("C08", BLOCKER, False, "STATE.md 없음 — 그래프 상태의 단일 소유자가 부재")
        return
    rep.add("C08", BLOCKER, True, "STATE.md 존재")
    state = read_text(state_path)
    st = parse_front_matter(state)

    graph_mode, order, fail_routes = parse_graph(spec)
    active = st.get("active_node", "")
    status = st.get("status", "")
    tn = st.get("terminal_node", "")
    tr = st.get("terminal_reached", "").lower()

    # --- C09 status 허용값 ------------------------------------------------
    rep.add("C09", BLOCKER, status in VALID_STATUS,
            "status='%s' (허용: %s)" % (status, "/".join(VALID_STATUS)))

    # --- C10 status별 필수 필드 -------------------------------------------
    missing = []
    if status == "REPAIR" and st.get("repair_target", "none").lower() == "none":
        missing.append("repair_target")
    if status == "FALLBACK":
        if st.get("fallback_reason", "none").lower() == "none":
            missing.append("fallback_reason")
        if st.get("fallback_target", "none").lower() == "none":
            missing.append("fallback_target")
    if status == "ESCALATE" and st.get("open_question", "none").lower() == "none":
        missing.append("open_question")
    if status == "STOP" and st.get("stop_reason", "none").lower() == "none":
        missing.append("stop_reason")
    rep.add("C10", BLOCKER, not missing,
            "status=%s 필수 필드 %s" % (status, "충족" if not missing else "누락: " + ", ".join(missing)))

    # --- C11 retry 상한 + status 정합 -------------------------------------
    try:
        rc = int(st.get("retry_count", 0))
    except ValueError:
        rc = -1
    retry_ok = 0 <= rc <= MAX_RETRY
    retry_msg = "retry_count=%s" % rc
    if retry_ok and status == "RETRY" and rc == 0:
        retry_ok = False
        retry_msg += " — RETRY 상태는 1~3이어야 함"
    if retry_ok and status in ("PASS", "REPAIR", "FALLBACK", "STOP") and rc != 0:
        retry_ok = False
        retry_msg += " — %s 상태에서는 0으로 초기화" % status
    rep.add("C11", BLOCKER, retry_ok, retry_msg)

    # --- C12 종료 상태/그래프 정합 ---------------------------------------
    terminal_ok = bool(tn) and tn.lower() != "none" and tr in ("true", "false") and tn in order
    if terminal_ok and graph_mode == "default" and tn != DEFAULT_TERMINAL:
        terminal_ok = False
    if terminal_ok and tr == "true" and not (active == tn and status == "PASS"):
        terminal_ok = False
    if terminal_ok and tr == "false" and active == tn:
        terminal_ok = False
    if terminal_ok and status in ("STOP", "ESCALATE") and tr == "true":
        terminal_ok = False
    rep.add("C12", BLOCKER, terminal_ok,
            "graph=%s, active='%s', terminal='%s', reached='%s', status='%s'"
            % (graph_mode, active, tn, tr, status))

    # --- C13 증거 등급 ----------------------------------------------------
    ev = st.get("evidence_level", "")
    rep.add("C13", BLOCKER, ev in VALID_EVIDENCE,
            "evidence_level='%s' (허용: %s)" % (ev, "/".join(VALID_EVIDENCE)))

    # --- C14 릴리스 주장 통제 --------------------------------------------
    if tr == "true" and ev in ("V0", "V1"):
        rep.add("C14", BLOCKER, False,
                "terminal_reached=true 인데 증거 등급이 %s — V2 이상 필요" % ev)
    else:
        rep.add("C14", BLOCKER, True, "종료 선언과 증거 등급 정합")

    # --- 노드 결과 문서 수집 ---------------------------------------------
    node_docs = []
    for p in find_docs(root, "NODE_RESULT"):
        fm = parse_front_matter(read_text(p)[:1800])
        node_docs.append({
            "path": os.path.relpath(p, root),
            "node": fm.get("node", ""),
            "verdict": fm.get("verdict", ""),
            "recorded_at": fm.get("recorded_at", ""),
            "dt": parse_iso_datetime(fm.get("recorded_at", "")),
            "revision": parse_int(fm.get("revision", ""), None),
            "revision_raw": fm.get("revision", ""),
            "superseded": fm.get("superseded", "false"),
            "unit": fm.get("evidence_unit", ""),
            "e2e": fm.get("evidence_e2e", ""),
            "build": fm.get("evidence_build", ""),
        })
    latest_docs = latest_by_node(node_docs)

    # --- C15 증거 드리프트 ------------------------------------------------
    state_rev_pre = parse_int(st.get("revision", ""), None)
    valid_timed = [d for d in node_docs
                   if d.get("dt") and (state_rev_pre is None or is_live(d, state_rev_pre))]
    if not valid_timed:
        rep.add("C15", WARN, True, "유효 시각의 노드 결과 문서 없음 — 드리프트 검사 생략")
    else:
        latest = max(valid_timed, key=lambda d: d["dt"])
        diffs = []
        for key, sfield in (("unit", "evidence_unit"), ("e2e", "evidence_e2e"), ("build", "evidence_build")):
            nv = (latest[key] or "").strip()
            sv = (st.get(sfield, "") or "").strip()
            if not nv or nv.lower() == "none" or PLACEHOLDER_RE.fullmatch(nv):
                continue
            if nv != sv:
                diffs.append("%s: NODE='%s' vs STATE='%s'" % (sfield, nv, sv))
        rep.add("C15", BLOCKER, not diffs,
                "STATE 증거와 최신 노드(%s) %s" %
                (latest["path"], "일치" if not diffs else "불일치 — " + "; ".join(diffs)))

    # --- C16 게이트: revision 기준 (시각 조작에 영향받지 않음) --------------
    state_dt = parse_iso_datetime(st.get("updated_at", ""))
    state_rev = parse_int(st.get("revision", ""), None)
    if active in order and node_docs and status != "PASS" and state_rev is not None:
        ai = order.index(active)
        ahead = sorted(set(
            d["node"] for d in node_docs
            if d["node"] in order and order.index(d["node"]) > ai and is_live(d, state_rev)
        ))
        rep.add("C16", BLOCKER, not ahead,
                "현재 노드(%s, status=%s) 하류에 살아있는 결과 %s"
                % (active, status,
                   "없음" if not ahead else ": " + ", ".join(ahead)
                   + " — revision을 올리거나 superseded: true로 폐기할 것"))
    else:
        rep.add("C16", WARN, True, "게이트 검사 생략 (PASS 상태 또는 노드 결과 없음)")

    # --- C24 상류 REPAIR 시 하류 산출물 폐기 강제 ---------------------------
    if status == "REPAIR" and state_rev is not None:
        target = st.get("repair_target", "none")
        if target in order:
            ti = order.index(target)
            stale_live = sorted(set(
                d["node"] for d in node_docs
                if d["node"] in order and order.index(d["node"]) > ti and is_live(d, state_rev)
            ))
            rep.add("C24", BLOCKER, not stale_live,
                    "상류 REPAIR(target=%s) 하류 미폐기 결과 %s"
                    % (target,
                       "없음" if not stale_live else ": " + ", ".join(stale_live)
                       + " — 상류를 고쳤으면 하류는 재검증 대상이다"))
        else:
            rep.add("C24", BLOCKER, False,
                    "repair_target='%s'이 그래프에 없어 폐기 범위를 판정할 수 없음" % target)
    else:
        rep.add("C24", WARN, True, "REPAIR 상태 아님 — 폐기 검사 해당 없음")

    # --- C25 revision 필드 정합 --------------------------------------------
    rev_bad = []
    if state_rev is None or state_rev < 1:
        rev_bad.append("STATE.revision='%s' (1 이상의 정수 필요)" % st.get("revision", ""))
    for d in node_docs:
        if d["revision"] is None or d["revision"] < 1:
            rev_bad.append("%s.revision='%s'" % (d["path"], d["revision_raw"]))
        elif state_rev is not None and d["revision"] > state_rev:
            rev_bad.append("%s.revision=%d > STATE.revision=%d"
                           % (d["path"], d["revision"], state_rev))
        if str(d["superseded"]).lower() not in ("true", "false"):
            rev_bad.append("%s.superseded='%s'" % (d["path"], d["superseded"]))
    rep.add("C25", BLOCKER, not rev_bad,
            "revision 정합 %s" % ("정상" if not rev_bad else "오류 — " + "; ".join(rev_bad)))

    # --- C17 custom 노드 연속성 (진단) -----------------------------------
    if graph_mode == "custom" and active in order and node_docs:
        predecessors = order[:order.index(active)]
        missing = [n for n in predecessors if n not in latest_docs]
        nonpass = [n for n in predecessors if n in latest_docs and latest_docs[n]["verdict"] != "PASS"]
        rep.add("C17", WARN, not missing and not nonpass,
                "선행 노드 결과 — 누락: %s / 비PASS: %s" %
                (", ".join(missing) if missing else "없음", ", ".join(nonpass) if nonpass else "없음"))
    else:
        rep.add("C17", WARN, True, "기본 그래프 또는 선행 결과 없음 — 연속성 진단 생략")

    # --- C18 커밋되지 않은 증거 표기 -------------------------------------
    ec = st.get("evidence_committed", "").lower()
    if ec not in ("true", "false"):
        rep.add("C18", WARN, False, "evidence_committed 미표기")
    elif ec == "false" and tr == "true":
        rep.add("C18", WARN, False, "종료 선언 상태인데 증거가 원격에 커밋되지 않음 — 재현성 낮음")
    else:
        rep.add("C18", WARN, True, "evidence_committed=%s" % ec)

    # --- C19 STATE 정체성/placeholder/version 정합 -----------------------
    state_required = ["document", "package_version", "project", "graph", "active_node",
                      "status", "terminal_node", "terminal_reached", "updated_at", "revision"]
    state_bad = [k for k in state_required if is_placeholder(st.get(k, ""))]
    identity_ok = (not state_bad and st.get("document") == "STATE"
                   and st.get("project") == spec_fm.get("project")
                   and st.get("package_version") == PACKAGE_VERSION
                   and spec_fm.get("package_version") == PACKAGE_VERSION)
    rep.add("C19", BLOCKER, identity_ok,
            "STATE/SPEC 정체성 %s%s" %
            ("정상" if identity_ok else "불일치", " — placeholder: " + ", ".join(state_bad) if state_bad else ""))

    # --- C20 Graph contract: mode/active/custom FAIL ROUTE ----------------
    graph_ok = st.get("graph") == graph_mode and active in order
    bad_routes = []
    if graph_mode == "custom":
        for node, route in fail_routes.items():
            if not route or is_placeholder(route):
                bad_routes.append(node)
        if bad_routes:
            graph_ok = False
    rep.add("C20", BLOCKER, graph_ok,
            "graph mode STATE='%s'/SPEC='%s', active='%s'%s" %
            (st.get("graph", ""), graph_mode, active,
             " / 빈 FAIL ROUTE: " + ", ".join(bad_routes) if bad_routes else ""))

    # --- C21 REPAIR/FALLBACK 목적지 유효성 -------------------------------
    target_ok = True
    target_msg = "해당 없음"
    if status == "REPAIR":
        target = st.get("repair_target", "none")
        target_ok = target in order
        if target_ok and active in order:
            target_ok = order.index(target) <= order.index(active)
        target_msg = "repair_target='%s'" % target
    elif status == "FALLBACK":
        target = st.get("fallback_target", "none")
        target_ok = target in order and target != tn
        target_msg = "fallback_target='%s'" % target
    rep.add("C21", BLOCKER, target_ok, target_msg)

    # --- C22 timestamps ISO datetime -------------------------------------
    bad_times = []
    if not state_dt:
        bad_times.append("STATE.updated_at")
    for d in node_docs:
        if not d.get("dt"):
            bad_times.append("%s.recorded_at" % d["path"])
    rep.add("C22", BLOCKER, not bad_times,
            "ISO datetime(+timezone) %s" % ("정상" if not bad_times else "오류: " + ", ".join(bad_times)))

    # --- C23 NODE_RESULT metadata/verdict --------------------------------
    node_bad = []
    for d in node_docs:
        if is_placeholder(d["node"]) or d["node"] not in order:
            node_bad.append("%s:node=%s" % (d["path"], d["node"]))
        if d["verdict"] not in VALID_STATUS:
            node_bad.append("%s:verdict=%s" % (d["path"], d["verdict"]))
    rep.add("C23", BLOCKER, not node_bad,
            "NODE_RESULT metadata %s" % ("정상" if not node_bad else "오류 — " + "; ".join(node_bad)))

    # --- C26 과학교육 프로파일: 개인정보·자동채점 선언 강제 -----------------
    if prof == "science-education":
        problems = []
        pd = (spec_fm.get("personal_data", "") or "").strip().lower()
        ag = (spec_fm.get("auto_grading", "") or "").strip().lower()
        if pd not in ("none", "collected"):
            problems.append("personal_data='%s' (none|collected)" % pd)
        if ag not in ("none", "declared"):
            problems.append("auto_grading='%s' (none|declared)" % ag)
        dh = labeled_values(get_section(spec, "Data Handling"))
        if pd == "collected":
            for k in DATA_KEYS:
                v = dh.get(k, "")
                if not v or is_placeholder(v):
                    problems.append("Data Handling.%s 미작성" % k)
        if ag == "declared":
            for k in GRADING_KEYS:
                v = dh.get(k, "")
                if not v or is_placeholder(v):
                    problems.append("Data Handling.%s 미작성" % k)
        rep.add("C26", BLOCKER, not problems,
                "SE 개인정보/자동채점 선언 %s"
                % ("정상 (personal_data=%s, auto_grading=%s)" % (pd, ag)
                   if not problems else "미비 — " + "; ".join(problems)))
    else:
        rep.add("C26", WARN, True, "science-education 프로파일 아님 — SE 선언 검사 해당 없음")


# ----------------------------------------------------------------------
# 출력
# ----------------------------------------------------------------------

def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    as_json = "--json" in argv
    root = os.path.abspath(args[0]) if args else os.getcwd()

    if not os.path.isdir(root):
        print("경로를 찾을 수 없습니다: %s" % root)
        return 2

    rep = Report()
    try:
        run_checks(root, rep)
    except Exception as e:
        print("검사 중 오류: %s" % e)
        return 2

    blockers, warns = rep.blockers(), rep.warns()
    verdict = "FAIL" if blockers else ("PASS_WITH_WARN" if warns else "PASS")

    if as_json:
        print(json.dumps({
            "package_version": PACKAGE_VERSION,
            "root": root,
            "verdict": verdict,
            "checks": rep.rows,
        }, ensure_ascii=False, indent=2))
        return 1 if blockers else 0

    print("AI Control Package v%s — 검증 게이트" % PACKAGE_VERSION)
    print("대상: %s" % root)
    print("-" * 72)
    for r in rep.rows:
        mark = "PASS" if r["result"] == "PASS" else ("FAIL" if r["severity"] == BLOCKER else "WARN")
        print("[%-4s] %-4s  %s" % (mark, r["id"], r["message"]))
    print("-" * 72)
    print("BLOCKER 실패 %d건 / WARN %d건" % (len(blockers), len(warns)))
    print("판정: %s" % verdict)
    if blockers:
        print("\n다음을 먼저 해결하십시오:")
        for b in blockers:
            print("  - %s: %s" % (b["id"], b["message"]))
    elif warns:
        print("\nWARN은 완료를 차단하지 않지만 검토 후 진행하십시오:")
        for w in warns:
            print("  - %s: %s" % (w["id"], w["message"]))
    return 1 if blockers else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
