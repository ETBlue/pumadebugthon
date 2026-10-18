"""Check that an issue-analysis.md and its user-stories.csv match. Usage: python3 -I analysis/check_analysis.py analysis/2-trashcans/issue-analysis.md analysis/2-trashcans/user-stories.csv"""
import csv, datetime, glob, os, re, sys, unicodedata
from collections import Counter, defaultdict

# python3 -I does not put the script folder on sys.path, so add it for analysis_common.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analysis_common import (CROSS_REF, SEPARATOR, TAG_NAMES, TAG_RE, TAGS, cross_refs, section, split_cells as cells, step1_ids,
                             step1_tables, step4_ids, tables, without_cross_refs)

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

    def split_focus(v):
        v = v.strip()
        return [] if v in ("", "—") else [x.strip() for x in v.split("、")]

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

    # step 4 table
    sec4 = text.split("## 步驟 4：使用者故事總表", 1)[1].split("### 相同訴求群組", 1)[0]
    step4 = []
    for line in sec4.splitlines():
        if re.match(r"^\| [OI]\d\d-US\d\d \|", line):
            # Markdown cells may wrap tags in backticks; the CSV has plain tags.
            c = [x.strip().replace("`", "") for x in line.strip().strip("|").split(" | ")]
            if len(c) != 7: err(f"step4 row has {len(c)} cells: {line[:40]}")
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
    if rows[0] != hdr: err(f"CSV header wrong: {rows[0]}")
    for r in rows[1:]:
        if len(r) != 11: err(f"CSV row {r[0]} has {len(r)} fields")
    # 我想要… and 以便… start with a tag; a 【待補】 cell has no tag.
    def split_tag(cell):
        m = re.match(rf"^(\[(?:{TAG_NAMES})\]) (.+)$", cell)
        return (m.group(2), m.group(1)) if m else (cell, "")
    exp = [[c[0], c[0][:3], c[1], *split_tag(c[2]), c[3], *split_tag(c[4]), c[5], c[6].split(" ")[1], c[6].split(" ")[0]] for c in step4]
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

    # 7. MoSCoW
    sec5 = text.split("### 5.2", 1)[1].split("### 5.3", 1)[0]
    # priority column is a tag, then the MoSCoW letter
    for r in step4:
        if not re.fullmatch(rf"\[(?:{TAG_NAMES})\] [MSCW]", r[6]): err(f"{r[0]} bad priority value {r[6]}")
        for name, cell in (("我想要", r[2]), ("以便", r[4])):
            if not split_tag(cell)[1] and not cell.startswith("【待補"): err(f"{r[0]} {name} cell has no tag: {cell}")
        if re.match(rf"^\[(?:{TAG_NAMES})\]", r[5]): err(f"{r[0]} 來源 cell should not have a tag: {r[5]}")
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

    # 11. 3.7 (new stakeholders) matches stakeholders.csv; the name cell starts with a tag
    STEP37_HEADER = ["利害關係人編號", "利害關係人", "分類路徑", "特別關注", "從哪裡發現", "可能的輸入來源"]
    sec37 = text.split("### 3.7", 1)[1].split("\n## ", 1)[0] if "### 3.7" in text else ""
    ls37 = sec37.splitlines()
    h37 = [cells(ls37[i - 1]) for i, l in enumerate(ls37) if i > 0 and SEPARATOR.match(l)]
    if len(h37) != 1 or h37[0] != STEP37_HEADER: err(f"3.7 table header wrong: {h37} (expected {' | '.join(STEP37_HEADER)})")
    for l in ls37:
        if not re.match(r"^\| [OI]\d\d \|", l): continue
        c = cells(l)
        if len(c) != len(STEP37_HEADER): err(f"3.7 row {c[0]} has {len(c)} cells, expected {len(STEP37_HEADER)}"); continue
        if c[0] not in stake: err(f"3.7: {c[0]} is not in step 1")
        name = re.sub(rf"^`\[(?:{TAG_NAMES})\]` ", "", c[1])
        compare_shared("3.7", c[0], name, c[2], c[3])

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

    # 17. 5.4 相關故事 holds local stories only
    for h, rows in tables(section(text, "### 5.4") or []):
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
    for num, rid in sorted(set(cross_refs(without_change_log(text)))):
        ref = f"#{num} {rid}"
        if num == own_num: err(f"{ref}: this is issue #{num} itself; write the local ID {rid}"); continue
        if num not in num_folder: err(f"{ref}: issue #{num} is not in issues.csv"); continue
        other_md = os.path.join(analysis_dir, num_folder[num], "issue-analysis.md")
        if not os.path.exists(other_md): err(f"{ref}: issue #{num} has no analysis file {other_md}"); continue
        if num not in other_ids:
            with open(other_md, encoding="utf-8") as f:
                t = f.read()
            other_ids[num] = (set(step4_ids(t)), set(step1_ids(t)))
        stories, stakeholders = other_ids[num]
        if "-US" in rid:
            if rid not in stories: err(f"{ref}: story {rid} is not in step 4 of issue #{num} ({num_folder[num]})")
        elif rid not in stakeholders: err(f"{ref}: stakeholder {rid} is not in step 1 of issue #{num} ({num_folder[num]})")

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

    print(f"stakeholders: {len(stake)} (O {sum(k[0]=='O' for k in stake)}, I {sum(k[0]=='I' for k in stake)})")
    print(f"stories: {len(step4)}; 我想要 tags: {dict(want_tags)}; 以便 tags: {dict(so_tags)}; MoSCoW: {dict(Counter(prio.values()))}; W groups: {len(set(r[3] for r in step4) - {'—'})}")
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
