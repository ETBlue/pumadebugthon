"""Tests for analysis/scripts/analysis_common.py and for the step 1 rule in the three
scripts that use it (check_analysis.py, sync_stakeholders.py, build_json.py).

The tests read the issue files in the working tree. They do not change them.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import csv, importlib.util, os, re, shutil, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ISSUES = {"1-trees": 28, "2-trashcans": 27, "8-smokefree": 21}  # folder -> number of step 1 stakeholders
# No issue uses the old format now. This copy of #8 (from before commit 37057a9) tests it.
OLD_FORMAT = os.path.join(ANALYSIS, "tests", "fixtures", "old-format")


def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ANALYSIS, "scripts", f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def read(folder):
    with open(os.path.join(ANALYSIS, folder, "issue-analysis.md"), encoding="utf-8") as f:
        return f.read()


def read_old_format():
    """The old-format fixture: the #8 file before commit 37057a9 moved it."""
    with open(os.path.join(OLD_FORMAT, "issue-analysis.md"), encoding="utf-8") as f:
        return f.read()


class AnalysisCommonTest(unittest.TestCase):
    def setUp(self):
        self.common = load("analysis_common")

    def test_cross_refs(self):
        text = "見 #2 O01-US01、#12 I05 與 O03-US01；#3 不是編號；#2 的 O01-US01 不算"
        self.assertEqual(self.common.cross_refs(text), [(2, "O01-US01"), (12, "I05")])
        self.assertEqual(self.common.without_cross_refs(text).count("O01-US01"), 1)

    def test_step4_ids(self):
        ids = self.common.step4_ids(read("2-trashcans"))
        self.assertEqual(len(ids), 53)
        self.assertIn("O01-US01", ids)

    def test_parse_ref(self):
        p = self.common.parse_ref
        self.assertEqual(p("I01-US03"), (None, "story", "I01-US03"))
        self.assertEqual(p("I05"), (None, "stakeholder", "I05"))
        self.assertEqual(p("C9"), (None, "conflict", "C9"))
        self.assertEqual(p("W01"), (None, "group", "W01"))
        self.assertEqual(p("解法 A"), (None, "solution", "A"))
        self.assertEqual(p("#8 解法 B"), (8, "solution", "B"))
        self.assertEqual(p("#2 C6"), (2, "conflict", "C6"))
        self.assertEqual(p("N01"), (None, "need", "N01"))
        self.assertEqual(p("#2 N03"), (2, "need", "N03"))
        for bad in ("解法A", "A", "#8解法 B", "C5，O01-US02", "I01-US3", ""):
            self.assertIsNone(p(bad), bad)

    def test_split_refs(self):
        self.assertEqual(self.common.split_refs("—"), [])
        self.assertEqual(self.common.split_refs(" C1、 解法 A "), ["C1", "解法 A"])

    def test_issue_ids_and_summary(self):
        text = read("2-trashcans")
        ids = self.common.issue_ids(text)
        self.assertEqual(sorted(ids["conflict"]), sorted(f"C{n}" for n in range(1, 11)))
        self.assertEqual(sorted(ids["solution"]), ["A", "B", "C", "D", "E"])
        self.assertIn("W11", ids["group"])
        self.assertEqual(sorted(ids["need"]), [f"N{n:02d}" for n in range(1, 11)])
        self.assertIn("I24", ids["stakeholder"])
        topics = self.common.summary_topics(self.common.summary_lines(text))
        self.assertEqual(tuple(name for name, _ in topics), self.common.SUMMARY_TOPICS)

    def test_needs_format(self):
        # #1, #2 and #8 all use the needs-based format (a 相同需求群組 section).
        for folder in ("1-trees", "2-trashcans", "8-smokefree"):
            with self.subTest(folder=folder):
                self.assertTrue(self.common.needs_format(read(folder)))
                self.assertEqual(self.common.conflict_heading(read(folder)), "### 6.4")
        # The scripts still read the old format. The fixture is #8 before it moved.
        self.assertFalse(self.common.needs_format(read_old_format()))
        self.assertEqual(self.common.conflict_heading(read_old_format()), "### 5.4")

    def test_old_format_issue_ids(self):
        # The conflicts of an old-format file are still found in 5.4; it has no needs.
        ids = self.common.issue_ids(read_old_format())
        self.assertIn("C3", ids["conflict"])
        self.assertEqual(ids["need"], set())

    def test_tags(self):
        # The three source tags, in display order: 實證, AI整理, AI模擬.
        self.assertEqual(self.common.TAGS, ("實證", "AI整理", "AI模擬"))
        for tag in self.common.TAGS:
            self.assertRegex(f"[{tag}]", self.common.TAG_RE)
        self.assertNotRegex("[AI 整理]", self.common.TAG_RE)

    def test_split_cells(self):
        self.assertEqual(self.common.split_cells("| A | `[AI模擬]` 文字 | — |"), ["A", "`[AI模擬]` 文字", "—"])

    def test_section_needs_space_or_colon_after_prefix(self):
        text = "### 6.10 x\na\n### 6.1 候選解法\nb\n## 下一節\nc\n"
        self.assertEqual(self.common.section(text, "### 6.1"), ["b"])
        self.assertEqual(self.common.section("## 步驟 4：表\nx\n### 下\n", "## 步驟 4"), ["x"])
        self.assertIsNone(self.common.section(text, "### 6.2"))

    def test_step1_tables_stop_at_next_heading(self):
        text = ("## 步驟 1\n\n### 1.1 清單\n\n| 利害關係人編號 | 名稱 |\n|---|---|\n| O01 | a |\n\n"
                "| 利害關係人編號 | 名稱 |\n|---|---|\n| I01 | b |\n\n### 1.2 來源\n\n"
                "| 輸入來源 | 適合的利害關係人 |\n|---|---|\n| O02 | c |\n")
        self.assertEqual([h for h, _ in self.common.step1_tables(text)], [["利害關係人編號", "名稱"]] * 2)
        self.assertEqual(self.common.step1_ids(text), ["O01", "I01"])

    def test_focus_groups_fixed_order(self):
        # The 特別關注 groups, in the fixed order of method.md.
        self.assertEqual(self.common.FOCUS_GROUPS, ("高齡", "身心障礙", "呼吸道疾病", "兒童與照顧者", "外籍", "經濟弱勢"))

    def test_focus_groups_match_the_app(self):
        # The app keeps the same list in FOCUS_ORDER. The two lists must not differ.
        path = os.path.join(os.path.dirname(ANALYSIS), "app", "src", "lib", "issues.ts")
        with open(path, encoding="utf-8") as f:
            m = re.search(r"export const FOCUS_ORDER = \[([^\]]*)\]", f.read())
        self.assertIsNotNone(m, "FOCUS_ORDER not found in app/src/lib/issues.ts")
        self.assertEqual(tuple(re.findall(r"'([^']+)'", m.group(1))), self.common.FOCUS_GROUPS)

    def test_split_focus(self):
        self.assertEqual(self.common.split_focus("高齡、經濟弱勢"), ["高齡", "經濟弱勢"])
        self.assertEqual(self.common.split_focus("—"), [])
        self.assertEqual(self.common.split_focus(" "), [])

    def test_focus_tables(self):
        text = ("### 1.2 來源\n\nx\n\n### 1.3 特別關注族群檢查\n\n說明。\n\n"
                "| 特別關注 | 納入的利害關係人 | 說明 |\n|---|---|---|\n| 高齡 | I05 | — |\n\n---\n\n## 步驟 2\n")
        self.assertEqual(self.common.focus_tables(text), [(["特別關注", "納入的利害關係人", "說明"], [["高齡", "I05", "—"]])])
        self.assertIsNone(self.common.focus_tables("### 1.3 其他\n"))


