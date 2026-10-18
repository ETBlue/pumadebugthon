"""Tests for analysis/analysis_common.py and for the step 1 rule in the three
scripts that use it (check_analysis.py, sync_stakeholders.py, build_json.py).

The tests read the issue files in the working tree. They do not change them.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import csv, importlib.util, os, re, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ISSUES = {"1-trees": 28, "2-trashcans": 27}  # folder -> number of step 1 stakeholders


def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ANALYSIS, f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def read(folder):
    with open(os.path.join(ANALYSIS, folder, "issue-analysis.md"), encoding="utf-8") as f:
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
        self.assertEqual(len(ids), 51)
        self.assertIn("O01-US01", ids)

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
        with open(os.path.join(ANALYSIS, "space-types.csv"), encoding="utf-8-sig", newline="") as f:
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


if __name__ == "__main__":
    unittest.main()
