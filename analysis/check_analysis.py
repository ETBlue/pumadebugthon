"""Check that an issue-analysis.md and its user-stories.csv match. Usage: python3 -I analysis/check_analysis.py analysis/2-trashcans/issue-analysis.md analysis/2-trashcans/user-stories.csv"""
import csv, re, sys, unicodedata
from collections import Counter, defaultdict

md_path, csv_path = sys.argv[1], sys.argv[2]
text = open(md_path, encoding="utf-8").read()
errors = []
def err(m): errors.append(m)

# 0. old English tags must be gone; only new tags allowed
csv_text = open(csv_path, encoding="utf-8").read()
for name, body in ((md_path, text), (csv_path, csv_text)):
    for old_tag in ("[evidence]", "[simulated]"):
        if old_tag in body: err(f"{name}: old tag {old_tag} remains ({body.count(old_tag)}x)")
    for t_ in set(re.findall(r"\[[^\[\]]{1,12}\]", body)):
        if t_.isascii() and t_.lower().strip("[]") in ("evidence", "simulated"): err(f"{name}: old tag variant {t_}")

# 0b. in Markdown, every tag is wrapped in backticks (the CSV keeps plain tags)
bare = re.findall(r"(?<!`)\[(?:實證|AI模擬)\](?!`)", text)
if bare: err(f"{md_path}: {len(bare)} tag(s) without backticks")

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
sec1 = text.split("## 步驟 1", 1)[1].split("### 1.2", 1)[0]
stake = {}
for line in sec1.splitlines():
    m = re.match(r"^\| ([OI]\d\d) \| ([^|]+?) \|", line)
    if m: stake[m.group(1)] = m.group(2)

# 2. every story ID referenced exists
refs = set(re.findall(r"[OI]\d\d-US\d\d", text))
missing = refs - set(ids4)
if missing: err(f"story IDs referenced but not in step 4: {sorted(missing)}")

# 3. stakeholder IDs referenced exist
srefs = set(re.findall(r"(?<![A-Za-z0-9])([OI]\d\d)(?![0-9])", text))
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
hdr = ["編號", "利害關係人編號", "利害關係人", "身為…", "我想要…", "相同訴求", "以便…", "來源標記", "來源說明", "優先順序"]
if rows[0] != hdr: err(f"CSV header wrong: {rows[0]}")
for r in rows[1:]:
    if len(r) != 10: err(f"CSV row {r[0]} has {len(r)} fields")
exp = [[c[0], c[0][:3], c[1], c[1], c[2], c[3], c[4], c[5].split(" ", 1)[0], c[5].split(" ", 1)[1], c[6]] for c in step4]
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
    m = re.match(r"^\| (W\d\d) \| [^|]+ \| ([^|]+) \| ([^|]+) \|", line)
    if m:
        l = re.findall(r"[OI]\d\d-US\d\d", m.group(2))
        if sorted(l) != sorted(wmap.get(m.group(1), [])): err(f"group table {m.group(1)} mismatch: {l} vs {wmap.get(m.group(1))}")
        if sorted(re.findall(r"[OI]\d\d", m.group(3))) != sorted(x[:3] for x in l): err(f"group table {m.group(1)} stakeholder list wrong")
        wmap.pop(m.group(1), None)
if wmap: err(f"W groups missing from group table: {list(wmap)}")

# tags
tags = Counter(r[5].split(" ", 1)[0] for r in step4)

# 7. MoSCoW
sec5 = text.split("### 5.2", 1)[1].split("### 5.3", 1)[0]
# priority column must use the new tag
for r in step4:
    if not re.fullmatch(r"[MSCW] \[AI模擬\]", r[6]): err(f"{r[0]} bad priority value {r[6]}")
    if r[5].split(" ", 1)[0] not in ("[實證]", "[AI模擬]"): err(f"{r[0]} bad source tag {r[5]}")
# Must count claimed in 6.2 summary
mm = re.search(r"全部 (\d+) 則 Must", text)
nm = sum(1 for r in step4 if r[6].startswith("M "))
if not mm or int(mm.group(1)) != nm: err(f"6.2 Must summary count wrong: {mm and mm.group(1)} vs {nm}")
names = {"Must": "M", "Should": "S", "Could": "C", "Won't": "W"}
mos = {}
for line in sec5.splitlines():
    m = re.match(r"^\| (Must|Should|Could|Won't)[^|]* \| (\d+) \| ([^|]+) \|", line)
    if m:
        l = re.findall(r"[OI]\d\d-US\d\d", m.group(3))
        if int(m.group(2)) != len(l): err(f"MoSCoW {m.group(1)} count {m.group(2)} != {len(l)}")
        for i in l: mos[i] = names[m.group(1)]
for r in step4:
    p = r[6].split(" ")[0]
    if mos.get(r[0]) != p: err(f"MoSCoW mismatch {r[0]}: table {mos.get(r[0])} step4 {p}")

# 8. Must covered by a solution; solution columns in correct priority
sec62 = text.split("### 6.2", 1)[1].split("### 6.3", 1)[0]
covered = set()
prio = {r[0]: r[6].split(" ")[0] for r in step4}
for line in sec62.splitlines():
    if re.match(r"^\| [A-D] ", line):
        c = [x.strip() for x in line.strip().strip("|").split(" | ")]
        must = re.findall(r"[OI]\d\d-US\d\d", c[1]); sc = re.findall(r"[OI]\d\d-US\d\d", c[2])
        for i in must:
            if prio[i] != "M": err(f"6.2 {c[0][0]}: {i} in Must column but is {prio[i]}")
        for i in sc:
            if prio[i] not in "SC": err(f"6.2 {c[0][0]}: {i} in Should/Could column but is {prio[i]}")
        covered |= set(must) | set(sc)
        # W coverage claims
        allw = defaultdict(list)
        for r in step4:
            if r[3] != "—": allw[r[3]].append(r[0])
        for w, kind in re.findall(r"(W\d\d)（(全部|部分)", c[3]):
            inn = [i for i in allw[w] if i in must + sc]
            if kind == "全部" and len(inn) != len(allw[w]): err(f"6.2 {c[0][0]} {w} claims 全部 but covers {inn}")
            if kind == "部分" and not (0 < len(inn) < len(allw[w])): err(f"6.2 {c[0][0]} {w} claims 部分 but covers {inn}")
        claimed = set(re.findall(r"W\d\d", c[3]))
        actual = {r[3] for r in step4 if r[3] != "—" and r[0] in must + sc}
        if claimed != actual: err(f"6.2 {c[0][0]} W list {sorted(claimed)} != actual {sorted(actual)}")
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

print(f"stakeholders: {len(stake)} (O {sum(k[0]=='O' for k in stake)}, I {sum(k[0]=='I' for k in stake)})")
print(f"stories: {len(step4)}; tags: {dict(tags)}; MoSCoW: {dict(Counter(prio.values()))}; W groups: {len(set(r[3] for r in step4) - {'—'})}")
anchors = sorted(set(re.findall(r"\]\(#([^)]+)\)", text))); print("anchors checked:", anchors)
if errors:
    print("FAIL"); [print(" -", e) for e in errors]; sys.exit(1)
print("PASS: all checks OK")