class SameStep1IdsTest(unittest.TestCase):
    """The three scripts find the same step 1 IDs in each issue file."""

    @classmethod
    def setUpClass(cls):
        cls.check = load("check_analysis")
        cls.sync = load("sync_stakeholders")
        cls.build = load("build_json")
        with open(os.path.join(ANALYSIS, "data", "space-types.csv"), encoding="utf-8-sig", newline="") as f:
            cls.space_codes = {r["代碼"] for r in csv.DictReader(f)}

    def test_same_ids_in_all_three_scripts(self):
        for folder, count in ISSUES.items():
            with self.subTest(folder=folder):
                text = read(folder)
                from_check = [r[0] for r in self.check.step1_rows(text)[0]]
                from_sync = self.sync.step1_ids(text)
                from_build = [s["id"] for s in self.build.parse_issue(text, self.space_codes)["stakeholders"]]
                self.assertEqual(len(from_check), count)
                self.assertEqual(from_check, from_sync)
                self.assertEqual(from_check, from_build)
                self.assertEqual(len(self.check.step1_rows(text)[1]), 2)



class TypeListsTest(unittest.TestCase):
    """The domain and solution type lists (domain-types.csv, solution-types.csv)
    and the shared check for a list with 2 levels."""

    @classmethod
    def setUpClass(cls):
        cls.common = load("analysis_common")

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = self._tmp.name
        os.makedirs(os.path.join(self.dir, "data"))
        for name in ("domain-types.csv", "solution-types.csv"):
            shutil.copy(os.path.join(ANALYSIS, "data", name), os.path.join(self.dir, "data", name))

    def tearDown(self):
        self._tmp.cleanup()

    def edit(self, name, change):
        """Change the text of a copied CSV file with change(text) -> text."""
        path = os.path.join(self.dir, "data", name)
        with open(path, encoding="utf-8-sig", newline="") as f:
            text = f.read()
        new = change(text)
        self.assertNotEqual(new, text)
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            f.write(new)

    def rows(self, *lines):
        """Rows for check_two_levels: each line is "code,parent"."""
        return [dict(zip(("代碼", "上層"), l.split(","))) for l in lines]

    def test_real_files_load(self):
        domains = self.common.domain_types(ANALYSIS)
        self.assertEqual(len(domains), 36)
        self.assertEqual(len(self.common.leaf_codes(domains)), 28)
        self.assertEqual(sum(1 for r in domains.values() if not r["上層"]), 8)
        self.assertEqual(list(domains)[:2], ["general-affairs", "administration"])
        self.assertEqual(domains["transport"]["上層"], "economic-development")
        self.assertEqual(domains["transport"]["政事別"], "交通支出")
        types = self.common.solution_types(ANALYSIS)
        self.assertEqual(len(types), 13)
        self.assertEqual(list(types)[0], "digital-tool")
        self.assertEqual(list(types)[-1], "planning")

    def test_files_have_bom(self):
        for name in ("domain-types.csv", "solution-types.csv"):
            with open(os.path.join(ANALYSIS, "data", name), "rb") as f:
                self.assertTrue(f.read().startswith(b"\xef\xbb\xbf"), name)

    def test_leaf_codes_in_file_order(self):
        rows = self.rows("a,", "a1,a", "b,", "b1,b", "a2,a")
        self.assertEqual(self.common.leaf_codes(rows), ["a1", "b1", "a2"])

    def test_two_levels_pass(self):
        self.common.check_two_levels(self.rows("a,", "a1,a", "b,", "b1,b"), "x.csv")

    def test_unknown_parent_fails(self):
        with self.assertRaises(self.common.ReadError) as e:
            self.common.check_two_levels(self.rows("a,", "a1,a", "b1,zz"), "x.csv")
        self.assertIn("x.csv", str(e.exception))
        self.assertIn("b1", str(e.exception))
        self.assertIn("zz", str(e.exception))

    def test_parent_that_is_level_2_fails(self):
        with self.assertRaises(self.common.ReadError) as e:
            self.common.check_two_levels(self.rows("a,", "a1,a", "a11,a1"), "x.csv")
        self.assertIn("x.csv", str(e.exception))
        self.assertIn("a11", str(e.exception))
        self.assertIn("is a level 2 code", str(e.exception))

    def test_level_1_without_child_fails(self):
        with self.assertRaises(self.common.ReadError) as e:
            self.common.check_two_levels(self.rows("parent-a,", "child-a,parent-a", "parent-b,"), "x.csv")
        self.assertIn("x.csv", str(e.exception))
        self.assertIn("level 1 code parent-b has no child", str(e.exception))

    def test_child_before_parent_passes(self):
        self.common.check_two_levels(self.rows("a1,a", "a,", "b,", "b1,b"), "x.csv")

    def test_list_with_repeated_code_fails(self):
        with self.assertRaises(self.common.ReadError) as e:
            self.common.check_two_levels(self.rows("a,", "a1,a", "a1,a"), "x.csv")
        self.assertIn("x.csv", str(e.exception))
        self.assertIn("code a1 is repeated", str(e.exception))

    def test_list_with_empty_code_fails(self):
        with self.assertRaises(self.common.ReadError) as e:
            self.common.check_two_levels(self.rows("a,", ",a", "a1,a"), "x.csv")
        self.assertIn("x.csv", str(e.exception))
        self.assertIn("empty 代碼", str(e.exception))

    def test_spaces_are_stripped(self):
        # Spaces around 代碼 and 上層 are not part of the code.
        rows = self.rows(" a ,", " a1 , a ")
        self.common.check_two_levels(rows, "x.csv")
        self.assertEqual(self.common.leaf_codes(rows), ["a1"])
        self.edit("domain-types.csv", lambda t: t.replace("\ntransport,交通,economic-development,",
                                                          "\n transport , 交通 , economic-development ,", 1))
        domains = self.common.domain_types(self.dir)
        self.assertIn("transport", domains)
        self.assertEqual(domains["transport"]["上層"], "economic-development")
        self.assertEqual(domains["transport"]["名稱"], "交通")

    def test_empty_code_in_file_fails_with_row_number(self):
        # transport is on row 15 of the file (row 1 is the header).
        self.edit("domain-types.csv", lambda t: t.replace("\ntransport,交通,", "\n,交通,", 1))
        with self.assertRaises(self.common.ReadError) as e:
            self.common.domain_types(self.dir)
        self.assertIn("domain-types.csv", str(e.exception))
        self.assertIn("row 15: empty 代碼", str(e.exception))

    def test_file_with_no_rows_fails(self):
        for name, reader in (("domain-types.csv", self.common.domain_types),
                             ("solution-types.csv", self.common.solution_types)):
            with self.subTest(name=name):
                self.edit(name, lambda t: t.split("\n", 1)[0] + "\n")
                with self.assertRaises(self.common.ReadError) as e:
                    reader(self.dir)
                self.assertIn(name, str(e.exception))
                self.assertIn("no rows", str(e.exception))

    def test_domain_reader_runs_the_two_level_check(self):
        self.edit("domain-types.csv", lambda t: t.replace("\ntransport,交通,economic-development,", "\ntransport,交通,zz,", 1))
        with self.assertRaises(self.common.ReadError) as e:
            self.common.domain_types(self.dir)
        self.assertIn("domain-types.csv", str(e.exception))
        self.assertIn("transport", str(e.exception))

    def test_repeated_code_fails(self):
        for name, line in (("domain-types.csv", "transport,交通,economic-development,重複。,交通支出,\n"),
                           ("solution-types.csv", "intake,受理與派工,重複。,重複。,Organisation\n")):
            with self.subTest(name=name):
                self.edit(name, lambda t: t + line)
                reader = self.common.domain_types if name.startswith("domain") else self.common.solution_types
                with self.assertRaises(self.common.ReadError) as e:
                    reader(self.dir)
                self.assertIn(name, str(e.exception))
                self.assertIn(line.split(",")[0], str(e.exception))

    def test_missing_column_fails(self):
        for name, reader in (("domain-types.csv", self.common.domain_types),
                             ("solution-types.csv", self.common.solution_types)):
            with self.subTest(name=name):
                self.edit(name, lambda t: t.replace(",說明,", ",備註,", 1))
                with self.assertRaises(self.common.ReadError) as e:
                    reader(self.dir)
                self.assertIn(name, str(e.exception))
                self.assertIn("說明", str(e.exception))

    def test_same_read_error_as_build_json(self):
        # build_json.ReadError is the class of the analysis_common module it imports.
        build = load("build_json")
        self.assertIs(build.ReadError, build.common.ReadError)
        self.assertIs(build.read_csv, build.common.read_csv)


