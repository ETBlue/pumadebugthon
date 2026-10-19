"""Check that an issue-analysis.md and its user-stories.csv match. Usage: python3 -I analysis/check_analysis.py analysis/2-trashcans/issue-analysis.md analysis/2-trashcans/user-stories.csv"""
import csv, datetime, glob, os, re, sys, unicodedata
from collections import Counter, defaultdict

# python3 -I does not put the script folder on sys.path, so add it for analysis_common.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analysis_common import (CONFLICT_HEADER, CROSS_REF, FOCUS_GROUPS, FOCUS_HEADER, FOCUS_NONE, NEED_GROUP_HEADING,
                             NEED_ID, NEED_MAP_HEADER, NEED_PRIORITY_HEADER, SEPARATOR, SUMMARY_HEADER, SUMMARY_HEADING,
                             SUMMARY_TOPICS, TAG_NAMES, TAG_RE, TAGS, WAY_OUT_NONE, conflict_heading, cross_refs,
                             focus_tables, issue_ids, needs_format, parse_ref, section, split_cells as cells, split_focus,
                             split_refs, step1_tables, summary_lines, summary_topics, tables, without_cross_refs)

STEP1_HEADER = ["利害關係人編號", "利害關係人", "分類路徑", "特別關注", "與本題的關係"]
# 新增日期: the date a stakeholder (stakeholders.csv) or a solution (6.1) was added.
DATE_COL = "新增日期"


def date_problem(value):
    """Why a 新增日期 value is wrong, or None. It must be a real YYYY-MM-DD date
    and not after today (the date when the check runs)."""
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", value):
        return f"{value!r} is not YYYY-MM-DD"
    try:
        d = datetime.date.fromisoformat(value)
    except ValueError:
        return f"{value} is not a real date"
    if d > datetime.date.today():
        return f"{value} is in the future (today is {datetime.date.today().isoformat()})"
    return None


def step1_rows(t):
    """Return the step 1 table rows and the header of each table. The tables are
    found by the shared rule in analysis_common.step1_tables (### 1.1 up to the
    next heading), the same as in sync_stakeholders.py and build_json.py."""
    found = step1_tables(t)
    return [r for _, rows in found for r in rows], [h for h, _ in found]


def check_old_priority(text, step4, err, local_only):
    """The old format (#1 and #8 for now): the 5.2 MoSCoW table lists the
    stories per category, and 6.2 maps solutions to stories and W groups."""
    sec5 = text.split("### 5.2", 1)[1].split("### 5.3", 1)[0]
    # Must count claimed in 6.2 summary
    mm = re.search(r"全部 (\d+) 則 Must", text)
    nm = sum(1 for r in step4 if r[6].endswith(" M"))
    if not mm or int(mm.group(1)) != nm: err(f"6.2 Must summary count wrong: {mm and mm.group(1)} vs {nm}")
    names = {"Must": "M", "Should": "S", "Could": "C", "Won't": "W"}
    mos = {}
    for line in sec5.splitlines():

        m = re.match(rf"^\| `\[(?:{TAG_NAMES})\]` (Must|Should|Could|Won't)[^|]* \| (\d+) \| ([^|]+) \|", line)
        if m:
            local_only(f"5.2 MoSCoW {m.group(1)}", m.group(3))
            l = re.findall(r"[OI]\d\d-US\d\d", m.group(3))
            if int(m.group(2)) != len(l): err(f"MoSCoW {m.group(1)} count {m.group(2)} != {len(l)}")
            for i in l: mos[i] = names[m.group(1)]
    for r in step4:
        p = r[6].split(" ")[-1]
        if mos.get(r[0]) != p: err(f"MoSCoW mismatch {r[0]}: table {mos.get(r[0])} step4 {p}")

    # 8. Must covered by a solution; solution columns in correct priority.
    # 6.2 columns are found by header name. 代號 is one capital letter and
    # must be a code from 6.1.
    STEP62_HEADER = ["代號", "解法", "涵蓋的 Must", "涵蓋的 Should / Could", "涵蓋的相同訴求群組"]
    codes61 = [cells(l)[0] for l in (section(text, "### 6.1") or []) if re.match(r"^\| [A-Z] \|", l)]
    covered = set()
    prio = {r[0]: r[6].split(" ")[-1] for r in step4}
    allw = defaultdict(list)
    for r in step4:
        if r[3] != "—": allw[r[3]].append(r[0])
    t62 = tables(section(text, "### 6.2") or [])
    if len(t62) != 1 or t62[0][0] != STEP62_HEADER:
        err(f"6.2: expected one table with the header {' | '.join(STEP62_HEADER)}, found {[' | '.join(h) for h, _ in t62]}")
    codes62 = []
    for c in (t62[0][1] if len(t62) == 1 and t62[0][0] == STEP62_HEADER else []):
        if len(c) != len(STEP62_HEADER): err(f"6.2 row {c[0]} has {len(c)} cells, expected {len(STEP62_HEADER)}"); continue
        sol = c[0]
        col = dict(zip(STEP62_HEADER, c))
        if not re.fullmatch(r"[A-Z]", sol): err(f"6.2: 代號 must be one capital letter: {sol!r}"); continue
        if sol not in codes61: err(f"6.2: solution {sol} is not in 6.1")
        if sol in codes62: err(f"6.2: solution {sol} is listed twice")
        codes62.append(sol)
        local_only(f"6.2 {sol}", " ".join(c[2:]))
        must = re.findall(r"[OI]\d\d-US\d\d", col["涵蓋的 Must"]); sc = re.findall(r"[OI]\d\d-US\d\d", col["涵蓋的 Should / Could"])
        for i in must:
            if prio.get(i) != "M": err(f"6.2 {sol}: {i} in Must column but is {prio.get(i)}")
        for i in sc:
            if prio.get(i) not in ("S", "C"): err(f"6.2 {sol}: {i} in Should/Could column but is {prio.get(i)}")
        covered |= set(must) | set(sc)
        # W coverage claims
        wcell = col["涵蓋的相同訴求群組"]
        for w, kind in re.findall(r"(W\d\d)（(全部|部分)", wcell):
            inn = [i for i in allw[w] if i in must + sc]
            if kind == "全部" and len(inn) != len(allw[w]): err(f"6.2 {sol} {w} claims 全部 but covers {inn}")
            if kind == "部分" and not (0 < len(inn) < len(allw[w])): err(f"6.2 {sol} {w} claims 部分 but covers {inn}")
        claimed = set(re.findall(r"W\d\d", wcell))
        actual = {r[3] for r in step4 if r[3] != "—" and r[0] in must + sc}
        if claimed != actual: err(f"6.2 {sol} W list {sorted(claimed)} != actual {sorted(actual)}")
    for sol in codes61:
        if sol not in codes62: err(f"6.2: solution {sol} from 6.1 has no row")
    for i, p in prio.items():
        if p == "M" and i not in covered: err(f"Must {i} not covered by a solution")


