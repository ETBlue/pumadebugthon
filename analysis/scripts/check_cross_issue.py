"""Check the cross-issue analysis, and read it into structured data.

Usage: python3 -I analysis/scripts/check_cross_issue.py analysis/cross-issue/cross-issue-analysis.md

The file compares the issues that share stakeholders (see method.md,
跨議題分析). It is in analysis/cross-issue/. The issue files and the shared
CSV files are read from the analysis folder (the parent of cross-issue/).

build_json.py uses read_cross_issue() from this file, so the check and the
JSON read the file the same way. read_cross_issue() returns (data, errors);
the data is only complete when errors is empty.

IDs:
- A stakeholder ID (O01, I06) is shared by all issues, so it has no issue
  number.
- Story, need, conflict, group and solution IDs belong to one issue, so they
  always start with 「#」, the issue number and one space: 「#2 I01-US09」,
  「#1 N05」, 「#2 C9」, 「#8 解法 A」. A story or N ID without it is an error.
- The file's own IDs: X-N01 (a cross-issue need group), X-C1 (a cross-issue
  conflict) and 解法 X-A (a combined solution; the code is X-A).

Rules checked (see method.md, 跨議題分析):
- Tags are in backticks; a 【待補：…】 item says what is missing; no example
  from an excluded country.
- Every reference exists: in the issue file it names, or in this file.
- 分析摘要: the 5 topics in the fixed order (analysis_common.SUMMARY_TOPICS).
- 1.1 lists exactly the stakeholders that are in step 1 of 2 or more
  issues, with all their stories in each issue.
- 1.2 lists one stakeholder's need that appears in 2 or more issues.
- 1.3 and 4.4: one row per 特別關注 group, in the fixed order.
- 2.1: each X-N group joins needs of 2 or more issues; it has 2 or more
  stories and 2 or more stakeholders; its story and stakeholder lists match
  the issue files. A need is in at most one X-N group.
- 2.2: the priority comes from the issues. It is never raised: when the
  issues agree, it is that letter; when they differ, it is 「各議題不同」.
- 3: every issue conflict whose row names another issue is in an X-C row.
  The 6.4 rules apply (one 「 vs 」, needs on both sides, a way out with
  combined solution codes or 「未找到」 plus a 審議 method).
- 4.1: each combined solution joins 2 or more issue solutions from 2 or
  more issues; its spaces are spaces of those solutions.
- 4.2: a need is listed only if one of the solution's parts covers it in
  the issue's 6.2, in the column of its issue priority. Every X-N group is
  covered by at least one combined solution.
- 4.3: 「來自」 is 「新指標」 or a part of the combined solution.
- 4.5: one section 「### 4.5.n 解法 X-A：…」 per combined solution, with the
  same tables as a step 7 solution section of an issue file (ETBlue,
  2026-10-23; analysis_common.step7_tables): the evaluation table, the plan
  table (執行計畫) and, if needed, the dependency table (相依事項與現行政策的
  關係). A cell has one tag and text, or is one 【待補：…】 item. The
  災害風險 cell is not empty. Each dependency row names the solution of its
  section; a row that names several solutions is under each, with the same
  text. The 分析摘要 topic 相依事項與現行政策的關係 has no row that names a
  combined solution.
"""
import csv, datetime, os, re, sys, unicodedata

# python3 -I does not put the script folder on sys.path, so add it for analysis_common.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analysis_common as common

CROSS_FOLDER = "cross-issue"
CROSS_FILE = "cross-issue-analysis.md"

# Countries whose examples are not used (human-inputs.md step 6, method.md 步驟 6).
# Hong Kong after 1997-07-01 counts as China.
EXCLUDED_WORDS = ("中國", "伊朗", "北韓", "香港")

# A reference to an ID of one issue: 「#2 I01-US09」, 「#1 N05」, 「#8 解法 A」.
# Group 1 is the issue number, group 2 the ID.
REF = re.compile(r"#(\d+) (解法 [A-Z]|[OI]\d\d-US\d\d|[OI]\d\d|C\d+|W\d\d|N\d\d)(?![0-9A-Za-z])")
X_NEED = re.compile(r"(?<![A-Za-z0-9])X-N\d\d(?![0-9])")
X_CONFLICT = re.compile(r"(?<![A-Za-z0-9])X-C\d+(?![0-9])")
X_CODE = re.compile(r"(?<![A-Za-z0-9])X-[A-Z](?![A-Za-z0-9-])")
STAKEHOLDER = re.compile(r"(?<![A-Za-z0-9-])[OI]\d\d(?![0-9-])")
TAGGED = re.compile(rf"^`\[(?:{common.TAG_NAMES})\]` \S")
PENDING_ITEM = re.compile(r"^【待補：[^】]+】$")
TAG = re.compile(rf"`?{common.TAG_RE}`?")

SHARED_FIXED = ["利害關係人編號", "利害關係人", "特別關注", "議題"]
REPEAT_HEADER = ["利害關係人編號", "需求（摘要）", "各議題的需求", "說明"]
FOCUS_HEADER = ["特別關注", "共用的利害關係人", "說明"]
XN_HEADER = ["群組", "以便（摘要）", "各議題的需求", "故事編號", "利害關係人"]
XP_HEADER = ["群組", "各議題的優先順序", "跨議題的優先順序", "理由"]
XC_HEADER = ["#", "衝突", "相關的議題衝突", "相關故事", "雙方的需求", "以需求為本的解方", "可能的審議方法", "模擬結果"]
XS_HEADER = ["代號", "解法", "合併的議題解法", "空間類型", "新增日期", "一句話說明"]
XMAP_HEADER = ["代號", "解法", "涵蓋的 Must 需求", "涵蓋的 Should / Could 需求", "涵蓋的跨議題共同需求"]
XM_HEADER = ["解法", "指標", "目前數值（基準值）", "資料來源", "來自"]
XF_HEADER = ["特別關注", "相關的合併解法", "說明"]
# The 跨議題的優先順序 cell when the issue priorities are not the same.
PRIORITY_DIFFERENT = "各議題不同"
# The 來自 cell of a measure that no issue has.
NEW_MEASURE = "新指標"

SECTIONS = {"shared": "### 1.1", "repeat": "### 1.2", "focus": "### 1.3", "needs": "### 2.1", "priority": "### 2.2",
            "conflicts": "## 3", "solutions": "### 4.1", "map": "### 4.2", "measures": "### 4.3",
            "solutionFocus": "### 4.4", "evaluation": "### 4.5"}