class PracticeTest(unittest.TestCase):
    """The 6.1 practice tables (ETBlue, 2026-10-22)."""

    @classmethod
    def setUpClass(cls):
        cls.common = load("analysis_common")

    def test_place(self):
        place = self.common.practice_place
        self.assertEqual(place("美國紐約：Better Bin"), ("美國紐約", "Better Bin"))
        self.assertEqual(place("臺灣臺北市：參與式預算"), ("臺灣臺北市", "參與式預算"))
        self.assertEqual(place("英國：演算法透明紀錄標準（ATRS）"), ("英國", "演算法透明紀錄標準（ATRS）"))
        self.assertIsNone(place("OneMillionTrees 運動"))
        self.assertIsNone(place("結構土壤（structural soil）"))
        self.assertIsNone(place("新加坡："))

    def test_refs(self):
        sections = {"1": "A", "2": "B", "4": "D"}
        refs = lambda use: self.common.practice_refs(use, sections)
        self.assertEqual(refs("解法 C、D 的成效衡量（6.3）。見 7.4"), (["C", "D"], []))
        self.assertEqual(refs("7.2、7.1 的相關法規"), (["B", "A"], []))
        self.assertEqual(refs("C6 的參考；#8 解法 B 的設備"), ([], []))
        self.assertEqual(refs("解法 A；見 7.6"), (["A"], ["7.6"]))
        self.assertEqual(refs("約 17.5 公尺"), ([], []))

    def test_every_issue_row_has_a_place_and_a_solution(self):
        for folder in ISSUES:
            text = read(folder)
            found = self.common.practice_tables(text)
            self.assertTrue(found, folder)
            for _, rows in found:
                for r in rows:
                    with self.subTest(folder=folder, row=r[0]):
                        self.assertIsNotNone(self.common.practice_place(r[0]))
                        codes, bad = self.common.practice_refs(r[2], self.common.step7_sections(text))
                        self.assertTrue(codes)
                        self.assertEqual(bad, [])


if __name__ == "__main__":
    unittest.main()
