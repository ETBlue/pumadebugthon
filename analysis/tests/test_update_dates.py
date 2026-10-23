"""Tests for analysis/scripts/update_dates.py, the fingerprint in
analysis_common.py, and the date fields that build_json.py writes.

The tests copy the issue folders, the cross-issue folder and the shared files
from the working tree into a temp dir. They change the copy only.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import csv, datetime, importlib.util, json, os, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ANALYSIS, "scripts")
UPDATE = os.path.join(SCRIPTS, "update_dates.py")
BUILD = os.path.join(SCRIPTS, "build_json.py")
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv",
          "data/open-data.csv", "data/updated-dates.csv", "docs/method.md", "docs/human-inputs.md")
ISSUE = "2-trashcans"


def load(name):
    sys.path.insert(0, SCRIPTS)
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def make_copy(root):
    d = os.path.join(root, "analysis")
    for name in SHARED:
        os.makedirs(os.path.join(d, os.path.dirname(name)), exist_ok=True)
        shutil.copy(os.path.join(ANALYSIS, name), os.path.join(d, name))
    for n in os.listdir(ANALYSIS):
        if os.path.isfile(os.path.join(ANALYSIS, n, "issue-analysis.md")) or n == "cross-issue":
            shutil.copytree(os.path.join(ANALYSIS, n), os.path.join(d, n))
    return d


def edit(path, old, new):
    """Replace one exact piece of text in a file. The text must occur once."""
    enc = "utf-8-sig" if path.endswith(".csv") else "utf-8"
    with open(path, encoding=enc, newline="") as f:
        text = f.read()
    assert text.count(old) == 1, f"{old!r} must occur once in {path}"
    with open(path, "w", encoding=enc, newline="") as f:
        f.write(text.replace(old, new))


def swap_columns(path, header_start, a, b):
    """Swap the columns a and b of the Markdown table whose header line starts
    with header_start. The content stays the same; only the layout changes."""
    with open(path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith(header_start))
    header = lines[start].strip().strip("|").split(" | ")
    ia, ib = [h.strip() for h in header].index(a), [h.strip() for h in header].index(b)
    i = start
    while i < len(lines) and lines[i].startswith("|"):
        cells = lines[i].strip().strip("|").split(" | ") if i != start + 1 else lines[i].strip().strip("|").split("|")
        cells[ia], cells[ib] = cells[ib], cells[ia]
        lines[i] = "| " + " | ".join(c.strip() for c in cells) + " |" if i != start + 1 else "|" + "|".join(cells) + "|"
        i += 1
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


class FingerprintTest(unittest.TestCase):
    def test_key_order_does_not_matter(self):
        common = load("analysis_common")
        a = common.fingerprint({"text": "清潔箱", "tag": "AI模擬", "list": [1, 2]})
        b = common.fingerprint({"list": [1, 2], "tag": "AI模擬", "text": "清潔箱"})
        self.assertEqual(a, b)
        self.assertRegex(a, r"^[0-9a-f]{12}$")

    def test_text_or_tag_change_changes_it(self):
        common = load("analysis_common")
        a = common.fingerprint({"text": "清潔箱", "tag": "AI模擬"})
        self.assertNotEqual(a, common.fingerprint({"text": "清潔箱 ", "tag": "AI模擬"}))
        self.assertNotEqual(a, common.fingerprint({"text": "清潔箱", "tag": "實證"}))


class ItemsTest(unittest.TestCase):
    """The fingerprints of the real data, before and after a change in a copy."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = make_copy(self._tmp.name)
        self.mod = load("update_dates")
        self.md = os.path.join(self.dir, ISSUE, "issue-analysis.md")

    def tearDown(self):
        self._tmp.cleanup()

    def prints(self):
        return {(i["type"], i["id"]): i["fingerprint"] for i in self.mod.items(self.dir)}

    def test_every_item_once_in_fixed_order(self):
        items = self.mod.items(self.dir)
        keys = [(i["type"], i["id"]) for i in items]
        self.assertEqual(len(keys), len(set(keys)))
        types = [i["type"] for i in items]
        # 利害關係人 first, then 跨議題解法, then 解法 (the fixed ID order of the
        # solutions), then 使用者故事, then 空間類型.
        self.assertEqual(types, sorted(types, key=["利害關係人", "跨議題解法", "解法", "使用者故事", "空間類型"].index))
        self.assertIn(("利害關係人", "O01"), keys)
        self.assertIn(("解法", "2-A"), keys)
        self.assertIn(("跨議題解法", "X-A"), keys)
        self.assertIn(("使用者故事", "2-O01-US01"), keys)
        self.assertIn(("空間類型", "sidewalk"), keys)
        # Stories: by issue number, then in the order of the step 4 table.
        stories = [i["id"] for i in items if i["type"] == "使用者故事"]
        self.assertEqual([int(x.split("-")[0]) for x in stories], sorted(int(x.split("-")[0]) for x in stories))
        # Space types: the order of space-types.csv.
        with open(os.path.join(self.dir, "data", "space-types.csv"), encoding="utf-8-sig", newline="") as f:
            codes = [r["代碼"] for r in csv.DictReader(f)]
        self.assertEqual([i["id"] for i in items if i["type"] == "空間類型"], codes)
        # Only the types with a 新增日期 in their own file have "added".
        for i in items:
            self.assertEqual(i["added"] is None, i["type"] in ("使用者故事", "空間類型"), i["id"])
        stake = [i["id"] for i in items if i["type"] == "利害關係人"]
        self.assertEqual(stake, sorted(stake, key=lambda s: (s[0] != "O", int(s[1:]))))
        sols = [i["id"] for i in items if i["type"] == "解法"]
        self.assertEqual(sols, sorted(sols, key=lambda s: (int(s.split("-")[0]), s.split("-")[1])))

    def test_moved_stakeholder_has_no_item(self):
        with open(os.path.join(self.dir, "data", "stakeholders.csv"), encoding="utf-8-sig", newline="") as f:
            moved = [r["利害關係人編號"] for r in csv.DictReader(f) if r["備註"].startswith("已改為")]
        keys = self.prints()
        for sid in moved:
            self.assertNotIn(("利害關係人", sid), keys)

    def test_layout_change_keeps_every_fingerprint(self):
        before = self.prints()
        swap_columns(self.md, "| 故事編號 | 身為… | 我想要… | 相同訴求編號 | 以便… | 相同需求編號 | 來源 | 優先順序 |", "來源", "優先順序")
        swap_columns(self.md, "| 代號 | 解法 | 空間類型 | 新增日期 | 一句話說明 |", "空間類型", "一句話說明")
        # Two spaces inside a cell are one space after parsing.
        edit(self.md, "`[AI模擬]` 商圈有足夠的清潔箱 |", "`[AI模擬]`  商圈有足夠的清潔箱 |")
        self.assertEqual(before, self.prints())

    def test_story_text_change_changes_only_the_story_and_its_stakeholder(self):
        before = self.prints()
        edit(self.md, "`[AI模擬]` 商圈有足夠的清潔箱 |", "`[AI模擬]` 商圈有更多的清潔箱 |")
        after = self.prints()
        changed = {k for k in before if before[k] != after[k]}
        self.assertEqual(changed, {("利害關係人", "O01"), ("使用者故事", "2-O01-US01")})

    def test_story_tag_change_changes_the_story_and_its_stakeholder(self):
        before = self.prints()
        edit(self.md, "`[AI模擬]` 商圈有足夠的清潔箱 |", "`[實證]` 商圈有足夠的清潔箱 |")
        after = self.prints()
        self.assertNotEqual(before[("利害關係人", "O01")], after[("利害關係人", "O01")])
        self.assertNotEqual(before[("使用者故事", "2-O01-US01")], after[("使用者故事", "2-O01-US01")])

    def test_space_type_change_changes_only_that_space_type(self):
        before = self.prints()
        edit(os.path.join(self.dir, "data", "space-types.csv"), "sidewalk,人行道,道路,", "sidewalk,人行道,道路,測試。")
        after = self.prints()
        self.assertEqual({k for k in before if before[k] != after[k]}, {("空間類型", "sidewalk")})

    def test_stakeholder_row_change_changes_it(self):
        before = self.prints()
        edit(os.path.join(self.dir, "data", "stakeholders.csv"), "O01,商圈店家與攤商,ind-retail,,1 2 3 8 10,,", "O01,商圈店家與攤商,ind-retail,,1 2 3 8 10,測試,")
        self.assertNotEqual(before[("利害關係人", "O01")], self.prints()[("利害關係人", "O01")])

    def test_solution_summary_change_changes_only_that_solution(self):
        before = self.prints()
        edit(self.md, "並加上人行道淨寬檢查。", "並加上人行道寬度檢查。")
        after = self.prints()
        changed = {k for k in before if before[k] != after[k]}
        self.assertEqual(changed, {("解法", "2-A")})

    def test_step_7_retag_changes_only_that_solution(self):
        # Splitting a step 7 cell into parts with their own tags (ETBlue,
        # 2026-10-22) changes the content of that solution only.
        before = self.prints()
        edit(self.md, "| 主責單位 | `[AI模擬]` 環保局（環境清潔管理科）；",
             "| 主責單位 | `[AI模擬]` 環保局（環境清潔管理科）。 `[實證]` 協作單位；")
        after = self.prints()
        self.assertEqual({k for k in before if before[k] != after[k]}, {("解法", "2-A")})

    def test_solution_added_date_is_not_content(self):
        before = self.prints()
        edit(self.md, "| `sidewalk`、`mrt-exit` | 2026-10-16 | 結合清潔箱位置", "| `sidewalk`、`mrt-exit` | 2026-10-17 | 結合清潔箱位置")
        self.assertEqual(before, self.prints())