# ---------- one issue file ----------

class Issue:
    """The IDs of one issue file that the cross-issue file can refer to."""

    def __init__(self, num, folder, text):
        self.num, self.folder, self.text = num, folder, text
        self.ids = common.issue_ids(text)
        # Story ID -> its 相同需求編號 (N01) or 「—」.
        self.need_of = {}
        for h, rows in common.tables(common.section(text, "## 步驟 4") or []):
            if "故事編號" in h and "相同需求編號" in h:
                i, n = h.index("故事編號"), h.index("相同需求編號")
                for r in rows:
                    if len(r) == len(h):
                        self.need_of[r[i]] = r[n]
        self.group_stories = {}
        for sid, n in self.need_of.items():
            if n != "—":
                self.group_stories.setdefault(n, []).append(sid)
        # Need ID (N01, or the story ID of a need in no group) -> M, S, C or W.
        self.need_prio = {}
        for h, rows in common.tables(common.section(text, "### 5.2") or []):
            if h == common.NEED_PRIORITY_HEADER:
                for r in rows:
                    m = re.search(r"\b([MSCW])$", r[3]) if len(r) == len(h) else None
                    if m:
                        self.need_prio[r[0]] = m.group(1)
        # Solution code -> its space codes (6.1), and the needs it covers (6.2).
        self.spaces = {}
        for h, rows in common.tables(common.section(text, "### 6.1") or []):
            if h and h[0] == "代號" and "空間類型" in h:
                for r in rows:
                    if len(r) == len(h) and re.fullmatch(r"[A-Z]", r[0]):
                        self.spaces[r[0]] = re.findall(r"`([^`]+)`", r[h.index("空間類型")])
        self.covers = {}
        for h, rows in common.tables(common.section(text, "### 6.2") or []):
            if h == common.NEED_MAP_HEADER:
                for r in rows:
                    if len(r) == len(h):
                        body = " ".join(TAG.sub("", c) for c in r[2:])
                        self.covers[r[0]] = {x.strip() for x in re.split(r"[、\s]+", body) if x.strip() not in ("", "—")}
        # Conflict ID -> the row text (6.4).
        self.conflict_rows = {}
        for h, rows in common.tables(common.section(text, common.conflict_heading(text)) or []):
            if h and h[0] == "#":
                for r in rows:
                    self.conflict_rows[r[0]] = " | ".join(r)

    def stakeholders(self):
        return common.step1_ids(self.text)

    def story_holder(self, sid):
        return sid.split("-")[0]

    def need_stories(self, nid):
        """The stories of a need: the stories of an N group, or the story itself."""
        return self.group_stories.get(nid, []) if nid.startswith("N") else [nid]

    def has(self, rid):
        """True if the ID exists in this issue (any kind)."""
        if rid.startswith("解法 "):
            return rid[3:] in self.ids["solution"]
        if "-US" in rid:
            return rid in self.ids["story"]
        if rid[0] in "OI":
            return rid in self.ids["stakeholder"]
        return rid in self.ids[{"C": "conflict", "W": "group", "N": "need"}[rid[0]]]


def load_context(analysis_dir):
    """The issues (number -> Issue), the active stakeholders.csv rows (ID -> row)
    and the space codes."""
    def read_csv(name):
        with open(common.data_file(analysis_dir, name), encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))
    issues = {}
    for r in read_csv("issues.csv"):
        md = os.path.join(analysis_dir, r["資料夾"], "issue-analysis.md")
        if os.path.exists(md):
            with open(md, encoding="utf-8") as f:
                issues[int(r["編號"])] = Issue(int(r["編號"]), r["資料夾"], f.read())
    stake = {r["利害關係人編號"]: r for r in read_csv("stakeholders.csv") if not r["備註"].startswith("已改為")}
    spaces = {r["代碼"] for r in read_csv("space-types.csv")}
    return {"issues": issues, "stakeholders": stake, "spaces": spaces, "dir": analysis_dir}


# ---------- helpers ----------

def parse_cell(s):
    """A cell with an optional tag -> {"text", "tag", "pending"} (the same shape as build_json.parse_cell)."""
    s = s.strip()
    tags = TAG.findall(s)
    text = re.sub(r"  +", " ", TAG.sub("", s)).strip()
    tag = tags[0] if tags else None
    return {"text": text, "tag": tag, "pending": tag is None and text.startswith("【待補")}


def split_list(value):
    """The items of a list cell, split on 「、」, without the tag. 「—」 or empty -> []."""
    v = TAG.sub("", value).strip()
    return [] if v in ("", "—") else [x.strip() for x in v.split("、") if x.strip()]


def ref_obj(num, rid):
    return {"issue": num, "id": rid}


def one_table(text, prefix, header, err, name):
    """The rows of the one table with this header in the section, as dicts. [] after an error."""
    body = common.section(text, prefix)
    if body is None:
        err(f"{name}: no heading 「{prefix}」"); return []
    found = [(h, rows) for h, rows in common.tables(body) if h == header]
    if len(found) != 1:
        err(f"{name} ({prefix}): expected one table with the header {' | '.join(header)}, found "
            f"{[' | '.join(h) for h, _ in common.tables(body)]}")
        return []
    out = []
    for r in found[0][1]:
        if len(r) != len(header):
            err(f"{name}: row 「{r[0]}」 has {len(r)} cells, expected {len(header)}"); continue
        out.append(dict(zip(header, r)))
    return out


def date_problem(value):
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", value):
        return f"{value!r} is not YYYY-MM-DD"
    try:
        d = datetime.date.fromisoformat(value)
    except ValueError:
        return f"{value} is not a real date"
    if d > common.today():
        return f"{value} is in the future (today in Taiwan is {common.today().isoformat()})"
    return None


def slug(h):
    h = re.sub(r"`", "", h).strip().lower()
    h = "".join(ch for ch in h if ch in " -_" or unicodedata.category(ch)[0] in "LNM")
    return h.replace(" ", "-")


# ---------- the whole file ----------

def compared_issues(title):
    """The issue numbers in the title, sorted: 「跨議題分析：#1、#2、#8（試作）」 -> [1, 2, 8]."""
    return sorted({int(n) for n in re.findall(r"#(\d+)", title or "")})