def need_rows(text, err):
    """The step 5 need table (header NEED_PRIORITY_HEADER), or [] after an error."""
    found = [(h, rows) for h, rows in tables(section(text, "### 5.2") or []) if h == NEED_PRIORITY_HEADER]
    if len(found) != 1:
        err(f"5.2: expected one table with the header {' | '.join(NEED_PRIORITY_HEADER)}, found {len(found)}")
        return []
    out = []
    for c in found[0][1]:
        if len(c) != len(NEED_PRIORITY_HEADER): err(f"5.2 row 「{c[0]}」 has {len(c)} cells, expected {len(NEED_PRIORITY_HEADER)}"); continue
        out.append(c)
    return out


def check_needs(text, step4, need_of, err, local_only):
    """The needs-based format (see method.md and analysis_common).

    - 相同需求編號 in step 4 is an N ID or 「—」. Every N group has 2 or more
      stories, and the 「### 相同需求群組」 table lists the same stories and
      stakeholders.
    - The 5.2 table has one row per need: each N group once, and each story
      that is in no group once (by its story ID). A story in a group has no
      row of its own. Each row has exactly one priority (a tag and M, S, C or W).
    - The priority of each story in step 4 is the priority of its need.
    - 6.2 (NEED_MAP_HEADER) lists only existing N IDs, or story IDs of
      stories that are in no group. A need in the Must column is M; in the
      Should / Could column it is S or C. Every Must need is covered.
    - 「全部 n 項 Must 需求」 gives the number of Must needs.
    Returns nothing; problems go to err."""
    known = {r[0] for r in step4}
    groups = defaultdict(list)
    for r in step4:
        n = need_of.get(r[0], "")
        if n == "—": continue
        if not re.fullmatch(r"N\d\d", n): err(f"{r[0]}: bad 相同需求編號 「{n}」 (expected N01… or 「—」)"); continue
        groups[n].append(r[0])
    for n, ids in groups.items():
        if len(ids) < 2: err(f"{n} has only {len(ids)} story; a 相同需求群組 needs 2 or more stories")
    seen = set()
    for h, rows in tables(section(text, NEED_GROUP_HEADING) or []):
        if h[:3] != ["群組", "以便（摘要）", "故事編號"]: continue
        for c in rows:
            m = re.fullmatch(rf"`\[(?:{TAG_NAMES})\]` (N\d\d)", c[0])
            if not m: err(f"相同需求群組: first cell must be a tag and an N ID: {c[0]!r}"); continue
            n = m.group(1)
            if n in seen: err(f"相同需求群組: {n} is listed twice")
            seen.add(n)
            local_only(f"相同需求群組 {n}", " ".join(c[2:]))
            ids = re.findall(r"[OI]\d\d-US\d\d", c[2])
            if sorted(ids) != sorted(groups.get(n, [])): err(f"相同需求群組 {n} mismatch: {ids} vs step 4 {groups.get(n, [])}")
            want_st = []
            for i in ids:
                if i[:3] not in want_st: want_st.append(i[:3])
            if len(c) > 3 and re.findall(r"[OI]\d\d", c[3]) != want_st: err(f"相同需求群組 {n}: stakeholder list wrong (expected {'、'.join(want_st)})")
    for n in groups:
        if n not in seen: err(f"N group {n} is missing from the 相同需求群組 table")

    # 5.2: one row per need, one priority each.
    solo = [r[0] for r in step4 if need_of.get(r[0]) == "—"]
    need_prio = {}
    for c in need_rows(text, err):
        nid, _, ids_cell, pri = c[0], c[1], c[2], c[3]
        if nid in need_prio: err(f"5.2: need {nid} has two rows (a need has exactly one priority)"); continue
        m = re.fullmatch(rf"`\[(?:{TAG_NAMES})\]` ([MSCW])", pri)
        if not m: err(f"5.2 {nid}: 優先順序 must be a tag and M, S, C or W: {pri!r}"); continue
        local_only(f"5.2 {nid}", ids_cell)
        ids = re.findall(r"[OI]\d\d-US\d\d", ids_cell)
        if re.fullmatch(r"N\d\d", nid):
            if nid not in groups: err(f"5.2: {nid} is not a 相同需求群組 in step 4")
            elif sorted(ids) != sorted(groups[nid]): err(f"5.2 {nid}: 故事編號 {ids} != the group's stories {groups[nid]}")
        elif re.fullmatch(r"[OI]\d\d-US\d\d", nid):
            if nid not in known: err(f"5.2: story {nid} is not in step 4")
            elif nid not in solo: err(f"5.2: story {nid} is in {need_of.get(nid)}; give the priority on the group row, not on the story")
            elif ids != [nid]: err(f"5.2 {nid}: 故事編號 must be {nid}")
        else:
            err(f"5.2: 需求 must be an N ID or a story ID: {nid!r}"); continue
        need_prio[nid] = m.group(1)
    for n in groups:
        if n not in need_prio: err(f"5.2: need {n} has no priority row")
    for sid in solo:
        if sid not in need_prio: err(f"5.2: the need of {sid} (in no group) has no priority row")
    for r in step4:
        n = need_of.get(r[0])
        key = r[0] if n == "—" else n
        if key in need_prio and r[6].split(" ")[-1] != need_prio[key]:
            err(f"{r[0]}: priority in step 4 is {r[6].split(' ')[-1]}, but its need {key} is {need_prio[key]} in 5.2")

    # 6.2: solutions -> needs.
    codes61 = [cells(l)[0] for l in (section(text, "### 6.1") or []) if re.match(r"^\| [A-Z] \|", l)]
    t62 = tables(section(text, "### 6.2") or [])
    if len(t62) != 1 or t62[0][0] != NEED_MAP_HEADER:
        err(f"6.2: expected one table with the header {' | '.join(NEED_MAP_HEADER)}, found {[' | '.join(h) for h, _ in t62]}")
        return
    covered, codes62 = set(), []
    for c in t62[0][1]:
        if len(c) != len(NEED_MAP_HEADER): err(f"6.2 row {c[0]} has {len(c)} cells, expected {len(NEED_MAP_HEADER)}"); continue
        sol = c[0]
        if not re.fullmatch(r"[A-Z]", sol): err(f"6.2: 代號 must be one capital letter: {sol!r}"); continue
        if sol not in codes61: err(f"6.2: solution {sol} is not in 6.1")
        if sol in codes62: err(f"6.2: solution {sol} is listed twice")
        codes62.append(sol)
        local_only(f"6.2 {sol}", " ".join(c[2:]))
        for col, allowed in ((2, ("M",)), (3, ("S", "C"))):
            body = re.sub(rf"`\[(?:{TAG_NAMES})\]`", "", c[col]).strip()
            if body in ("", "—"): continue
            for ref in body.split("、"):
                ref = ref.strip()
                if ref not in need_prio:
                    if re.fullmatch(r"[OI]\d\d-US\d\d", ref) and need_of.get(ref, "—") != "—":
                        err(f"6.2 {sol}: {ref} is in {need_of[ref]}; write {need_of[ref]}")
                    else:
                        err(f"6.2 {sol}: 「{ref}」 is not a need (an N ID, or the story ID of a need in no group)")
                    continue
                if need_prio[ref] not in allowed:
                    err(f"6.2 {sol}: {ref} is {need_prio[ref]}, so it does not belong in the {NEED_MAP_HEADER[col]} column")
                covered.add(ref)
    for sol in codes61:
        if sol not in codes62: err(f"6.2: solution {sol} from 6.1 has no row")
    musts = [k for k, v in need_prio.items() if v == "M"]
    for k in musts:
        if k not in covered: err(f"Must need {k} is not covered by a solution in 6.2")
    mm = re.search(r"全部 (\d+) 項 Must 需求", text)
    if not mm or int(mm.group(1)) != len(musts): err(f"6.2 Must summary count wrong: {mm and mm.group(1)} vs {len(musts)} Must needs")


