"""Keep the 更新日期 of each stakeholder, solution, cross-issue solution, user
story and space type, and the 新增日期 of each user story and space type.

Usage: python3 -I analysis/scripts/update_dates.py analysis [--check]

Writes analysis/data/updated-dates.csv (UTF-8 with BOM). Columns:
- 類型: 利害關係人, 跨議題解法, 解法, 使用者故事 or 空間類型.
- 編號: the stakeholder ID (I06), the cross-issue solution code (X-A), the
  issue number and the solution code (2-A), the issue number and the story
  ID (2-O01-US01), or the space type code (sidewalk).
- 新增日期: only for 使用者故事 and 空間類型, because they have no other
  place for it (YYYY-MM-DD). Empty for the other types: their 新增日期 is in
  issues.csv, stakeholders.csv, 6.1 or cross-issue-analysis.md.
- 更新日期: the last day the item's own content changed (YYYY-MM-DD).
- 內容指紋: analysis_common.fingerprint of the item's own content.

The script reads the data with the parser of build_json.py, so it sees the
same content as the app. The fingerprint uses the parsed content (text and
tag), not the file text. So a change of format only (a column moved, two
spaces in a cell) does not change it. 新增日期 is not part of the content.

The content of each item (design 3.23.8):
- 利害關係人: its row in stakeholders.csv (利害關係人, 分類路徑, 特別關注,
  議題, 備註) and its stories in every issue (我想要…, 以便…, their tags,
  來源, 優先順序 and its tag, 相同訴求編號, 相同需求編號). A moved
  stakeholder (備註 starts with 已改為) has no row.
- 解法: its 6.1 row (name, tag, summary, 空間類型), its 6.2 needs (in the
  old format: its stories), its 6.3 rows, its step 7 section (evaluation,
  plan, and its dependency rows in practices), its 總覽 row,
  its 構想 rows and its practices (the related policies and practices,
  ETBlue 2026-10-22; only when the list is not empty).
- 跨議題解法: its part of cross-issue-analysis.md (name, tag, summary,
  parts, spaces, needs, measures, evaluation, plan, and practices when not
  empty). Not its controversies and legal rows: they are 分析摘要 rows.
- 使用者故事: its row in the step 4 table (我想要…, 以便…, their tags, 來源,
  優先順序 and its tag, 相同訴求編號, 相同需求編號). The same fields as in
  the stakeholder's content.
- 空間類型: its row in space-types.csv (名稱, 分組, 說明).

The rule for the 新增日期 of a 使用者故事 or a 空間類型:
- A new item (no row yet, or an empty 新增日期) gets today (Taiwan time).
- Otherwise it keeps its date. It never changes.

The rule for the 更新日期:
- A new item (no row yet) gets its 新增日期.
- An item with the same fingerprint keeps its date.
- An item with a new fingerprint gets today (Taiwan time).
- An item that no longer exists loses its row.

Row order: the stakeholders (O before I, then the number), then the
cross-issue solutions (X-A, X-B…), then the issue solutions (by issue
number, then by code), then the user stories (by issue number, then in the
order of the step 4 table), then the space types (in the order of
space-types.csv). This is the fixed ID order of the app.

With --check, the script writes nothing. It fails (exit code 1) when the
file would change, with the message 「請執行 update_dates.py」. build_all.sh
uses --check when CI=true, so CI never writes a date.

check_analysis.py uses problems() to check the file.
"""
import csv, datetime, io, os, re, sys

# python3 -I does not put the script folder on sys.path, so add it.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analysis_common as common
import build_json

FILE = "updated-dates.csv"
HEADER = ["類型", "編號", "新增日期", "更新日期", "內容指紋"]
STAKEHOLDER, CROSS, SOLUTION, STORY, SPACE = "利害關係人", "跨議題解法", "解法", "使用者故事", "空間類型"
TYPES = (STAKEHOLDER, CROSS, SOLUTION, STORY, SPACE)
# The types whose 新增日期 is kept in this file (they have no other place for it).
OWN_ADDED = (STORY, SPACE)
# The columns of space-types.csv that are the space type's own content.
SPACE_COLS = ("名稱", "分組", "說明")
# The columns of stakeholders.csv that are the stakeholder's own content.
STAKE_COLS = ("利害關係人", "分類路徑", "特別關注", "議題", "備註")
# The fields of a story that are the stakeholder's content.
STORY_KEYS = ("id", "want", "soThat", "source", "priority", "priorityTag", "group", "needGroup")
# The fields of an issue solution that are its content.
SOLUTION_KEYS = ("name", "summary", "spaces", "needs", "measures", "evaluation", "plan", "overview", "ideas")
# The fields of a cross-issue solution that are not content.
CROSS_SKIP = ("code", "added", "updated", "controversies", "legal")
MOVED = "已改為"
RUN = "請執行 update_dates.py"


