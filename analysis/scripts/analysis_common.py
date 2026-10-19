"""Shared rules for reading an issue-analysis.md file.

check_analysis.py, sync_stakeholders.py and build_json.py use these
functions, so the three scripts find sections and tables the same way.
No code runs on import.

Rules:
- A section starts at the first ## or ### heading whose text starts with the
  given prefix, followed by a space, 「：」 or the end of the line. So
  "### 6.1" does not match "### 6.10". The section ends at the next ## or
  ### heading.
- A table is a header line that starts with "|", a separator line such as
  "|---|---|", and the "|" lines after it.
- Cells are split on " | " (a space, a bar, a space). So a cell must not
  contain " | ".
- The step 1 stakeholder tables are all the tables in the section
  "### 1.1", up to the next heading.
- The step 4 story IDs are the first cells of the table rows under
  "## 步驟 4", up to the next heading.
- A reference to another issue is written as 「#」, the issue number, one
  space, then a story ID or a stakeholder ID: 「#2 O01-US01」 or 「#2 O03」
  (CROSS_REF). Such a reference is not a local ID of the file it is in.
- A source tag is one of TAGS in square brackets, for example [AI整理].
  In Markdown it is wrapped in backticks (`[AI整理]`); the CSV keeps the
  plain tag. All scripts use TAGS, so a new tag is added here only.
- The 特別關注族群檢查 table is the table under the heading
  "### 1.n 特別關注族群檢查" (any number n), up to the next heading. It has
  one row per group in FOCUS_GROUPS, in that order.
- The 分析摘要 section starts at "## 分析摘要" and ends at the next "## "
  heading. It has one "### " subsection per topic in SUMMARY_TOPICS, in that
  order. Each subsection has one table with the header SUMMARY_HEADER.
- A 相關編號 cell lists references separated by 「、」, or 「—」. A reference
  is a story (I01-US01), a stakeholder (I05), a conflict (C3), a group (W01)
  or a solution (解法 A). A reference to another issue starts with 「#」, the
  issue number and one space: 「#8 解法 B」, 「#2 C9」 (SUMMARY_REF).
  A 相同需求群組 (N01) is a reference too.
- Two formats exist (see docs/method.md). The needs-based format has a
  "### 相同需求群組" section (needs_format). In it, step 5 gives one MoSCoW
  priority per need, 6.2 maps solutions to needs, and the conflicts are in
  "### 6.4". The old format puts the conflicts in "### 5.4" and the
  priority on each story. All analyzed issues (#1, #2, #8) use the
  needs-based format now. The scripts still read the old format, and
  tests/fixtures/old-format tests it.
- Folders: the scripts get the analysis folder (the folder with the issue
  folders). The shared CSV files are in its data/ folder (data_file) and
  method.md is in its docs/ folder (doc_file).
"""
import os, re

DATA_FOLDER = "data"
DOCS_FOLDER = "docs"


def data_file(analysis_dir, name):
    """The path of a shared CSV file, such as issues.csv: <analysis_dir>/data/<name>."""
    return os.path.join(analysis_dir, DATA_FOLDER, name)


def doc_file(analysis_dir, name):
    """The path of a shared doc, such as method.md: <analysis_dir>/docs/<name>."""
    return os.path.join(analysis_dir, DOCS_FOLDER, name)

# The source tags, in display order (see method.md, section 標記):
# 實證 = a person can check the source, or a person checked the AI summary.
# AI整理 = AI summarized it from real data, with counts; no person checked it yet.
# AI模擬 = AI made it up as a likely view; no data behind it.
TAGS = ("實證", "AI整理", "AI模擬")
# The tag names as a regex alternation, for building other patterns.
TAG_NAMES = "|".join(map(re.escape, TAGS))
# One tag with its brackets, for example [AI整理]. Group 1 is the tag name.
TAG_RE = rf"\[({TAG_NAMES})\]"

# The 特別關注 groups, in the fixed order (see method.md, 分類路徑與特別關注).
# Every list of these groups uses this order, never an order by count.
# The app keeps the same list in FOCUS_ORDER (app/src/lib/issues.ts); a test
# checks that the two lists are the same.
FOCUS_GROUPS = ("高齡", "身心障礙", "呼吸道疾病", "兒童與照顧者", "外籍", "經濟弱勢")
# The 特別關注族群檢查 table in step 1 (see method.md, 特別關注族群檢查).
FOCUS_HEADING = re.compile(r"^### 1\.\d+ 特別關注族群檢查\s*$")
FOCUS_HEADER = ["特別關注", "納入的利害關係人", "說明"]
# The 納入的利害關係人 cell of a group with no stakeholder in the issue.
FOCUS_NONE = "（無）"