def not_compared(ctx, nums):
    """The issues with an analysis that the file does not compare but that
    share a stakeholder with a compared issue: {issue number: [stakeholder IDs]}."""
    in_compared = {sid for n in nums for sid in ctx["issues"][n].stakeholders()}
    out = {}
    for n, iss in sorted(ctx["issues"].items()):
        if n in nums: continue
        ids = [sid for sid in iss.stakeholders() if sid in in_compared]
        if ids: out[n] = ids
    return out


def read_cross_issue(text, ctx):
    """Check the cross-issue file and read it. Returns (data, errors)."""
    errors = []
    def err(m): errors.append(m)
    issues, stake = ctx["issues"], ctx["stakeholders"]

    def issue_ref(num, rid, where):
        """Check one 「#n ID」 reference. Returns the Issue, or None after an error."""
        if num not in issues:
            err(f"{where}: #{num} {rid}: issue #{num} has no analysis file"); return None
        if not issues[num].has(rid):
            err(f"{where}: #{num} {rid} is not in issue #{num} ({issues[num].folder})"); return None
        return issues[num]

    def need_ref(ref, where):
        """「#n N05」 or 「#n <story of a need in no group>」 -> (num, id), or None after an error."""
        m = REF.fullmatch(ref)
        if not m:
            err(f"{where}: 「{ref}」 is not a need of an issue (write 「#n N01」, or 「#n」 and the story ID of a need in no group)")
            return None
        num, rid = int(m.group(1)), m.group(2)
        iss = issue_ref(num, rid, where)
        if iss is None:
            return None
        if rid not in iss.need_prio:
            err(f"{where}: #{num} {rid} is not a need in 5.2 of issue #{num} (an N ID, or the story ID of a need in no group)")
            return None
        return num, rid

    # ----- whole text -----
    for t_ in re.findall(rf"(?<!`){common.TAG_RE}(?!`)", text):
        err(f"tag [{t_}] without backticks")
    near = {t.upper() for t in common.TAGS}
    for t_ in sorted(set(re.findall(r"\[[^\[\]]{1,12}\]", text))):
        if t_.strip("[]") not in common.TAGS and re.sub(r"\s", "", t_.strip("[]")).upper() in near:
            err(f"tag variant {t_}; write one of {', '.join(f'[{t}]' for t in common.TAGS)}")
    for n, line in enumerate(text.splitlines(), 1):
        plain = re.sub(r"`[^`]*`", "", line)
        for m in re.finditer(r"【待補[^】]*】", plain):
            if not re.fullmatch(r"【待補：[^】]+】", m.group(0)):
                err(f"line {n}: bad 待補 item {m.group(0)!r}; write 【待補：…】 with the explanation inside")
        for w in EXCLUDED_WORDS:
            if w in line:
                err(f"line {n}: 「{w}」: examples from this place are not used (method.md, 步驟 6)")
        if re.search(r"`\[AI整理\]`\s*新聞報導", line) and "【待補：查證" not in line:
            err(f"line {n}: an [AI整理] news cell needs a 【待補：查證…】 item in the same row")
        # A cell holds at most one tag. Only the step 7 solution tables of an
        # issue file may hold more (ETBlue, 2026-10-22; method.md, 標記).
        if line.startswith("|"):
            for c in common.split_cells(line):
                k = len(re.findall(rf"`{common.TAG_RE}`", c))
                if k > 1:
                    err(f"line {n}: a cell has {k} tags; a cell in this file has at most one: {c[:40]!r}")

    # Every 「#n ID」 exists; no story, need, conflict, group or solution ID without 「#n」.
    for m in REF.finditer(text):
        issue_ref(int(m.group(1)), m.group(2), "reference")
    rest = X_CODE.sub(" ", X_CONFLICT.sub(" ", X_NEED.sub(" ", REF.sub(" ", text))))
    rest = re.sub(r"\]\([^)]*\)", "]()", rest)  # link targets
    for pat, what in ((r"(?<![A-Za-z0-9-])[OI]\d\d-US\d\d", "story"), (r"(?<![A-Za-z0-9-])N\d\d(?![0-9])", "need"),
                      (r"(?<![A-Za-z0-9-])C\d+(?![0-9])", "conflict"), (r"(?<![A-Za-z0-9-])W\d\d(?![0-9])", "group"),
                      (r"解法 [A-Z](?![A-Za-z0-9-])", "solution")):
        for x in sorted(set(re.findall(pat, rest))):
            err(f"{x}: a {what} ID belongs to one issue; write 「#n {x}」 (n is the issue number)")
    for x in sorted(set(STAKEHOLDER.findall(rest))):
        if x not in stake:
            err(f"{x}: not an active stakeholder in stakeholders.csv")

    # ----- title and 空間類型 -----
    lines = text.splitlines()
    title = lines[0][2:].strip() if lines and lines[0].startswith("# ") else None
    if title is None:
        err("the first line must be the title 「# …」")
    # The issues this file compares are the 「#n」 numbers in the title, for
    # example 「# 跨議題分析：#1、#2、#8（試作）」. Only these issues are checked.
    # Another issue that shares stakeholders is not an error: main() prints a
    # NOTE, and the owner decides when to add it.
    nums = compared_issues(title)
    if title is not None and not nums:
        err("the title must name the issues the file compares, for example 「# 跨議題分析：#1、#2、#8」")
    for n in nums:
        if n not in issues: err(f"the title names #{n}, but issue #{n} has no analysis file")
    nums = [n for n in nums if n in issues]
    file_spaces = []
    if len(lines) > 2 and lines[1] == "" and lines[2].startswith("空間類型："):
        body = lines[2][len("空間類型："):]
        file_spaces = re.findall(r"`([^`]+)`", body)
        if not file_spaces or "、".join(f"`{c}`" for c in file_spaces) != body.strip():
            err(f"空間類型 line must be codes in backticks separated by 、: {lines[2]}")
        for c in file_spaces:
            if c not in ctx["spaces"]: err(f"空間類型 line: unknown space code {c}")
    else:
        err("no 「空間類型：」 line right under the title")

    # ----- own IDs (needed by the summary) -----
    xn_rows = one_table(text, SECTIONS["needs"], XN_HEADER, err, "跨議題的相同需求群組")
    xc_rows = one_table(text, SECTIONS["conflicts"], XC_HEADER, err, "跨議題的衝突")
    xs_rows = one_table(text, SECTIONS["solutions"], XS_HEADER, err, "合併的解法")
    xn_ids = []
    for r in xn_rows:
        m = re.fullmatch(rf"`\[(?:{common.TAG_NAMES})\]` (X-N\d\d)", r["群組"])
        if not m: err(f"2.1: 群組 must be a tag and an X-N ID: {r['群組']!r}"); continue
        if m.group(1) in xn_ids: err(f"2.1: {m.group(1)} is listed twice")
        xn_ids.append(m.group(1))
    xc_ids = []
    for r in xc_rows:
        if not re.fullmatch(r"X-C\d+", r["#"]): err(f"3: bad conflict ID {r['#']!r}"); continue
        if r["#"] in xc_ids: err(f"3: {r['#']} is listed twice")
        xc_ids.append(r["#"])
    xs_codes = []
    for r in xs_rows:
        if not re.fullmatch(r"X-[A-Z]", r["代號"]): err(f"4.1: 代號 must be X and one capital letter: {r['代號']!r}"); continue
        if r["代號"] in xs_codes: err(f"4.1: {r['代號']} is listed twice")
        xs_codes.append(r["代號"])
    for x in sorted(set(X_NEED.findall(text)) - set(xn_ids)): err(f"{x} is referenced but is not in 2.1")
    for x in sorted(set(X_CONFLICT.findall(text)) - set(xc_ids)): err(f"{x} is referenced but is not in 3")
    for x in sorted(set(X_CODE.findall(text)) - set(xs_codes)): err(f"{x} is referenced but is not in 4.1")

    # ----- 分析摘要 -----
    summary = []
    s_lines = common.summary_lines(text)
    if s_lines is None:
        err(f"分析摘要: no heading 「{common.SUMMARY_HEADING}」")
    else:
        topics = common.summary_topics(s_lines)
        got = [n for n, _ in topics]
        if got != list(common.SUMMARY_TOPICS):
            if sorted(got) == sorted(common.SUMMARY_TOPICS):
                err(f"分析摘要: the topics must be in the fixed order {'、'.join(common.SUMMARY_TOPICS)}")
            else:
                err(f"分析摘要: the topics must be {'、'.join(common.SUMMARY_TOPICS)}; found {'、'.join(got)}")
        for name, body in topics:
            found = [rows for h, rows in common.tables(body) if h == common.SUMMARY_HEADER]
            # The 相依事項與現行政策的關係 topic keeps only the rows that name no
            # combined solution; it has no table when every row moved to 4.5.
            if name == common.DEPENDENCY_TOPIC and not common.tables(body):
                summary.append({"topic": name, "items": []}); continue
            if len(found) != 1:
                err(f"分析摘要 {name}: expected one table with the header {' | '.join(common.SUMMARY_HEADER)}"); continue
            items = []
            for c in found[0]:
                if len(c) != 3: err(f"分析摘要 {name}: row 「{c[0]}」 has {len(c)} cells"); continue
                item, note, refs_cell = c
                where = f"分析摘要 {name} 「{item}」"
                tagged = TAGGED.match(note) is not None
                if not tagged and not PENDING_ITEM.match(note):
                    err(f"{where}: 說明 must start with a tag, or be one 【待補：…】 item")
                refs = common.split_refs(refs_cell)
                if tagged and not refs: err(f"{where}: 相關編號 is empty")
                for ref in refs:
                    if REF.fullmatch(ref) or re.fullmatch(r"X-N\d\d|X-C\d+|解法 X-[A-Z]", ref):
                        continue  # existence is checked on the whole text
                    if re.fullmatch(r"[OI]\d\d", ref):
                        continue  # a global stakeholder ID, checked on the whole text
                    err(f"{where}: 「{ref}」 is not a reference (write 「#n ID」 for an ID of an issue, or X-N01, X-C1, 解法 X-A, or a stakeholder ID)")
                codes_ = common.ref_solutions(refs, "X-")
                if name == common.DEPENDENCY_TOPIC and codes_:
                    err(f"{where}: names {'、'.join('解法 ' + c for c in codes_)}; move the row to the "
                        f"{common.DEPENDENCY_TOPIC} table of 4.5")
                items.append({"item": item, "text": parse_cell(note), "refs": refs, "solutions": codes_})
            summary.append({"topic": name, "items": items})

    # ----- 1.1 shared stakeholders -----
    in_issues = {}
    for num in nums:
        for sid in issues[num].stakeholders():
            in_issues.setdefault(sid, []).append(num)
    want_shared = sorted((sid for sid, ns in in_issues.items() if len(ns) >= 2), key=lambda s: (s[0] != "O", s))
    shared_header = SHARED_FIXED + [f"#{n} 的故事" for n in nums]
    shared = []
    for r in one_table(text, SECTIONS["shared"], shared_header, err, "共用的利害關係人"):
        sid = r["利害關係人編號"]
        where = f"1.1 {sid}"
        if sid not in want_shared: err(f"{where}: is not in step 1 of 2 or more issues"); continue
        row = stake.get(sid, {})
        if r["利害關係人"] != row.get("利害關係人"): err(f"{where}: name {r['利害關係人']} != stakeholders.csv {row.get('利害關係人')}")
        if common.split_focus(r["特別關注"]) != common.split_focus(row.get("特別關注", "")):
            err(f"{where}: 特別關注 {r['特別關注']} != stakeholders.csv {row.get('特別關注') or '—'}")
        want_nums = "、".join(f"#{n}" for n in in_issues[sid])
        if r["議題"] != want_nums: err(f"{where}: 議題 must be 「{want_nums}」")
        stories = []
        for num in nums:
            want = [f"#{num} {s}" for s in issues[num].need_of if s.split("-")[0] == sid]
            got_ = split_list(r[f"#{num} 的故事"])
            if got_ != want:
                err(f"{where}: #{num} 的故事 must list all its stories in issue #{num}, in step 4 order: {'、'.join(want) or '—'}")
            stories += [ref_obj(num, s.split(" ")[1]) for s in want]
        shared.append({"id": sid, "name": r["利害關係人"], "focus": common.split_focus(r["特別關注"]),
                       "issues": in_issues[sid], "stories": stories})
    got_shared = [s["id"] for s in shared]
    for sid in want_shared:
        if sid not in got_shared: err(f"1.1: {sid} is in step 1 of issues {in_issues[sid]} but has no row")
    if [s for s in got_shared if s in want_shared] != [s for s in want_shared if s in got_shared]:
        err("1.1: list the stakeholders in ID order (O first, then I), not by any count")

    # ----- 1.2 one stakeholder's need in several issues -----
    repeated = []
    for r in one_table(text, SECTIONS["repeat"], REPEAT_HEADER, err, "同一位利害關係人的相同需求"):
        sid, where = r["利害關係人編號"], f"1.2 {r['利害關係人編號']}"
        if sid not in got_shared: err(f"{where}: is not a shared stakeholder in 1.1")
        needs, used = [], set()
        for ref in split_list(r["各議題的需求"]):
            p = need_ref(ref, where)
            if p is None: continue
            num, nid = p
            if sid not in {s.split("-")[0] for s in issues[num].need_stories(nid)}:
                err(f"{where}: #{num} {nid} is not a need of {sid}")
            used.add(num)
            needs.append(ref_obj(num, nid))
        if len(used) < 2: err(f"{where}: the need must be in 2 or more issues")
        if not TAGGED.match(r["說明"]): err(f"{where}: 說明 must start with a tag")
        repeated.append({"stakeholder": sid, "summary": r["需求（摘要）"], "needs": needs, "note": parse_cell(r["說明"])})

    # ----- 1.3 and 4.4 focus tables -----
    def focus_table(prefix, header, name, check_row):
        out = []
        rows = one_table(text, prefix, header, err, name)
        got_ = [r[header[0]] for r in rows]
        if got_ != list(common.FOCUS_GROUPS):
            if sorted(got_) == sorted(common.FOCUS_GROUPS):
                err(f"{name}: the groups must be in the fixed order {'、'.join(common.FOCUS_GROUPS)}")
            else:
                err(f"{name}: expected one row per group: {'、'.join(common.FOCUS_GROUPS)}")
        for r in rows:
            out.append(check_row(r))
        return out

    def check_focus_row(r):
        g, cell_ = r["特別關注"], r["共用的利害關係人"]
        want = [s for s in got_shared if g in common.split_focus(stake.get(s, {}).get("特別關注", ""))]
        listed = [] if cell_ == common.FOCUS_NONE else cell_.split("、")
        if listed != want: err(f"1.3 {g}: 共用的利害關係人 must be {'、'.join(want) or common.FOCUS_NONE}")
        note = r["說明"]
        if not listed and not PENDING_ITEM.match(note):
            err(f"1.3 {g}: no shared stakeholder, so 說明 must be one 【待補：…】 item (only a person decides that a group does not apply)")
        elif listed and note != "—" and not TAGGED.match(note):
            err(f"1.3 {g}: 說明 must be 「—」 or start with a tag")
        return {"tag": g, "stakeholders": listed, "note": None if note == "—" else parse_cell(note)}
    focus = focus_table(SECTIONS["focus"], FOCUS_HEADER, "1.3 特別關注族群檢查", check_focus_row)

    # ----- 2.1 X-N groups -----
    need_groups, member_of = [], {}
    for r in xn_rows:
        m = re.fullmatch(rf"`\[(?:{common.TAG_NAMES})\]` (X-N\d\d)", r["群組"])
        if not m: continue
        xid, where = m.group(1), f"2.1 {m.group(1)}"
        members, want_stories, want_holders = [], [], []
        for ref in split_list(r["各議題的需求"]):
            p = need_ref(ref, where)
            if p is None: continue
            num, nid = p
            if (num, nid) in member_of: err(f"{where}: #{num} {nid} is also in {member_of[(num, nid)]}; a need is in one X-N group only")
            member_of[(num, nid)] = xid
            members.append((num, nid))
            for s in issues[num].need_stories(nid):
                want_stories.append(f"#{num} {s}")
                if s.split("-")[0] not in want_holders: want_holders.append(s.split("-")[0])
        if len({n for n, _ in members}) < 2: err(f"{where}: an X-N group joins needs of 2 or more issues")
        got_stories = split_list(r["故事編號"])
        if sorted(got_stories) != sorted(want_stories) or len(set(got_stories)) != len(got_stories):
            err(f"{where}: 故事編號 must list the stories of its needs: {'、'.join(want_stories)}")
        got_holders = split_list(r["利害關係人"])
        if sorted(got_holders) != sorted(want_holders) or len(set(got_holders)) != len(got_holders):
            err(f"{where}: 利害關係人 must be {'、'.join(want_holders)}")
        if len(want_stories) < 2: err(f"{where}: an X-N group needs 2 or more stories")
        if len(want_holders) < 2: err(f"{where}: an X-N group needs 2 or more stakeholders (one stakeholder's need in several issues goes in 1.2)")
        need_groups.append({"id": xid, "tag": parse_cell(r["群組"])["tag"], "summary": r["以便（摘要）"],
                            "needs": [{"issue": n, "id": i, "priority": issues[n].need_prio.get(i)} for n, i in members],
                            "stories": [ref_obj(int(s[1:].split(" ")[0]), s.split(" ")[1]) for s in want_stories],
                            "stakeholders": want_holders, "priority": None, "priorityTag": None,
                            "prioritiesDiffer": False, "reason": None})
    groups_by_id = {g["id"]: g for g in need_groups}

    # ----- 2.2 priorities -----
    seen_p = []
    for r in one_table(text, SECTIONS["priority"], XP_HEADER, err, "跨議題的優先順序"):
        xid, where = r["群組"], f"2.2 {r['群組']}"
        g = groups_by_id.get(xid)
        if g is None: err(f"{where}: is not an X-N group in 2.1"); continue
        if xid in seen_p: err(f"{where}: has two rows"); continue
        seen_p.append(xid)
        listed = {}
        for item in split_list(r["各議題的優先順序"]):
            m = re.fullmatch(r"#(\d+) (N\d\d|[OI]\d\d-US\d\d) ([MSCW])", item)
            if not m: err(f"{where}: 「{item}」 must be 「#n ID P」, for example 「#1 N05 M」"); continue
            num, nid, p = int(m.group(1)), m.group(2), m.group(3)
            listed[(num, nid)] = p
            real = issues[num].need_prio.get(nid) if num in issues else None
            if real != p: err(f"{where}: #{num} {nid} is {real} in issue #{num}, not {p}")
        members = [(n["issue"], n["id"]) for n in g["needs"]]
        if sorted(listed) != sorted(members): err(f"{where}: 各議題的優先順序 must list each need of the group once")
        prios = {n["priority"] for n in g["needs"]}
        cell_ = parse_cell(r["跨議題的優先順序"])
        if cell_["tag"] is None: err(f"{where}: 跨議題的優先順序 must start with a tag")
        if len(prios) == 1:
            p = next(iter(prios))
            if cell_["text"] != p:
                err(f"{where}: the issues all give {p}, so 跨議題的優先順序 is {p} (it is never raised or changed)")
            g["priority"] = p
        else:
            if cell_["text"] != PRIORITY_DIFFERENT:
                err(f"{where}: the issues give {'、'.join(sorted(prios))}, so 跨議題的優先順序 is 「{PRIORITY_DIFFERENT}」; do not merge them into a new value")
            g["prioritiesDiffer"] = True
        g["priorityTag"] = cell_["tag"]
        if not TAGGED.match(r["理由"]): err(f"{where}: 理由 must start with a tag")
        g["reason"] = parse_cell(r["理由"])
    for xid in xn_ids:
        if xid not in seen_p: err(f"2.2: {xid} has no priority row")

    # ----- 3 conflicts -----
    conflicts, listed_issue_conflicts = [], set()
    def needs_side(side, where):
        out = []
        for ref in split_list(side):
            if re.fullmatch(r"X-N\d\d", ref):
                if ref not in groups_by_id: err(f"{where}: {ref} is not in 2.1")
                out.append(ref_obj(None, ref)); continue
            p = need_ref(ref, where)
            if p: out.append(ref_obj(*p))
        return out
    for r in xc_rows:
        cid = r["#"]
        if not re.fullmatch(r"X-C\d+", cid): continue
        where = f"3 {cid}"
        issue_conflicts = []
        for ref in split_list(r["相關的議題衝突"]):
            m = REF.fullmatch(ref)
            if not m or not m.group(2).startswith("C"): err(f"{where}: 相關的議題衝突 「{ref}」 must be 「#n C1」"); continue
            num = int(m.group(1))
            if issue_ref(num, m.group(2), where):
                issue_conflicts.append(ref_obj(num, m.group(2)))
                listed_issue_conflicts.add((num, m.group(2)))
        if not issue_conflicts: err(f"{where}: 相關的議題衝突 is empty")
        sides = TAG.sub("", r["相關故事"]).split(" vs ")
        story_sides = []
        if len(sides) != 2: err(f"{where}: 相關故事 must have exactly one 「 vs 」")
        else:
            for side in sides:
                ids = []
                for ref in split_list(side):
                    m = REF.fullmatch(ref)
                    if not m or "-US" not in m.group(2): err(f"{where}: 相關故事 「{ref}」 must be 「#n」 and a story ID"); continue
                    ids.append(ref_obj(int(m.group(1)), m.group(2)))
                if not ids: err(f"{where}: one side of 「 vs 」 in 相關故事 has no story")
                story_sides.append(ids)
        nsides = r["雙方的需求"].split(" vs ")
        need_sides = []
        if len(nsides) != 2: err(f"{where}: 雙方的需求 must have exactly one 「 vs 」")
        else:
            need_sides = [needs_side(s, where) for s in nsides]
        way = r["以需求為本的解方"]
        m = re.match(rf"^`\[(?:{common.TAG_NAMES})\]` 解法 (X-[A-Z](?:、X-[A-Z])*)：", way)
        codes = m.group(1).split("、") if m else []
        for c in codes:
            if c not in xs_codes: err(f"{where}: 以需求為本的解方 names 解法 {c}, which is not in 4.1")
        none_found = re.match(rf"^`\[(?:{common.TAG_NAMES})\]` {common.WAY_OUT_NONE}", way) is not None
        if not m and not none_found:
            err(f"{where}: 以需求為本的解方 must start with a tag and 「解法 X-A：」, or with a tag and 「{common.WAY_OUT_NONE}」")
        method = r["可能的審議方法"]
        if not TAGGED.match(method) and (none_found or method != "—"):
            err(f"{where}: 可能的審議方法 must start with a tag" + ("; no solution was found, so a method is needed" if none_found else ", or be 「—」"))
        for name in ("衝突", "相關故事", "模擬結果"):
            if not TAGGED.match(r[name]): err(f"{where}: {name} must start with a tag")
        conflicts.append({"id": cid, "text": parse_cell(r["衝突"]), "issueConflicts": issue_conflicts,
                          "sideA": story_sides[0] if len(story_sides) == 2 else [],
                          "sideB": story_sides[1] if len(story_sides) == 2 else [],
                          "needsA": need_sides[0] if need_sides else [], "needsB": need_sides[1] if need_sides else [],
                          "wayOut": parse_cell(way), "wayOutSolutions": codes,
                          "method": None if method == "—" else parse_cell(method), "result": parse_cell(r["模擬結果"])})
    # An issue conflict whose row names another issue is a cross-issue conflict.
    for num in nums:
        for cid, row in issues[num].conflict_rows.items():
            others = {int(x) for x in re.findall(r"#(\d+)", row)} - {num}
            if others and (num, cid) not in listed_issue_conflicts:
                err(f"3: #{num} {cid} names issue {'、'.join(f'#{o}' for o in sorted(others))}, so it must be in the 相關的議題衝突 of an X-C row")

    # ----- 4.1 combined solutions -----
    solutions, parts_of = [], {}
    for r in xs_rows:
        code = r["代號"]
        if not re.fullmatch(r"X-[A-Z]", code): continue
        where = f"4.1 {code}"
        name_cell = parse_cell(r["解法"])
        if name_cell["tag"] is None: err(f"{where}: 解法 must start with a tag")
        parts = []
        for ref in split_list(r["合併的議題解法"]):
            m = REF.fullmatch(ref)
            if not m or not m.group(2).startswith("解法 "): err(f"{where}: 「{ref}」 must be 「#n 解法 X」"); continue
            num = int(m.group(1))
            if issue_ref(num, m.group(2), where): parts.append((num, m.group(2)[3:]))
        if len(parts) < 2: err(f"{where}: a combined solution joins 2 or more issue solutions")
        if len({n for n, _ in parts}) < 2: err(f"{where}: a combined solution joins solutions of 2 or more issues")
        parts_of[code] = parts
        spaces = re.findall(r"`([^`]+)`", r["空間類型"])
        if not spaces: err(f"{where}: no space type")
        part_spaces = {s for n, c in parts for s in issues[n].spaces.get(c, [])}
        for s in spaces:
            if s not in ctx["spaces"]: err(f"{where}: unknown space code {s}")
            elif s not in part_spaces: err(f"{where}: space {s} is not a space of its issue solutions ({'、'.join(sorted(part_spaces))})")
            if s not in file_spaces: err(f"{where}: space {s} is not in the 空間類型 line")
        why = date_problem(r["新增日期"])
        if why: err(f"{where}: 新增日期 {why}")
        solutions.append({"code": code, "name": name_cell["text"], "tag": name_cell["tag"],
                          "parts": [{"issue": n, "code": c} for n, c in parts], "spaces": spaces,
                          "added": r["新增日期"], "summary": r["一句話說明"],
                          "needs": {"must": [], "shouldCould": [], "crossIssue": []},
                          "measures": [], "evaluation": None, "plan": None, "dependencies": []})
    sol_by_code = {s["code"]: s for s in solutions}

    # ----- 4.2 needs -----
    seen_map, covered_x = [], set()
    for r in one_table(text, SECTIONS["map"], XMAP_HEADER, err, "合併的解法與需求對照"):
        code, where = r["代號"], f"4.2 {r['代號']}"
        if code not in sol_by_code: err(f"{where}: is not in 4.1"); continue
        if code in seen_map: err(f"{where}: has two rows"); continue
        seen_map.append(code)
        row_needs = set()
        for col, allowed, key in (("涵蓋的 Must 需求", ("M",), "must"), ("涵蓋的 Should / Could 需求", ("S", "C"), "shouldCould")):
            for ref in split_list(r[col]):
                p = need_ref(ref, where)
                if p is None: continue
                num, nid = p
                prio = issues[num].need_prio[nid]
                if prio not in allowed: err(f"{where}: #{num} {nid} is {prio} in issue #{num}, so it does not belong in the {col} column")
                parts_here = [c for n, c in parts_of.get(code, []) if n == num]
                if not any(nid in issues[num].covers.get(c, set()) for c in parts_here):
                    err(f"{where}: #{num} {nid} is not covered by the parts of {code} in issue #{num} 6.2 "
                        f"({'、'.join('解法 ' + c for c in parts_here) or 'no part of this issue'})")
                row_needs.add((num, nid))
                sol_by_code[code]["needs"][key].append(ref_obj(num, nid))
        for x in split_list(r["涵蓋的跨議題共同需求"]):
            g = groups_by_id.get(x)
            if g is None: err(f"{where}: {x} is not in 2.1"); continue
            if not any((n["issue"], n["id"]) in row_needs for n in g["needs"]):
                err(f"{where}: lists {x}, but none of its needs is in this row")
            covered_x.add(x)
            sol_by_code[code]["needs"]["crossIssue"].append(x)
        for g in need_groups:
            if g["id"] not in sol_by_code[code]["needs"]["crossIssue"] and any((n["issue"], n["id"]) in row_needs for n in g["needs"]):
                err(f"{where}: covers a need of {g['id']}, so list {g['id']} in 涵蓋的跨議題共同需求")
    for code in xs_codes:
        if code not in seen_map: err(f"4.2: {code} has no row")
    for xid in xn_ids:
        if xid not in covered_x: err(f"4.2: {xid} is not covered by any combined solution")

    # ----- 4.3 measures -----
    for r in one_table(text, SECTIONS["measures"], XM_HEADER, err, "成效衡量"):
        where = f"4.3 「{r['指標']}」"
        codes = r["解法"].split("、")
        if not all(re.fullmatch(r"X-[A-Z]", c) and c in sol_by_code for c in codes):
            err(f"{where}: 解法 must be codes from 4.1, separated by 「、」: {r['解法']!r}"); continue
        base = r["目前數值（基準值）"]
        if not TAGGED.match(base) and not PENDING_ITEM.match(base):
            err(f"{where}: 目前數值 must start with a tag, or be one 【待補：…】 item")
        for v in r.values():
            for word in ("見下表", "見上表"):
                if word in v: err(f"{where}: 「{word}」 does not work on the solution page")
        src = r["來自"]
        from_ = []
        if src != NEW_MEASURE:
            for ref in split_list(src):
                m = REF.fullmatch(ref)
                if not m or not m.group(2).startswith("解法 "): err(f"{where}: 來自 must be 「{NEW_MEASURE}」 or 「#n 解法 X」"); continue
                part = (int(m.group(1)), m.group(2)[3:])
                for c in codes:
                    if part not in parts_of.get(c, []): err(f"{where}: #{part[0]} 解法 {part[1]} is not a part of {c}")
                from_.append({"issue": part[0], "code": part[1]})
            if not from_: err(f"{where}: 來自 is empty")
        for c in codes:
            sol_by_code[c]["measures"].append({"indicator": r["指標"], "baseline": parse_cell(base), "source": r["資料來源"],
                                               "from": from_, "isNew": src == NEW_MEASURE})
    for s in solutions:
        if not s["measures"]: err(f"4.3: {s['code']} has no measure")

    # ----- 4.4 focus groups of the combined solutions -----
    def check_solution_focus_row(r):
        g, cell_ = r["特別關注"], r["相關的合併解法"]
        codes = []
        if cell_ != common.FOCUS_NONE:
            for ref in cell_.split("、"):
                m = re.fullmatch(r"解法 (X-[A-Z])", ref.strip())
                if not m or m.group(1) not in sol_by_code: err(f"4.4 {g}: 「{ref}」 must be 「解法 X-A」 with a code from 4.1"); continue
                codes.append(m.group(1))
        note = r["說明"]
        if not codes and not PENDING_ITEM.match(note): err(f"4.4 {g}: no solution, so 說明 must be one 【待補：…】 item")
        elif codes and not TAGGED.match(note): err(f"4.4 {g}: 說明 must start with a tag")
        return {"tag": g, "solutions": codes, "note": parse_cell(note)}
    solution_focus = focus_table(SECTIONS["solutionFocus"], XF_HEADER, "4.4 特別關注族群檢查", check_solution_focus_row)

    # ----- 4.5 evaluation: one section per combined solution -----
    if common.section(text, SECTIONS["evaluation"]) is None:
        err(f"4.5: no heading 「{SECTIONS['evaluation']}」")
    seen_r, dep_copies = [], {}
    for line in lines:
        m = common.CROSS_STEP7_HEADING.match(line)
        if not m: continue
        code, where = m.group(2), f"4.5 {m.group(2)}"
        if code not in sol_by_code: err(f"{where}: is not in 4.1"); continue
        if code in seen_r: err(f"{where}: has two sections"); continue
        seen_r.append(code)
        found = common.step7_tables(common.section(text, line) or [])
        for h, _ in found["other"]:
            err(f"{where}: unknown table 「{' | '.join(h)}」")
        parsed = []
        for kind, header, keys in (("evaluation", common.STEP7_HEADER, common.EVALUATION_KEYS),
                                   ("plan", common.PLAN_HEADER, common.PLAN_KEYS)):
            if len(found[kind]) != 1:
                err(f"{where}: expected one table with the header {' | '.join(header)}, found {len(found[kind])}")
                parsed.append(None); continue
            rows = found[kind][0][1]
            names = [r[0] for r in rows]
            if names != list(keys):
                err(f"{where}: the rows of the table {' | '.join(header)} must be {'、'.join(keys)}, in this order; found {'、'.join(names)}")
            got = {}
            for r in rows:
                if len(r) != 2 or r[0] not in keys: continue
                value = r[1]
                if not TAGGED.match(value) and not PENDING_ITEM.match(value):
                    err(f"{where}: the 「{r[0]}」 cell must start with a tag and text, or be one 【待補：…】 item")
                got[keys[r[0]]] = [parse_cell(value)]
            parsed.append(got if len(got) == len(keys) else None)
        sol_by_code[code]["evaluation"], sol_by_code[code]["plan"] = parsed
        if len(found["dependencies"]) > 1: err(f"{where}: two tables with the header {' | '.join(common.DEPENDENCY_HEADER)}")
        for _, rows in found["dependencies"][:1]:
            for c in rows:
                if len(c) != 3: err(f"{where}: {common.DEPENDENCY_TOPIC} row 「{c[0]}」 has {len(c)} cells"); continue
                item, note, refs_cell = c
                rw = f"{where} {common.DEPENDENCY_TOPIC} 「{item}」"
                tagged = TAGGED.match(note) is not None
                if not tagged and not PENDING_ITEM.match(note):
                    err(f"{rw}: 說明 must start with a tag, or be one 【待補：…】 item")
                refs = common.split_refs(refs_cell)
                if tagged and not refs: err(f"{rw}: 相關編號 is empty")
                named = common.ref_solutions(refs, "X-")
                if code not in named: err(f"{rw}: 相關編號 must name 解法 {code} (the solution of this section)")
                dep_copies.setdefault(item, []).append((code, note, refs_cell, named))
                sol_by_code[code]["dependencies"].append({"name": item, "content": parse_cell(note), "refs": refs})
    for code in xs_codes:
        if code not in seen_r: err(f"4.5: {code} has no section 「### 4.5.n 解法 {code}：…」")
    for item, copies in dep_copies.items():
        codes_here = [x[0] for x in copies]
        if len({(n, r) for _, n, r, _ in copies}) > 1:
            err(f"4.5: the copies of {common.DEPENDENCY_TOPIC} 「{item}」 are not the same; write the same 說明 and 相關編號 under each solution")
        for code in copies[0][3]:
            if code in sol_by_code and code not in codes_here:
                err(f"4.5 {code}: {common.DEPENDENCY_TOPIC} 「{item}」 names 解法 {code}, so it must be in the {common.DEPENDENCY_TOPIC} table of {code} too")
    for s_ in solutions:
        ev = s_["evaluation"]
        if ev is not None and not "".join(c["text"] for c in ev["disasters"]).strip():
            err(f"4.5 {s_['code']}: the 災害風險 cell is empty (sum up the 災害風險 rows of its parts, see method.md step 7)")

    # ----- links -----
    heads = {slug(m) for m in re.findall(r"^#{1,6} (.+)$", text, re.M)}
    for a in re.findall(r"\]\(#([^)]+)\)", text):
        if a not in heads: err(f"broken anchor #{a}")
    cross_dir = os.path.join(ctx["dir"], CROSS_FOLDER)
    for target in re.findall(r"\]\((\.\./[^)#]+)(?:#[^)]*)?\)", text):
        if not os.path.exists(os.path.normpath(os.path.join(cross_dir, target))): err(f"broken link {target}")
    method_path = common.doc_file(ctx["dir"], "method.md")
    if os.path.exists(method_path):
        with open(method_path, encoding="utf-8") as f:
            mheads = {slug(m) for m in re.findall(r"^#{1,6} (.+)$", f.read(), re.M)}
        for a in re.findall(r"\]\(\.\./docs/method\.md#([^)]+)\)", text):
            if a not in mheads: err(f"broken method link ../docs/method.md#{a}")

    # ----- pending items, in file order -----
    pending, current = [], None
    for line in lines:
        hm = common.HEADING.match(line)
        if hm: current = hm.group(2).strip()
        for m in re.finditer(r"【待補：[^】]+】", re.sub(r"`[^`]*`", "", line)):
            pending.append({"text": m.group(0), "section": current})

    data = {"title": title, "issues": nums, "spaces": file_spaces, "summary": summary,
            "sharedStakeholders": shared, "repeatedNeeds": repeated, "focusGroups": focus,
            "needGroups": need_groups, "conflicts": conflicts, "solutions": solutions,
            "solutionFocus": solution_focus, "pending": pending}
    return data, errors


def main(md_path):
    md_path = os.path.abspath(md_path)
    analysis_dir = os.path.dirname(os.path.dirname(md_path))
    with open(md_path, encoding="utf-8") as f:
        text = f.read()
    ctx = load_context(analysis_dir)
    data, errors = read_cross_issue(text, ctx)
    for n, ids in not_compared(ctx, data["issues"]).items():
        print(f"NOTE: issue #{n} shares stakeholders with the compared issues ({'、'.join(ids)}), "
              f"but this file does not compare it. A person decides whether to add it.")
    print(f"issues: {data['issues']}; shared stakeholders: {len(data['sharedStakeholders'])}; "
          f"X-N groups: {len(data['needGroups'])}; conflicts: {len(data['conflicts'])}; "
          f"combined solutions: {len(data['solutions'])}; 待補 items: {len(data['pending'])}")
    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS: all checks OK")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 -I analysis/scripts/check_cross_issue.py analysis/cross-issue/cross-issue-analysis.md")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