class UpdatedRowsTest(unittest.TestCase):
    """The rule for the 更新日期 of each row."""

    def setUp(self):
        self.mod = load("update_dates")
        self.today = "2026-10-22"

    def item(self, iid, fp, added="2026-10-18", type_="利害關係人"):
        return {"type": type_, "id": iid, "fingerprint": fp, "added": added}

    def row(self, iid, date, fp, type_="利害關係人", added=""):
        return {"類型": type_, "編號": iid, "新增日期": added, "更新日期": date, "內容指紋": fp}

    def test_new_item_gets_its_added_date(self):
        rows = self.mod.updated_rows([self.item("O01", "aaa", added="2026-10-19")], [], self.today)
        self.assertEqual(rows, [self.row("O01", "2026-10-19", "aaa")])

    def test_unchanged_item_keeps_its_date(self):
        rows = self.mod.updated_rows([self.item("O01", "aaa")], [self.row("O01", "2026-10-20", "aaa")], self.today)
        self.assertEqual(rows, [self.row("O01", "2026-10-20", "aaa")])

    def test_changed_item_gets_today(self):
        rows = self.mod.updated_rows([self.item("O01", "bbb")], [self.row("O01", "2026-10-20", "aaa")], self.today)
        self.assertEqual(rows, [self.row("O01", self.today, "bbb")])

    def test_removed_item_loses_its_row(self):
        old = [self.row("O01", "2026-10-20", "aaa"), self.row("O02", "2026-10-20", "ccc")]
        rows = self.mod.updated_rows([self.item("O01", "aaa")], old, self.today)
        self.assertEqual(rows, [self.row("O01", "2026-10-20", "aaa")])

    def test_new_story_or_space_type_gets_today_for_both_dates(self):
        for type_ in ("使用者故事", "空間類型"):
            with self.subTest(type_=type_):
                rows = self.mod.updated_rows([self.item("x", "aaa", added=None, type_=type_)], [], self.today)
                self.assertEqual(rows, [self.row("x", self.today, "aaa", type_=type_, added=self.today)])

    def test_story_keeps_its_added_date(self):
        old = [self.row("2-O01-US01", "2026-10-20", "aaa", type_="使用者故事", added="2026-10-16")]
        same = self.mod.updated_rows([self.item("2-O01-US01", "aaa", added=None, type_="使用者故事")], old, self.today)
        self.assertEqual(same, old)
        changed = self.mod.updated_rows([self.item("2-O01-US01", "bbb", added=None, type_="使用者故事")], old, self.today)
        self.assertEqual(changed, [self.row("2-O01-US01", self.today, "bbb", type_="使用者故事", added="2026-10-16")])

    def test_old_row_without_added_column(self):
        # A row of the file before the 新增日期 column (2026-10-23).
        old = [{"類型": "空間類型", "編號": "sidewalk", "更新日期": "2026-10-18", "內容指紋": "aaa"},
               {"類型": "利害關係人", "編號": "O01", "更新日期": "2026-10-20", "內容指紋": "aaa"}]
        rows = self.mod.updated_rows([self.item("sidewalk", "aaa", added=None, type_="空間類型"), self.item("O01", "aaa")],
                                     old, self.today)
        self.assertEqual(rows, [self.row("sidewalk", "2026-10-18", "aaa", type_="空間類型", added=self.today),
                                self.row("O01", "2026-10-20", "aaa")])

    def test_same_id_of_another_type_is_another_item(self):
        old = [self.row("X-A", "2026-10-20", "aaa", type_="跨議題解法")]
        rows = self.mod.updated_rows([self.item("X-A", "aaa", type_="解法")], old, self.today)
        self.assertEqual(rows, [self.row("X-A", "2026-10-18", "aaa", type_="解法")])