# The 分析摘要 section near the top of each issue file (see method.md, 分析摘要).
SUMMARY_HEADING = "## 分析摘要"
# The topics, in the fixed order. Each one is a "### " subsection.
SUMMARY_TOPICS = ("難以取捨的決定", "可能的爭議", "受影響較大的弱勢族群", "法規上的障礙", "相依事項與現行政策的關係")
SUMMARY_HEADER = ["項目", "說明", "相關編號"]
# One reference in a 相關編號 cell. Group 1 is the issue number of another
# issue (or None), group 2 the ID: a story, a stakeholder, a conflict, a group
# or 「解法 X」.
SUMMARY_REF = re.compile(r"(?:#(\d+) )?([OI]\d\d-US\d\d|[OI]\d\d|C\d+|W\d\d|N\d\d|解法 [A-Z])")

# The needs-based format (see the rules above and method.md).
NEED_GROUP_HEADING = "### 相同需求群組"
# A 相同需求群組 ID, for example N01.
NEED_ID = re.compile(r"(?<![A-Za-z0-9])N\d\d(?![0-9])")
# The step 5 table: one row per need (an N group, or a story whose need is in no group).
NEED_PRIORITY_HEADER = ["需求", "以便（摘要）", "故事編號", "優先順序", "理由"]
# The 6.2 table in the needs-based format.
NEED_MAP_HEADER = ["代號", "解法", "涵蓋的 Must 需求", "涵蓋的 Should / Could 需求"]
# The conflict table in the needs-based format ("### 6.4").
CONFLICT_HEADER = ["#", "衝突", "相關故事", "雙方的需求", "以需求為本的解方", "可能的審議方法", "模擬結果"]
# The 以需求為本的解方 cell when no solution was found. It then needs a 審議 method.
WAY_OUT_NONE = "未找到"

SEPARATOR = re.compile(r"^\|(?:\s*:?-+:?\s*\|)+\s*$")
HEADING = re.compile(r"^(#{2,3}) (.+)$")
# A reference to a story or stakeholder of another issue, for example 「#2 O01-US01」.
# Group 1 is the issue number, group 2 the ID.
CROSS_REF = re.compile(r"(?<![A-Za-z0-9&])#(\d+) ([OI]\d\d(?:-US\d\d)?)(?![0-9])")
STEP4_ROW = re.compile(r"^\| ([OI]\d\d-US\d\d) \|")


def split_cells(line):
    """The cells of one Markdown table line, without the outer bars, stripped."""
    return [x.strip() for x in line.strip().strip("|").split(" | ")]


def heading_matches(line, prefix):
    """True if the line is a heading that starts with prefix (see the rules above)."""
    return line == prefix or line.startswith(prefix + " ") or line.startswith(prefix + "：")