def without_pending(x):
    """The value without any "pending" key. "pending" is made from the text
    (a 【待補】 item), so it is not content of its own."""
    if isinstance(x, dict):
        return {k: without_pending(v) for k, v in x.items() if k != "pending"}
    if isinstance(x, list):
        return [without_pending(v) for v in x]
    return x


def stakeholder_order(sid):
    return (sid[0] != "O", int(sid[1:]))


def items(analysis_dir):
    """Every item with its fingerprint, in the row order:
    [{"type", "id", "added", "fingerprint"}]. added is None for a 使用者故事
    and a 空間類型 (this file keeps their 新增日期). A file that cannot be
    read raises build_json.ReadError."""
    index, issue_files = build_json.build(analysis_dir)
    cross = build_json.build_cross_issue(analysis_dir)
    stake_rows = build_json.read_csv(analysis_dir, "stakeholders.csv", ("利害關係人編號", "新增日期") + STAKE_COLS)
    issues = sorted(issue_files.values(), key=lambda d: d["number"])

    out = []
    for r in sorted(stake_rows, key=lambda r: stakeholder_order(r["利害關係人編號"])):
        sid = r["利害關係人編號"]
        if r["備註"].strip().startswith(MOVED):
            continue
        stories = [{"issue": d["number"], **{k: s[k] for k in STORY_KEYS}}
                   for d in issues for s in d["stories"] if s["stakeholder"] == sid]
        content = {"row": {c: r[c].strip() for c in STAKE_COLS}, "stories": without_pending(stories)}
        out.append({"type": STAKEHOLDER, "id": sid, "added": r["新增日期"].strip(),
                    "fingerprint": common.fingerprint(content)})
    for s in (cross or {}).get("solutions", []):
        content = without_pending({k: v for k, v in s.items() if k not in CROSS_SKIP and (k != "practices" or v)})
        out.append({"type": CROSS, "id": s["code"], "added": s["added"], "fingerprint": common.fingerprint(content)})
    for d in issues:
        for s in sorted(d["solutions"], key=lambda s: s["id"]):
            content = {k: s[k] for k in SOLUTION_KEYS}
            # practices (2026-10-22): only when the list is not empty, so the
            # new field alone does not change the date of a solution with none.
            if s["practices"]:
                content["practices"] = s["practices"]
            if s["needs"] is None:
                content["stories"] = s["stories"]  # the old format maps solutions to stories
            out.append({"type": SOLUTION, "id": f"{d['number']}-{s['id']}", "added": s["added"],
                        "fingerprint": common.fingerprint(without_pending(content))})
    for d in issues:
        for s in d["stories"]:
            content = without_pending({k: s[k] for k in STORY_KEYS})
            out.append({"type": STORY, "id": f"{d['number']}-{s['id']}", "added": None,
                        "fingerprint": common.fingerprint(content)})
    for r in build_json.read_csv(analysis_dir, "space-types.csv", ("代碼",) + SPACE_COLS):
        content = {c: r[c].strip() for c in SPACE_COLS}
        out.append({"type": SPACE, "id": r["代碼"].strip(), "added": None, "fingerprint": common.fingerprint(content)})
    return out


def read_rows(analysis_dir):
    """The rows of updated-dates.csv as dicts, or None when the file does not exist."""
    path = common.data_file(analysis_dir, FILE)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def updated_rows(current, old_rows, today):
    """The new rows: one per current item, with the 新增日期 and 更新日期
    rules above. today is a YYYY-MM-DD string. An old row from the file
    before the 新增日期 column has no 新增日期."""
    old = {(r["類型"], r["編號"]): r for r in old_rows}
    out = []
    for i in current:
        r = old.get((i["type"], i["id"]))
        own = i["type"] in OWN_ADDED
        added = (((r or {}).get("新增日期") or "").strip() or today) if own else ""
        if r is None:
            date = added if own else i["added"]
        elif r["內容指紋"] == i["fingerprint"]:
            date = r["更新日期"]
        else:
            date = today
        out.append({"類型": i["type"], "編號": i["id"], "新增日期": added, "更新日期": date,
                    "內容指紋": i["fingerprint"]})
    return out