class ScriptTest(unittest.TestCase):
    """update_dates.py as a script, and the fields in the JSON."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = make_copy(self._tmp.name)
        self.file = os.path.join(self.dir, "data", "updated-dates.csv")
        self.md = os.path.join(self.dir, ISSUE, "issue-analysis.md")

    def tearDown(self):
        self._tmp.cleanup()

    def run_script(self, *args):
        p = subprocess.run([sys.executable, "-I", UPDATE, self.dir, *args], capture_output=True, text=True)
        return p.returncode, p.stdout + p.stderr

    def rows(self):
        with open(self.file, encoding="utf-8-sig", newline="") as f:
            return {(r["類型"], r["編號"]): r for r in csv.DictReader(f)}

    def test_committed_file_is_up_to_date(self):
        code, out = self.run_script("--check")
        self.assertEqual(code, 0, out)

    def test_file_has_bom_and_header(self):
        with open(self.file, "rb") as f:
            raw = f.read()
        self.assertTrue(raw.startswith(b"\xef\xbb\xbf"))
        self.assertEqual(raw[3:].decode("utf-8").split("\n")[0], "類型,編號,新增日期,更新日期,內容指紋")

    def test_added_column_only_for_stories_and_space_types(self):
        for (type_, iid), r in self.rows().items():
            if type_ in ("使用者故事", "空間類型"):
                self.assertRegex(r["新增日期"], r"^\d{4}-\d\d-\d\d$", iid)
                self.assertGreaterEqual(r["更新日期"], r["新增日期"], iid)
            else:
                self.assertEqual(r["新增日期"], "", iid)

    def test_change_gives_today_and_check_fails_before(self):
        before = self.rows()
        edit(self.md, "`[AI模擬]` 商圈有足夠的清潔箱 |", "`[AI模擬]` 商圈有更多的清潔箱 |")
        code, out = self.run_script("--check")
        self.assertEqual(code, 1, out)
        self.assertIn("請執行 update_dates.py", out)
        self.assertEqual(before, self.rows(), "--check must not write the file")
        code, out = self.run_script()
        self.assertEqual(code, 0, out)
        after = self.rows()
        today = load("analysis_common").today().isoformat()
        story = ("使用者故事", "2-O01-US01")
        for key in (("利害關係人", "O01"), story):
            self.assertEqual(after[key]["更新日期"], today)
            self.assertNotEqual(after[key]["內容指紋"], before[key]["內容指紋"])
        # The story keeps its 新增日期.
        self.assertEqual(after[story]["新增日期"], before[story]["新增日期"])
        self.assertEqual({k: v for k, v in after.items() if k not in (("利害關係人", "O01"), story)},
                         {k: v for k, v in before.items() if k not in (("利害關係人", "O01"), story)})
        code, out = self.run_script("--check")
        self.assertEqual(code, 0, out)

    def test_missing_file_is_made(self):
        before = self.rows()
        os.remove(self.file)
        code, out = self.run_script()
        self.assertEqual(code, 0, out)
        after = self.rows()
        self.assertEqual(set(after), set(before))
        # With no old row, each item gets its 新增日期.
        self.assertEqual(after[("解法", "2-A")]["更新日期"], "2026-10-16")
        # A story or a space type has no 新增日期 in another file, so it gets today.
        today = load("analysis_common").today().isoformat()
        self.assertEqual(after[("使用者故事", "2-O01-US01")]["新增日期"], today)
        self.assertEqual(after[("空間類型", "sidewalk")]["更新日期"], today)

    def test_json_has_the_date_fields(self):
        # Since 2026-10-23 every issue in issues.csv has an analysis. A fake issue #7
        # with no folder and no 新增日期 is added to the copied issues.csv, so the
        # test still checks that an issue without an analysis gets "added": null.
        with open(os.path.join(self.dir, "data", "issues.csv"), "a", encoding="utf-8") as f:
            f.write("7,7-test,測試用的議題（沒有分析）,主辦單位,\n")
        out = os.path.join(self._tmp.name, "out")
        p = subprocess.run([sys.executable, "-I", BUILD, self.dir, out], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        rows = self.rows()
        with open(os.path.join(out, "index.json"), encoding="utf-8") as f:
            index = json.load(f)
        by_num = {i["number"]: i for i in index["issues"]}
        self.assertEqual(by_num[1]["added"], "2026-10-18")
        self.assertEqual(by_num[2]["added"], "2026-10-16")
        self.assertEqual(by_num[8]["added"], "2026-10-18")
        self.assertEqual(by_num[9]["added"], "2026-10-20")
        self.assertEqual(by_num[3]["added"], "2026-10-23")
        self.assertEqual(by_num[4]["added"], "2026-10-23")
        self.assertEqual(by_num[5]["added"], "2026-10-23")
        self.assertEqual(by_num[6]["added"], "2026-10-23")
        self.assertEqual(by_num[10]["added"], "2026-10-24")
        self.assertIsNone(by_num[7]["added"])
        for s in index["stakeholders"]:
            want = None if s["movedTo"] else rows[("利害關係人", s["id"])]["更新日期"]
            self.assertEqual(s["updated"], want, s["id"])
        with open(os.path.join(out, "issues", f"{ISSUE}.json"), encoding="utf-8") as f:
            issue = json.load(f)
        for s in issue["solutions"]:
            self.assertEqual(s["updated"], rows[("解法", f"2-{s['id']}")]["更新日期"])
        with open(os.path.join(out, "cross-issue.json"), encoding="utf-8") as f:
            cross = json.load(f)
        for s in cross["solutions"]:
            self.assertEqual(s["updated"], rows[("跨議題解法", s["code"])]["更新日期"])
        for s in issue["stories"]:
            r = rows[("使用者故事", f"2-{s['id']}")]
            self.assertEqual((s["added"], s["updated"]), (r["新增日期"], r["更新日期"]), s["id"])
        for s in index["spaceTypes"]:
            r = rows[("空間類型", s["code"])]
            self.assertEqual((s["added"], s["updated"]), (r["新增日期"], r["更新日期"]), s["code"])
        # First values from git history (2026-10-23): the space types were all
        # added on 2026-10-18; O01-US01 of #2 was first committed on 2026-10-16.
        self.assertEqual(rows[("空間類型", "sidewalk")]["新增日期"], "2026-10-18")
        self.assertEqual(rows[("使用者故事", "2-O01-US01")]["新增日期"], "2026-10-16")

    def test_analyzed_issue_without_added_date_stops_build_json(self):
        edit(os.path.join(self.dir, "data", "issues.csv"), "參加者補充,2026-10-20", "參加者補充,")
        out = os.path.join(self._tmp.name, "out")
        p = subprocess.run([sys.executable, "-I", BUILD, self.dir, out], capture_output=True, text=True)
        self.assertEqual(p.returncode, 1)
        self.assertIn("新增日期", p.stdout + p.stderr)


if __name__ == "__main__":
    unittest.main()