WAY_OUT_CODES = re.compile(r"^`\[(?:" + TAG_NAMES + r")\]` 解法 ([A-Z](?:、[A-Z])*)：")


def check_conflicts(text, known_stories, need_ids, solo_stories, codes61, err, local_only, other_issue):
    """The conflict table 「### 6.4」 in the needs-based format (CONFLICT_HEADER).
    - 相關故事 has exactly one 「 vs 」, and each side lists stories of step 4.
    - 雙方的需求 lists N IDs or story IDs of needs, with one 「 vs 」.
    - 以需求為本的解方 starts with a tag and 「解法 X：」 (codes from 6.1,
      several separated by 「、」), or with a tag and 「未找到」. 「#n 解法 X」
      in the cell is a solution of another issue and must exist there.
    - 可能的審議方法 starts with a tag. For 「未找到」 it is the main way, so
      it must not be empty."""
    found = [(h, rows) for h, rows in tables(section(text, "### 6.4") or []) if h and h[0] == "#"]
    if len(found) != 1 or found[0][0] != CONFLICT_HEADER:
        err(f"6.4: expected one table with the header {' | '.join(CONFLICT_HEADER)}, found {[' | '.join(h) for h, _ in found]}")
        return
    ids = []
    for c in found[0][1]:
        if len(c) != len(CONFLICT_HEADER): err(f"6.4 row {c[0]} has {len(c)} cells, expected {len(CONFLICT_HEADER)}"); continue
        col = dict(zip(CONFLICT_HEADER, c))
        cid = col["#"]
        if not re.fullmatch(r"C\d+", cid): err(f"6.4: bad conflict ID {cid!r}"); continue
        if cid in ids: err(f"6.4: {cid} is listed twice")
        ids.append(cid)
        local_only(f"6.4 {cid}", col["相關故事"])
        sides = col["相關故事"].split(" vs ")
        if len(sides) != 2: err(f"6.4 {cid}: 相關故事 must have exactly one 「 vs 」")
        else:
            for side in sides:
                s_ids = re.findall(r"[OI]\d\d-US\d\d", side)
                if not s_ids: err(f"6.4 {cid}: one side of 「 vs 」 has no story ID")
                for s in s_ids:
                    if s not in known_stories: err(f"6.4 {cid}: story {s} is not in step 4")
        nsides = col["雙方的需求"].split(" vs ")
        if len(nsides) != 2: err(f"6.4 {cid}: 雙方的需求 must have exactly one 「 vs 」")
        for side in nsides:
            for ref in [x.strip() for x in side.split("、") if x.strip()]:
                if ref not in need_ids and ref not in solo_stories:
                    err(f"6.4 {cid}: 雙方的需求 「{ref}」 is not a need (an N ID, or the story ID of a need in no group)")
        way = col["以需求為本的解方"]
        m = WAY_OUT_CODES.match(way)
        if m:
            for code in m.group(1).split("、"):
                if code not in codes61: err(f"6.4 {cid}: 以需求為本的解方 names 解法 {code}, which is not in 6.1")
        elif not re.match(rf"^`\[(?:{TAG_NAMES})\]` {WAY_OUT_NONE}", way):
            err(f"6.4 {cid}: 以需求為本的解方 must start with a tag and 「解法 X：」, or with a tag and 「{WAY_OUT_NONE}」: {way[:30]!r}")
        for num, code in re.findall(r"#(\d+) 解法 ([A-Z])", way):
            ids_other = other_issue(f"#{num} 解法 {code}", int(num), code)
            if ids_other is not None and code not in ids_other["solution"]:
                err(f"6.4 {cid}: #{num} 解法 {code} is not in issue #{num}")
        method = col["可能的審議方法"]
        if not re.match(rf"`\[(?:{TAG_NAMES})\]` \S", method):
            if WAY_OUT_NONE in way.split("：")[0] or not m:
                err(f"6.4 {cid}: no solution was found, so 可能的審議方法 must start with a tag and name a method")
            elif method not in ("—",):
                err(f"6.4 {cid}: 可能的審議方法 must start with a tag, or be 「—」")
        for name in ("衝突", "模擬結果"):
            if not re.match(rf"`\[(?:{TAG_NAMES})\]` \S", col[name]): err(f"6.4 {cid}: {name} must start with a tag")