def to_text(rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(HEADER)
    for r in rows:
        w.writerow([r[c] for c in HEADER])
    return "﻿" + buf.getvalue()


def date_problem(value):
    """Why an 更新日期 value is wrong, or None: a real YYYY-MM-DD date, not after today."""
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", value):
        return f"{value!r} is not YYYY-MM-DD"
    try:
        d = datetime.date.fromisoformat(value)
    except ValueError:
        return f"{value} is not a real date"
    if d > common.today():
        return f"{value} is in the future (today in Taiwan is {common.today().isoformat()})"
    return None


def problems(analysis_dir):
    """The problems of updated-dates.csv, as a list of messages ([] when it is right).
    Every current item has exactly one row and there are no other rows. A
    使用者故事 or 空間類型 has a 新增日期 that is a real date, not after
    today; the other types leave it empty. Each 更新日期 is a real date, not
    after today, and not before the item's 新增日期. Each 內容指紋 matches
    the current content."""
    try:
        current = items(analysis_dir)
    except build_json.ReadError as e:
        return [f"{FILE}: cannot compute the fingerprints, because the data cannot be read ({e.section}: {e.reason})"]
    rows = read_rows(analysis_dir)
    if rows is None:
        return [f"{FILE}: the file is missing. {RUN}"]
    if rows and list(rows[0].keys()) != HEADER:
        return [f"{FILE}: the header must be {','.join(HEADER)}"]
    by_key = {(i["type"], i["id"]): i for i in current}
    out, seen = [], set()
    for r in rows:
        key = (r["類型"], r["編號"])
        name = f"{FILE}: {r['類型']} {r['編號']}"
        if key in seen:
            out.append(f"{name} has two rows. {RUN}"); continue
        seen.add(key)
        item = by_key.get(key)
        if item is None:
            out.append(f"{name} is not a current stakeholder, solution, story or space type. {RUN}"); continue
        added = (r["新增日期"] or "").strip()
        if item["type"] in OWN_ADDED:
            why = date_problem(added)
            if why:
                out.append(f"{name} 新增日期 {why}")
                added = ""
        else:
            if added:
                out.append(f"{name} 新增日期 must be empty (its 新增日期 is in its own file)")
            added = item["added"]
        date = (r["更新日期"] or "").strip()
        why = date_problem(date)
        if why:
            out.append(f"{name} 更新日期 {why}")
        elif added and date < added:
            out.append(f"{name} 更新日期 {date} is before its 新增日期 {added}")
        if r["內容指紋"] != item["fingerprint"]:
            out.append(f"{name}: the content changed, but its 更新日期 was not updated. {RUN}")
    for i in current:
        if (i["type"], i["id"]) not in seen:
            out.append(f"{FILE}: no row for {i['type']} {i['id']}. {RUN}")
    return out


def main(analysis_dir, check=False):
    try:
        current = items(analysis_dir)
    except build_json.ReadError as e:
        print(f"ERROR: {e.section}: {e.reason}")
        print("Nothing written. Fix the file first (check_analysis.py lists the problems).")
        return 1
    old = read_rows(analysis_dir) or []
    rows = updated_rows(current, old, common.today().isoformat())
    path = common.data_file(analysis_dir, FILE)
    text = to_text(rows)
    try:
        with open(path, encoding="utf-8", newline="") as f:
            same = f.read() == text
    except OSError:
        same = False
    if same:
        print(f"{FILE}: no change ({len(rows)} rows)")
        return 0
    old_by_key = {(r["類型"], r["編號"]): r for r in old}
    new_keys = {(r["類型"], r["編號"]) for r in rows}
    for r in rows:
        o = old_by_key.get((r["類型"], r["編號"]))
        if o is None:
            print(f"new: {r['類型']} {r['編號']} {r['更新日期']}")
        elif o["內容指紋"] != r["內容指紋"]:
            print(f"changed: {r['類型']} {r['編號']} {o['更新日期']} -> {r['更新日期']}")
        elif (o.get("新增日期") or "") != r["新增日期"]:
            print(f"新增日期: {r['類型']} {r['編號']} {r['新增日期']}")
    for key in old_by_key:
        if key not in new_keys:
            print(f"removed: {key[0]} {key[1]}")
    if check:
        print(f"ERROR: {FILE} is not up to date. {RUN}")
        return 1
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    print(f"wrote {path} ({len(rows)} rows)")
    return 0


if __name__ == "__main__":
    args = sys.argv[1:]
    check = "--check" in args
    args = [a for a in args if a != "--check"]
    if len(args) != 1:
        print("Usage: python3 -I analysis/scripts/update_dates.py analysis [--check]")
        sys.exit(2)
    sys.exit(main(args[0], check))