def section(text, heading):
    """The lines after the first heading that matches `heading`, up to the next
    ## or ### heading. None if no heading matches."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if heading_matches(line, heading):
            body = []
            for l in lines[i + 1:]:
                if HEADING.match(l):
                    break
                body.append(l)
            return body
    return None


def tables(lines):
    """Every Markdown table in the lines: a list of (header cells, rows of cells)."""
    out = []
    for i in range(1, len(lines)):
        if SEPARATOR.match(lines[i]) and lines[i - 1].startswith("|"):
            rows = []
            for l in lines[i + 1:]:
                if not l.startswith("|"):
                    break
                rows.append(split_cells(l))
            out.append((split_cells(lines[i - 1]), rows))
    return out


def step1_tables(text):
    """The step 1 stakeholder tables: every table under "### 1.1", up to the
    next heading. A list of (header cells, rows of cells). Empty if there is
    no "### 1.1" heading."""
    body = section(text, "### 1.1")
    return tables(body) if body is not None else []


def step1_ids(text):
    """The first cell of every row of the step 1 tables, in file order."""
    return [row[0] for _, rows in step1_tables(text) for row in rows]


def step4_ids(text):
    """The story IDs in the first cell of the rows under "## 步驟 4", in file order."""
    body = section(text, "## 步驟 4") or []
    return [m.group(1) for m in map(STEP4_ROW.match, body) if m]


def cross_refs(text):
    """Every reference to another issue in the text: a list of (issue number, ID)."""
    return [(int(m.group(1)), m.group(2)) for m in CROSS_REF.finditer(text)]


def without_cross_refs(text):
    """The text with every cross-issue reference replaced by a space, so the
    local ID checks do not see the IDs of other issues."""
    return CROSS_REF.sub(" ", text)


def split_focus(value):
    """The groups in a 特別關注 value such as 「高齡、經濟弱勢」. 「—」 or empty -> []."""
    v = value.strip()
    return [] if v in ("", "—") else [x.strip() for x in v.split("、")]


def focus_heading(text):
    """The "### 1.n 特別關注族群檢查" heading line, or None."""
    return next((l for l in text.splitlines() if FOCUS_HEADING.match(l)), None)


def focus_tables(text):
    """The tables under the 特別關注族群檢查 heading, up to the next heading:
    a list of (header cells, rows of cells). None if there is no such heading."""
    head = focus_heading(text)
    return None if head is None else tables(section(text, head))


def needs_format(text):
    """True if the file uses the needs-based format: it has a
    "### 相同需求群組" section."""
    return section(text, NEED_GROUP_HEADING) is not None


def conflict_heading(text):
    """The heading prefix of the conflict section: "### 6.4" in the
    needs-based format, "### 5.4" in the old format."""
    return "### 6.4" if needs_format(text) else "### 5.4"


def need_group_ids(text):
    """The N IDs in the first cell of the 相同需求群組 table rows, in file order."""
    out = []
    for h, rows in tables(section(text, NEED_GROUP_HEADING) or []):
        for r in rows:
            m = re.search(r"N\d\d", r[0])
            if m:
                out.append(m.group(0))
    return out


def issue_ids(text):
    """The IDs that a 相關編號 reference can point to in one issue file:
    {"story", "stakeholder", "conflict", "group", "need", "solution"} -> set of IDs.
    A conflict is the first cell of a row of the conflict table (C1; see
    conflict_heading), a group the W ID of a 相同訴求群組 row (W01), a need
    the N ID of a 相同需求群組 row (N01), a solution the 代號 of a 6.1 row (A)."""
    conflicts = {r[0] for h, rows in tables(section(text, conflict_heading(text)) or []) if h and h[0] == "#" for r in rows}
    groups = set()
    for h, rows in tables(section(text, "### 相同訴求群組") or []):
        for r in rows:
            m = re.search(r"W\d\d", r[0])
            if m:
                groups.add(m.group(0))
    solutions = {r[0] for h, rows in tables(section(text, "### 6.1") or []) if h and h[0] == "代號"
                 for r in rows if re.fullmatch(r"[A-Z]", r[0])}
    return {"story": set(step4_ids(text)), "stakeholder": set(step1_ids(text)),
            "conflict": conflicts, "group": groups, "need": set(need_group_ids(text)), "solution": solutions}


def summary_lines(text):
    """The lines after "## 分析摘要", up to the next "## " heading. None if
    there is no such heading."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.strip() == SUMMARY_HEADING:
            body = []
            for l in lines[i + 1:]:
                if l.startswith("## "):
                    break
                body.append(l)
            return body
    return None


def summary_topics(lines):
    """The "### " subsections of the 分析摘要 lines: a list of (topic, lines).
    Lines before the first "### " heading are left out."""
    out = []
    for l in lines:
        if l.startswith("### "):
            out.append((l[4:].strip(), []))
        elif out:
            out[-1][1].append(l)
    return out


def split_refs(value):
    """The references in a 相關編號 cell, split on 「、」. 「—」 or empty -> []."""
    v = value.strip()
    return [] if v in ("", "—") else [x.strip() for x in v.split("、")]


def parse_ref(ref):
    """One 相關編號 reference -> (issue number or None, kind, ID), or None when
    it is not a reference. kind is story, stakeholder, conflict, group or
    solution, or need (N01). The ID of a solution is its code: 「解法 B」 -> "B"."""
    m = SUMMARY_REF.fullmatch(ref)
    if not m:
        return None
    num = int(m.group(1)) if m.group(1) else None
    rid = m.group(2)
    if rid.startswith("解法 "):
        return num, "solution", rid[3:]
    if "-US" in rid:
        return num, "story", rid
    if rid[0] in "OI":
        return num, "stakeholder", rid
    return num, {"C": "conflict", "W": "group", "N": "need"}[rid[0]], rid