def main(md_path, csv_path):
    text = open(md_path, encoding="utf-8").read()
    errors = []
    def err(m): errors.append(m)

    # Shared files sit next to the issue folders.
    analysis_dir = os.path.dirname(os.path.dirname(os.path.abspath(md_path)))
    def read_csv(name):
        with open(os.path.join(analysis_dir, name), encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))

    # The 編號異動紀錄 section lists old IDs on purpose. Old IDs that appear only
    # there must not fail the "referenced IDs exist" checks, so those checks use
    # the text without this section.
    CHANGE_LOG = "## 編號異動紀錄"
    def without_change_log(t):
        if CHANGE_LOG not in t: return t
        head, tail = t.split(CHANGE_LOG, 1)
        m = re.search(r"^## ", tail, re.M)
        return head + (tail[m.start():] if m else "")
    # A reference to another issue (「#2 O01-US01」) is checked in step 17,
    # so the local ID checks do not see it.
    text_refs = without_cross_refs(without_change_log(text))

    def local_only(where, value):
        """Lists such as W groups, 5.2, 5.4 and 6.2 hold local IDs only."""
        for m in CROSS_REF.finditer(value):
            err(f"{where}: {m.group(0)} refers to another issue, but this list holds stories of this issue only")

    # 0. old English tags must be gone; only the tags in TAGS are allowed.
    # A near spelling of a tag, such as [AI 整理] or [ai整理], is an error too.
    csv_text = open(csv_path, encoding="utf-8").read()
    near = {t.upper() for t in TAGS}
    for name, body in ((md_path, text), (csv_path, csv_text)):
        for old_tag in ("[evidence]", "[simulated]"):
            if old_tag in body: err(f"{name}: old tag {old_tag} remains ({body.count(old_tag)}x)")
        for t_ in sorted(set(re.findall(r"\[[^\[\]]{1,12}\]", body))):
            if t_.isascii() and t_.lower().strip("[]") in ("evidence", "simulated"): err(f"{name}: old tag variant {t_}")
            elif t_.strip("[]") not in TAGS and re.sub(r"\s", "", t_.strip("[]")).upper() in near:
                err(f"{name}: tag variant {t_}; write one of {', '.join(f'[{t}]' for t in TAGS)}")

    # 0b. in Markdown, every tag is wrapped in backticks (the CSV keeps plain tags)
    bare = re.findall(rf"(?<!`){TAG_RE}(?!`)", text)
    if bare: err(f"{md_path}: {len(bare)} tag(s) without backticks")

    # 0c. every open item says what is missing inside the brackets: 【待補：…】,
    # with a full-width colon and some text. Wrong forms such as 【待補】,
    # 【待補：】, 【待補:…】 or 【待補…】 are errors. Text in backticks only
    # names the format, so it is skipped.
    for n, line in enumerate(text.splitlines(), 1):
        plain = re.sub(r"`[^`]*`", "", line)
        for m in re.finditer(r"【待補[^】]*】", plain):
            if not re.fullmatch(r"【待補：[^】]+】", m.group(0)):
                err(f"line {n}: bad 待補 item {m.group(0)!r}; write 【待補：…】 with the explanation inside the brackets: {plain[m.start():m.start() + 30]!r}")

    # 0d. news content is [AI整理] and still needs a person to check it (see
    # method.md, 標記). News content is written as 「`[AI整理]` 新聞報導指出…」
    # (or 新聞報導引用…). Such a line must have a 【待補：查證…】 item: in a
    # table, anywhere in the same row; outside a table, in the same line.
    for n, line in enumerate(text.splitlines(), 1):
        if re.search(r"`\[AI整理\]`\s*新聞報導", line) and "【待補：查證" not in line:
            err(f"line {n}: an [AI整理] cell mentions 新聞 (新聞報導) but its row has no 【待補：查證…】 item: {line[:50]!r}")

    # 1. no old S\d\d IDs
    old = re.findall(r"(?<![A-Za-z0-9])S\d\d(?:-US\d\d)?", text)
    csv_raw = open(csv_path, encoding="utf-8").read()
    old += re.findall(r"(?<![A-Za-z0-9])S\d\d(?:-US\d\d)?", csv_raw)
    if old: err(f"old S IDs remain: {sorted(set(old))}")

    # The needs-based format (a 「### 相同需求群組」 section) or the old format.
    # #1 and #8 still use the old format until a later task moves them.
    needs = needs_format(text)

    # step 4 table. In the needs-based format, the 相同需求編號 column (after
    # 以便…) is moved out of the row into need_of, so the other checks see the
    # same 7 cells in both formats.
    sec4 = text.split("## 步驟 4：使用者故事總表", 1)[1].split("### 相同訴求群組", 1)[0]
    step4 = []
    need_of = {}
    for line in sec4.splitlines():
        if re.match(r"^\| [OI]\d\d-US\d\d \|", line):
            # Markdown cells may wrap tags in backticks; the CSV has plain tags.
            c = [x.strip().replace("`", "") for x in line.strip().strip("|").split(" | ")]
            if len(c) != (8 if needs else 7): err(f"step4 row has {len(c)} cells: {line[:40]}"); continue
            if needs: need_of[c[0]] = c.pop(5)
            step4.append(c)
    ids4 = [r[0] for r in step4]
    if len(ids4) != len(set(ids4)): err("duplicate story IDs in step 4")

    # step 1 stakeholders
    s1rows, s1headers = step1_rows(text)
    if len(s1headers) != 2: err(f"step 1: expected 2 stakeholder tables (組織, 個人), found {len(s1headers)}")
    for h in s1headers:
        if h != STEP1_HEADER: err(f"step 1 table header wrong: {' | '.join(h)} (expected {' | '.join(STEP1_HEADER)})")
    stake = {}
    for c in s1rows:
        if not re.fullmatch(r"[OI]\d\d", c[0]): err(f"step 1: bad stakeholder ID {c[0]!r}"); continue
        if len(c) != len(STEP1_HEADER): err(f"step 1 row {c[0]} has {len(c)} cells, expected {len(STEP1_HEADER)}"); continue
        if c[0] in stake: err(f"step 1: {c[0]} listed twice")
        stake[c[0]] = c[1]

    # 2. every story ID referenced exists
    refs = set(re.findall(r"[OI]\d\d-US\d\d", text_refs))
    missing = refs - set(ids4)
    if missing: err(f"story IDs referenced but not in step 4: {sorted(missing)}")

    # 3. stakeholder IDs referenced exist
    srefs = set(re.findall(r"(?<![A-Za-z0-9])([OI]\d\d)(?![0-9])", text_refs))
    if srefs - set(stake): err(f"stakeholder IDs not in step 1: {sorted(srefs - set(stake))}")

    # 4. every stakeholder has a story; story stakeholder names match
    have = {i.split("-")[0] for i in ids4}
    if set(stake) - have: err(f"stakeholders with no story: {sorted(set(stake) - have)}")
    for r in step4:
        if stake.get(r[0][:3]) != r[1]: err(f"{r[0]} stakeholder name mismatch: {r[1]} vs {stake.get(r[0][:3])}")

    # 5. CSV
    raw = open(csv_path, "rb").read()
    if not raw.startswith(b"\xef\xbb\xbf"): err("CSV has no BOM")
    rows = list(csv.reader(open(csv_path, encoding="utf-8-sig", newline="")))
    hdr = ["故事編號", "利害關係人編號", "身為…", "我想要…", "我想要標記", "相同訴求編號", "以便…", "以便標記", "來源", "優先順序", "優先順序標記"]
    if needs: hdr.insert(8, "相同需求編號")
    if rows[0] != hdr: err(f"CSV header wrong: {rows[0]}")
    for r in rows[1:]:
        if len(r) != len(hdr): err(f"CSV row {r[0]} has {len(r)} fields")
    # 我想要… and 以便… start with a tag; a 【待補】 cell has no tag.
    def split_tag(cell):
        m = re.match(rf"^(\[(?:{TAG_NAMES})\]) (.+)$", cell)
        return (m.group(2), m.group(1)) if m else (cell, "")
    exp = [[c[0], c[0][:3], c[1], *split_tag(c[2]), c[3], *split_tag(c[4]), c[5], c[6].split(" ")[1], c[6].split(" ")[0]] for c in step4]
    if needs:
        for row in exp: row.insert(8, need_of.get(row[0], ""))
    if rows[1:] != exp:
        err("CSV does not match step 4 table")
        for a, b in zip(rows[1:], exp):
            if a != b: err(f"  first diff: {a} != {b}"); break

    # 6. W groups: 2+ rows; group table matches
    wmap = defaultdict(list)
    for r in step4:
        if r[3] != "—":
            if not re.fullmatch(r"W\d\d", r[3]): err(f"{r[0]} bad 相同訴求 value {r[3]}")
            wmap[r[3]].append(r[0])
    for w, l in wmap.items():
        if len(l) < 2: err(f"{w} has only {len(l)} row")
        if len({x[:3] for x in l}) != len(l): err(f"{w} has two rows of the same stakeholder")
    secw = text.split("### 相同訴求群組", 1)[1].split("\n---", 1)[0]
    for line in secw.splitlines():
        m = re.match(rf"^\| `\[(?:{TAG_NAMES})\]` (W\d\d) \| [^|]+ \| ([^|]+) \| ([^|]+) \|", line)
        if m:
            local_only(f"group table {m.group(1)}", m.group(2) + " " + m.group(3))
            l = re.findall(r"[OI]\d\d-US\d\d", m.group(2))
            if sorted(l) != sorted(wmap.get(m.group(1), [])): err(f"group table {m.group(1)} mismatch: {l} vs {wmap.get(m.group(1))}")
            if sorted(re.findall(r"[OI]\d\d", m.group(3))) != sorted(x[:3] for x in l): err(f"group table {m.group(1)} stakeholder list wrong")
            wmap.pop(m.group(1), None)
    if wmap: err(f"W groups missing from group table: {list(wmap)}")

    # tags
    want_tags = Counter(split_tag(r[2])[1] or "【待補】" for r in step4)
    so_tags = Counter(split_tag(r[4])[1] or "【待補】" for r in step4)

    # 7. MoSCoW. The cell format is the same in both formats.
    # priority column is a tag, then the MoSCoW letter
    for r in step4:
        if not re.fullmatch(rf"\[(?:{TAG_NAMES})\] [MSCW]", r[6]): err(f"{r[0]} bad priority value {r[6]}")
        for name, cell in (("我想要", r[2]), ("以便", r[4])):
            if not split_tag(cell)[1] and not cell.startswith("【待補"): err(f"{r[0]} {name} cell has no tag: {cell}")
        if re.match(rf"^\[(?:{TAG_NAMES})\]", r[5]): err(f"{r[0]} 來源 cell should not have a tag: {r[5]}")
    if needs:
        check_needs(text, step4, need_of, err, local_only)
    else:
        check_old_priority(text, step4, err, local_only)
    prio = {r[0]: r[6].split(" ")[-1] for r in step4}
    codes61 = [cells(l)[0] for l in (section(text, "### 6.1") or []) if re.match(r"^\| [A-Z] \|", l)]

    # 9. anchors
    def slug(h):
        h = re.sub(r"`", "", h).strip().lower()
        h = "".join(ch for ch in h if ch in " -_" or unicodedata.category(ch)[0] in "LNM")
        return h.replace(" ", "-")
    heads = {slug(m) for m in re.findall(r"^#{1,6} (.+)$", text, re.M)}
    for a in re.findall(r"\]\(#([^)]+)\)", text):
        if a not in heads: err(f"broken anchor #{a}")
    # links to the shared reading guide: ../method.md#anchor
    method_links = re.findall(r"\]\(\.\./method\.md(?:#([^)]*))?\)", text)
    if method_links:
        method_path = os.path.join(analysis_dir, "method.md")
        if not os.path.exists(method_path):
            err(f"links to ../method.md, but {method_path} does not exist")
        else:
            with open(method_path, encoding="utf-8") as f:
                mheads = {slug(m) for m in re.findall(r"^#{1,6} (.+)$", f.read(), re.M)}
            for a in method_links:
                if a and a not in mheads: err(f"broken method link ../method.md#{a}")

    # 10. step 1 matches stakeholders.csv
    shared = read_csv("stakeholders.csv")
    by_id = {r["利害關係人編號"]: r for r in shared}
    def compare_shared(where, sid, name, path, focus):
        r = by_id.get(sid)
        if r is None: err(f"{where}: {sid} is not in stakeholders.csv"); return
        if r["備註"].startswith("已改為"): err(f"{where}: {sid} is not active in stakeholders.csv (備註: {r['備註']})"); return
        if name != r["利害關係人"]: err(f"{where}: {sid} name {name} != stakeholders.csv {r['利害關係人']}")
        pm = re.fullmatch(r"`([^`]+)`", path)
        if not pm: err(f"{where}: {sid} 分類路徑 must be one code in backticks: {path}")
        elif pm.group(1) != r["分類路徑"]: err(f"{where}: {sid} 分類路徑 {pm.group(1)} != stakeholders.csv {r['分類路徑']}")
        if split_focus(focus) != split_focus(r["特別關注"]): err(f"{where}: {sid} 特別關注 {focus} != stakeholders.csv {r['特別關注'] or '—'}")
    for c in s1rows:
        if len(c) == len(STEP1_HEADER): compare_shared("step 1", c[0], c[1], c[2], c[3])

    # 11. the new stakeholders table (the last part of step 3, 「### 3.n
    # 新增的利害關係人」, found by its name) matches stakeholders.csv; the name
    # cell starts with a tag. Messages use the number in the heading, for example 3.8.
    STEP37_HEADER = ["利害關係人編號", "利害關係人", "分類路徑", "特別關注", "從哪裡發現", "可能的輸入來源"]
    m37 = re.search(r"^### (3\.\d+) 新增的利害關係人\s*$", text, re.M)
    if not m37: err("step 3: no heading 「### 3.n 新增的利害關係人」")
    n37 = m37.group(1) if m37 else "3.n"
    # The section ends at the next ## or ### heading (for example 3.9).
    sec37 = "\n".join(section(text, "### " + m37.group(1)) or []) if m37 else ""
    ls37 = sec37.splitlines()
    h37 = [cells(ls37[i - 1]) for i, l in enumerate(ls37) if i > 0 and SEPARATOR.match(l)]
    if m37 and (len(h37) != 1 or h37[0] != STEP37_HEADER): err(f"{n37} table header wrong: {h37} (expected {' | '.join(STEP37_HEADER)})")
    for l in ls37:
        if not re.match(r"^\| [OI]\d\d \|", l): continue
        c = cells(l)
        if len(c) != len(STEP37_HEADER): err(f"{n37} row {c[0]} has {len(c)} cells, expected {len(STEP37_HEADER)}"); continue
        if c[0] not in stake: err(f"{n37}: {c[0]} is not in step 1")
        name = re.sub(rf"^`\[(?:{TAG_NAMES})\]` ", "", c[1])
        compare_shared(n37, c[0], name, c[2], c[3])

    # 12. 編號異動紀錄: each new ID exists; each old ID is gone from step 1 and step 4
    if CHANGE_LOG in text:
        seclog = text.split(CHANGE_LOG, 1)[1].split("\n## ", 1)[0]
        log_rows = [cells(l) for l in seclog.splitlines() if re.match(r"^\| [OI]\d\d(?:-US\d\d)? \|", l)]
        if not log_rows: err("編號異動紀錄: no rows")
        for c in log_rows:
            old_id, new_id = c[0], c[1] if len(c) > 1 else ""
            story = "-US" in old_id
            if story != ("-US" in new_id): err(f"編號異動紀錄: {old_id} -> {new_id} mixes a story ID and a stakeholder ID")
            known = set(ids4) if story else set(stake)
            if new_id not in known: err(f"編號異動紀錄: new ID {new_id} (from {old_id}) is not in {'step 4' if story else 'step 1'}")
            if old_id in known: err(f"編號異動紀錄: old ID {old_id} is still in {'step 4' if story else 'step 1'}")

    # 12b. stakeholders.csv has a 新增日期 column; every row has a valid date
    if shared and DATE_COL not in shared[0]:
        err(f"stakeholders.csv: no {DATE_COL} column")
    else:
        for r in shared:
            why = date_problem((r.get(DATE_COL) or "").strip())
            if why: err(f"stakeholders.csv: {r['利害關係人編號']} {DATE_COL} {why}")

    # 13. every prefix of every active path has a label
    labels = {r["分類路徑"] for r in read_csv("path-labels.csv")}
    for r in shared:
        if r["備註"].startswith("已改為"): continue
        sid, path = r["利害關係人編號"], r["分類路徑"].strip()
        if not path: err(f"stakeholders.csv: active {sid} has no 分類路徑"); continue
        parts = path.split("-")
        for i in range(1, len(parts) + 1):
            prefix = "-".join(parts[:i])
            if prefix not in labels: err(f"path prefix {prefix} (used by {sid}) has no row in path-labels.csv")

    # 14. the 議題 column matches the issue files that list each ID in step 1
    folder_num = {r["資料夾"]: int(r["編號"]) for r in read_csv("issues.csv")}
    listed = defaultdict(set)
    for f in glob.glob(os.path.join(analysis_dir, "*", "issue-analysis.md")):
        folder = os.path.basename(os.path.dirname(f))
        if folder not in folder_num: continue  # for example a template folder
        for c in step1_rows(open(f, encoding="utf-8").read())[0]:
            listed[c[0]].add(folder_num[folder])
    for r in shared:
        sid = r["利害關係人編號"]
        want = "" if r["備註"].startswith("已改為") else " ".join(str(n) for n in sorted(listed[sid]))
        if r["議題"].strip() != want: err(f"stakeholders.csv: {sid} 議題 is {r['議題']!r}, expected {want!r}")

    # 15. the 空間類型 line right under the title
    space_codes = {r["代碼"] for r in read_csv("space-types.csv")}
    lines = text.splitlines()
    issue_spaces = []
    if len(lines) > 2 and lines[0].startswith("# ") and lines[1] == "" and lines[2].startswith("空間類型："):
        body = lines[2][len("空間類型："):]
        issue_spaces = re.findall(r"`([^`]+)`", body)
        if not issue_spaces or "、".join(f"`{c}`" for c in issue_spaces) != body.strip():
            err(f"空間類型 line must be codes in backticks separated by 、: {lines[2]}")
        for code in sorted({x for x in issue_spaces if issue_spaces.count(x) > 1}):
            err(f"空間類型 line: space code {code} is listed twice")
        for code in issue_spaces:
            if code not in space_codes: err(f"空間類型 line: unknown space code {code} (not in space-types.csv)")
    else:
        err("no 「空間類型：」 line right under the title (title, blank line, then the line)")

    # 16. 6.1 has a 空間類型 column; each code is known and in the issue's list
    sec61 = text.split("### 6.1", 1)[1].split("### 6.2", 1)[0] if "### 6.1" in text else ""
    hdr61 = next((cells(l) for l in sec61.splitlines() if l.startswith("| 代號 ")), None)
    if not hdr61 or DATE_COL not in hdr61: err(f"6.1: no {DATE_COL} column")
    else:
        dcol = hdr61.index(DATE_COL)
        for line in sec61.splitlines():
            if not re.match(r"^\| [A-Z] \|", line): continue
            c = cells(line)
            why = date_problem(c[dcol] if len(c) > dcol else "")
            if why: err(f"6.1 solution {c[0]}: {DATE_COL} {why}")
    if not hdr61 or "空間類型" not in hdr61: err("6.1: no 空間類型 column")
    else:
        col = hdr61.index("空間類型")
        for line in sec61.splitlines():
            if not re.match(r"^\| [A-Z] \|", line): continue
            c = cells(line); sol = c[0]
            codes = re.findall(r"`([^`]+)`", c[col]) if len(c) > col else []
            if not codes: err(f"6.1 solution {sol}: no space type")
            for code in sorted({x for x in codes if codes.count(x) > 1}):
                err(f"6.1 solution {sol}: space code {code} is listed twice")
            for code in codes:
                if code not in space_codes: err(f"6.1 solution {sol}: unknown space code {code}")
                elif code not in issue_spaces: err(f"6.1 solution {sol}: space {code} is not in the issue's 空間類型 line")

    # 16b. each solution in 6.1 has its own step 7 section 「### 7.n 解法 X：…」
    # and a row in the 總覽 table (代號: the code only; 解法: the row tag and a
    # short name; then 成本, 可行性, 主要風險, 主責單位). The app
    # gives each solution a page with this content. A code is never reused.
    codes_61 = [cells(l)[0] for l in sec61.splitlines() if re.match(r"^\| [A-Z] \|", l)]
    step7_codes = []
    for line in text.splitlines():
        m = re.match(r"^### 7\.\d+ 解法 ([A-Z])：", line)
        if not m: continue
        if m.group(1) not in codes_61: err(f"步驟 7: 「{line}」: solution {m.group(1)} is not in 6.1")
        elif m.group(1) in step7_codes: err(f"步驟 7: solution {m.group(1)} has two sections")
        step7_codes.append(m.group(1))
    overview_codes = []
    overview = next((l for l in text.splitlines() if re.match(r"^### 7\.\d+ 總覽\s*$", l)), None)
    if overview is None:
        err("總覽: no heading 「### 7.n 總覽」")
    else:
        OVERVIEW_HEADER = ["代號", "解法", "成本", "可行性", "主要風險", "主責單位"]
        t_ov = tables(section(text, overview) or [])
        if [h for h, _ in t_ov] != [OVERVIEW_HEADER]:
            err(f"總覽: expected one table with the header {' | '.join(OVERVIEW_HEADER)}, found {[' | '.join(h) for h, _ in t_ov]}")
        for h, rows in t_ov:
            if h != OVERVIEW_HEADER: continue
            for c in rows:
                if len(c) != len(OVERVIEW_HEADER): err(f"總覽 row 「{c[0]}」 has {len(c)} cells, expected {len(OVERVIEW_HEADER)}"); continue
                if not re.fullmatch(r"[A-Z]", c[0]): err(f"總覽: 代號 must be one capital letter: {c[0]!r}"); continue
                if c[0] in overview_codes: err(f"總覽: solution {c[0]} has two rows")
                overview_codes.append(c[0])
                if not re.match(rf"`\[(?:{TAG_NAMES})\]` \S", c[1]):
                    err(f"總覽 row {c[0]}: the 解法 cell must start with the row tag and a short name: {c[1]!r}")
    for code in codes_61:
        if code not in step7_codes: err(f"步驟 7: solution {code} from 6.1 has no section 「### 7.n 解法 {code}：…」")
        if overview is not None and code not in overview_codes: err(f"總覽: solution {code} from 6.1 has no row")

    # 16c. the 6.3 成效衡量 table. The app shows each row on the solution page
    # without the tables around it, so a cell must stand alone: no 「見下表」 or
    # 「見上表」. Give the key numbers and name the section of the full table.
    # The 解法 cell is one code, or several separated by 「、」 (「A、D」), the same
    # as other lists. Each code is in 6.1.
    MEASURE_HEADER = ["解法", "指標", "目前數值（基準值）", "資料來源"]
    for h, rows in tables(section(text, "### 6.3") or []):
        if h != MEASURE_HEADER: continue
        for c in rows:
            if re.search(r"[,，]", c[0]):
                err(f"6.3 row 「{c[1] if len(c) > 1 else c[0]}」: 解法 cell 「{c[0]}」: separate codes with 「、」, for example 「A、D」")
            elif not re.fullmatch(r"[A-Z](?:、[A-Z])*", c[0]):
                err(f"6.3 row 「{c[1] if len(c) > 1 else c[0]}」: 解法 cell 「{c[0]}」 must be solution codes, for example 「A」 or 「A、D」")
            else:
                for code in c[0].split("、"):
                    if code not in codes61: err(f"6.3 row 「{c[1] if len(c) > 1 else c[0]}」: solution {code} is not in 6.1")
            for v in c:
                for word in ("見下表", "見上表"):
                    if word in v: err(f"6.3 row 「{c[1] if len(c) > 1 else c[0]}」: 「{word}」 does not work on the solution page; give the key numbers and name the section of the full table")

    # 17. the 相關故事 of the conflict table (5.4, or 6.4 in the needs-based
    # format) holds local stories only
    for h, rows in tables(section(text, conflict_heading(text)) or []):
        if "相關故事" in h:
            for c in rows:
                if len(c) == len(h): local_only(f"5.4 {c[0]}", c[h.index("相關故事")])

    # 18. every reference to another issue (「#2 O01-US01」, 「#2 O03」) points to
    # an issue in issues.csv that has an analysis file, and the ID is in its
    # step 4 (story) or step 1 (stakeholder).
    own_folder = os.path.basename(os.path.dirname(os.path.abspath(md_path)))
    own_num = folder_num.get(own_folder)
    num_folder = {n: f for f, n in folder_num.items()}
    other_ids = {}
    def other_issue(ref, num, rid):
        """The IDs of issue #num (see analysis_common.issue_ids), or None after an error."""
        if num == own_num: err(f"{ref}: this is issue #{num} itself; write the local ID {rid}"); return None
        if num not in num_folder: err(f"{ref}: issue #{num} is not in issues.csv"); return None
        other_md = os.path.join(analysis_dir, num_folder[num], "issue-analysis.md")
        if not os.path.exists(other_md): err(f"{ref}: issue #{num} has no analysis file {other_md}"); return None
        if num not in other_ids:
            with open(other_md, encoding="utf-8") as f:
                other_ids[num] = issue_ids(f.read())
        return other_ids[num]
    for num, rid in sorted(set(cross_refs(without_change_log(text)))):
        ref = f"#{num} {rid}"
        ids_other = other_issue(ref, num, rid)
        if ids_other is None: continue
        if "-US" in rid:
            if rid not in ids_other["story"]: err(f"{ref}: story {rid} is not in step 4 of issue #{num} ({num_folder[num]})")
        elif rid not in ids_other["stakeholder"]: err(f"{ref}: stakeholder {rid} is not in step 1 of issue #{num} ({num_folder[num]})")

    # 18b. the needs-based format: the conflict table in 6.4, and every N ID
    # in the text is a 相同需求群組 of step 4.
    if needs:
        need_ids = {n for n in need_of.values() if n != "—"}
        solo = {k for k, v in need_of.items() if v == "—"}
        check_conflicts(text, set(ids4), need_ids, solo, codes61, err, local_only, other_issue)
        for n in sorted(set(NEED_ID.findall(text_refs)) - need_ids):
            err(f"{n} is referenced but is not a 相同需求群組 in step 4")
        if section(text, "### 5.4") is not None:
            err("the needs-based format has the conflicts in 「### 6.4」; remove 「### 5.4」")

    # 19. open-data.csv lists every open dataset (on data.gov.tw or data.taipei)
    # that the appendix of this issue cites, and every row that lists this
    # issue in 議題 has its URL in this issue's appendix. The appendix is the
    # "## 附錄" section, up to the next "## " heading.
    OPEN_DATA_HEADER = ["名稱", "網址", "提供機關", "授權", "議題"]
    DATASET_URL = re.compile(r"https://data\.gov\.tw/dataset/\d+|https://data\.taipei/dataset/detail\?id=[0-9a-f-]+")
    od_path = os.path.join(analysis_dir, "open-data.csv")
    if not os.path.exists(od_path):
        err(f"open-data.csv: {od_path} does not exist")
    else:
        with open(od_path, "rb") as f:
            if not f.read(3) == b"\xef\xbb\xbf": err("open-data.csv has no BOM")
        with open(od_path, encoding="utf-8-sig", newline="") as f:
            od_rows = list(csv.reader(f))
        if not od_rows or od_rows[0] != OPEN_DATA_HEADER:
            err(f"open-data.csv: header must be {','.join(OPEN_DATA_HEADER)}")
        else:
            listed_urls = set()
            for r in od_rows[1:]:
                if len(r) != len(OPEN_DATA_HEADER): err(f"open-data.csv: row {r[:1]} has {len(r)} cells"); continue
                row = dict(zip(OPEN_DATA_HEADER, r))
                if not all(row[c].strip() for c in OPEN_DATA_HEADER):
                    err(f"open-data.csv: {row['網址']}: every cell must have a value")
                nums = row["議題"].split()
                if not nums or not all(re.fullmatch(r"\d+", x) for x in nums) or row["議題"] != " ".join(nums):
                    err(f"open-data.csv: {row['網址']}: 議題 {row['議題']!r} must be issue numbers separated by one space"); continue
                for x in nums:
                    if int(x) not in num_folder: err(f"open-data.csv: {row['網址']}: issue #{x} is not in issues.csv")
                if own_num is not None and str(own_num) in nums: listed_urls.add(row["網址"])
            lines_ = text.splitlines()
            start = next((i for i, l in enumerate(lines_) if l.startswith("## 附錄")), None)
            if start is None:
                err("no 「## 附錄」 section")
            else:
                end = next((i for i in range(start + 1, len(lines_)) if lines_[i].startswith("## ")), len(lines_))
                cited = set(DATASET_URL.findall("\n".join(lines_[start:end])))
                for u in sorted(cited - listed_urls):
                    err(f"open-data.csv: the appendix cites {u}, but no row with this URL lists issue {own_num}")
                for u in sorted(listed_urls - cited):
                    err(f"open-data.csv: {u} lists issue {own_num}, but the URL is not in the appendix of this issue")

    # 20. the 特別關注族群檢查 table (### 1.n, see method.md). One row per group
    # in FOCUS_GROUPS, in that order. 納入的利害關係人 lists the step 1
    # stakeholders that have the group in stakeholders.csv (both ways), split
    # by 「、」, or 「（無）」 when there is none. For 「（無）」, 說明 is a
    # 【待補：…】 item: only a person decides that a group does not apply. For
    # an included group, 說明 is 「—」 or a short note that starts with a tag.
    FW = "特別關注族群檢查"
    ft = focus_tables(text)
    if ft is None:
        err(f"{FW}: no heading 「### 1.n {FW}」 in step 1")
    elif [h for h, _ in ft] != [FOCUS_HEADER]:
        err(f"{FW}: expected one table with the header {' | '.join(FOCUS_HEADER)}, found {[' | '.join(h) for h, _ in ft]}")
    else:
        rows_f = ft[0][1]
        for c in rows_f:
            if len(c) != len(FOCUS_HEADER): err(f"{FW}: row 「{c[0]}」 has {len(c)} cells, expected {len(FOCUS_HEADER)}")
        rows_f = [c for c in rows_f if len(c) == len(FOCUS_HEADER)]
        got = [c[0] for c in rows_f]
        for g in FOCUS_GROUPS:
            if g not in got: err(f"{FW}: group {g} has no row")
        for g in got:
            if g not in FOCUS_GROUPS: err(f"{FW}: unknown group {g} (expected one of {'、'.join(FOCUS_GROUPS)})")
        if got != list(FOCUS_GROUPS) and sorted(got) == sorted(FOCUS_GROUPS):
            err(f"{FW}: the groups must be in the fixed order {'、'.join(FOCUS_GROUPS)}, found {'、'.join(got)}")
        for g, ids_cell, note in rows_f:
            if g not in FOCUS_GROUPS: continue
            want = [sid for sid in stake if g in split_focus(by_id.get(sid, {}).get("特別關注", ""))]
            if ids_cell == FOCUS_NONE:
                listed_f = []
            elif re.fullmatch(r"[OI]\d\d(?:、[OI]\d\d)*", ids_cell):
                listed_f = ids_cell.split("、")
            else:
                err(f"{FW} {g}: 納入的利害關係人 「{ids_cell}」 must be IDs separated by 「、」, or 「{FOCUS_NONE}」"); continue
            for sid in sorted({x for x in listed_f if listed_f.count(x) > 1}): err(f"{FW} {g}: {sid} is listed twice")
            for sid in listed_f:
                if sid not in stake: err(f"{FW} {g}: {sid} is not a stakeholder of this issue (step 1)")
                elif sid not in want: err(f"{FW} {g}: {sid} does not have 特別關注 {g} in stakeholders.csv")
            for sid in want:
                if sid not in listed_f: err(f"{FW} {g}: {sid} has 特別關注 {g} in stakeholders.csv and is in step 1, but is not listed")
            if not listed_f:
                if note in ("", "—"):
                    err(f"{FW} {g}: no stakeholder, so 說明 must not be empty; write a 【待補：…】 item that asks a person to decide")
                elif not re.fullmatch(r"【待補：[^】]+】", note):
                    err(f"{FW} {g}: no stakeholder, so 說明 must be one 【待補：…】 item (only a person decides that a group does not apply): {note!r}")
            elif note != "—" and not note.startswith("【待補") and not re.match(rf"`\[(?:{TAG_NAMES})\]` \S", note):
                err(f"{FW} {g}: 說明 must be 「—」 or start with a tag in backticks: {note!r}")

    # 21. the 分析摘要 section (see method.md, 分析摘要). It comes before step 1.
    # It has one 「### 」 subsection per topic in SUMMARY_TOPICS, in that order.
    # Each subsection has one table: 項目 | 說明 | 相關編號. 說明 starts with a
    # tag, or is one 【待補：…】 item. 相關編號 lists references separated by
    # 「、」 (「—」 for none). A row with a tag has at least one reference.
    # Every reference exists: in this issue, or in issue #n for 「#n …」.
    SW = "分析摘要"
    KIND_WHERE = {"story": "step 4", "stakeholder": "step 1", "conflict": conflict_heading(text)[4:], "group": "相同訴求群組",
                  "need": "相同需求群組", "solution": "6.1"}
    own_ids = issue_ids(text)
    s_lines = summary_lines(text)
    if s_lines is None:
        err(f"{SW}: no heading 「{SUMMARY_HEADING}」")
    else:
        lines_all = text.splitlines()
        pos = lines_all.index(SUMMARY_HEADING)
        step1_pos = next((i for i, l in enumerate(lines_all) if l.startswith("## 步驟 1")), None)
        if step1_pos is not None and pos > step1_pos:
            err(f"{SW}: the section must come before 「## 步驟 1」")
        topics = summary_topics(s_lines)
        got = [name for name, _ in topics]
        for name in SUMMARY_TOPICS:
            if name not in got: err(f"{SW}: topic 「### {name}」 is missing")
        for name in got:
            if name not in SUMMARY_TOPICS: err(f"{SW}: unknown topic 「### {name}」 (expected one of {'、'.join(SUMMARY_TOPICS)})")
        if got != list(SUMMARY_TOPICS) and sorted(got) == sorted(SUMMARY_TOPICS):
            err(f"{SW}: the topics must be in the fixed order {'、'.join(SUMMARY_TOPICS)}, found {'、'.join(got)}")
        for name, body in topics:
            where = f"{SW} {name}"
            found = tables(body)
            if [h for h, _ in found] != [SUMMARY_HEADER]:
                err(f"{where}: expected one table with the header {' | '.join(SUMMARY_HEADER)}, found {[' | '.join(h) for h, _ in found]}")
                continue
            rows_s = found[0][1]
            if not rows_s: err(f"{where}: the table has no rows; write one row with a 【待補：…】 item")
            for c in rows_s:
                if len(c) != len(SUMMARY_HEADER): err(f"{where}: row 「{c[0]}」 has {len(c)} cells, expected {len(SUMMARY_HEADER)}"); continue
                item, note, refs_cell = c
                rw = f"{where} 「{item}」"
                if not item: err(f"{where}: a row has an empty 項目")
                tagged = re.match(rf"`\[(?:{TAG_NAMES})\]` \S", note) is not None
                if not tagged and not re.fullmatch(r"【待補：[^】]+】", note):
                    err(f"{rw}: 說明 must start with a tag in backticks, or be one 【待補：…】 item: {note[:30]!r}")
                refs_s = split_refs(refs_cell)
                if tagged and not refs_s:
                    err(f"{rw}: 相關編號 is empty; list the stories, conflicts or solutions the item comes from")
                for ref in refs_s:
                    p_ = parse_ref(ref)
                    if p_ is None:
                        err(f"{rw}: 「{ref}」 is not a reference (write IDs like I01-US01, I05, C3, W01, N01 or 解法 A, separated by 「、」; 「#n 」 before an ID of another issue)"); continue
                    num, kind, rid = p_
                    if num is None:
                        if rid not in own_ids[kind]: err(f"{rw}: {ref} is not in {KIND_WHERE[kind]} of this issue")
                    else:
                        ids_other = other_issue(ref, num, rid)
                        if ids_other is not None and rid not in ids_other[kind]:
                            err(f"{rw}: {ref} is not in issue #{num} ({KIND_WHERE[kind]})")

    print(f"stakeholders: {len(stake)} (O {sum(k[0]=='O' for k in stake)}, I {sum(k[0]=='I' for k in stake)})")
    print(f"stories: {len(step4)}; 我想要 tags: {dict(want_tags)}; 以便 tags: {dict(so_tags)}; MoSCoW: {dict(Counter(prio.values()))}; W groups: {len(set(r[3] for r in step4) - {'—'})}"
          + (f"; N groups: {len(set(need_of.values()) - {'—'})}" if needs else "; format: old (story priority)"))
    anchors = sorted(set(re.findall(r"\]\(#([^)]+)\)", text))); print("anchors checked:", anchors)
    if errors:
        print("FAIL"); [print(" -", e) for e in errors]
        return 1
    print("PASS: all checks OK")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 -I analysis/check_analysis.py analysis/2-trashcans/issue-analysis.md analysis/2-trashcans/user-stories.csv")
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
