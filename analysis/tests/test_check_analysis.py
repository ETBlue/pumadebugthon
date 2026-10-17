"""Tests for analysis/check_analysis.py.

Each test copies every issue folder that has an issue-analysis.md, and the shared files, into a temp dir, changes one
thing, runs the check as a subprocess, and looks at the exit code and output.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import os, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "check_analysis.py")
SHARED = ("issues.csv", "stakeholders.csv", "path-labels.csv", "space-types.csv", "method.md")
ISSUE = "2-trashcans"


def issue_folders():
    """Names of the issue folders in the working tree that have an issue-analysis.md."""
    return sorted(n for n in os.listdir(ANALYSIS)
                  if os.path.isfile(os.path.join(ANALYSIS, n, "issue-analysis.md")))


class CheckAnalysisTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = os.path.join(self._tmp.name, "analysis")
        os.makedirs(self.dir)
        for name in SHARED:
            shutil.copy(os.path.join(ANALYSIS, name), self.dir)
        for folder in issue_folders():
            shutil.copytree(os.path.join(ANALYSIS, folder), os.path.join(self.dir, folder))
        self.md = os.path.join(self.dir, ISSUE, "issue-analysis.md")
        self.csv = os.path.join(self.dir, ISSUE, "user-stories.csv")

    def tearDown(self):
        self._tmp.cleanup()

    def edit(self, rel, old, new):
        """Replace one exact piece of text in a copied file."""
        path = os.path.join(self.dir, rel)
        enc = "utf-8-sig" if path.endswith(".csv") else "utf-8"
        with open(path, encoding=enc) as f:
            text = f.read()
        self.assertEqual(text.count(old), 1, f"{old!r} must occur once in {rel}")
        with open(path, "w", encoding=enc, newline="") as f:
            f.write(text.replace(old, new))

    def run_check(self):
        p = subprocess.run([sys.executable, "-I", SCRIPT, self.md, self.csv],
                           capture_output=True, text=True)
        return p.returncode, p.stdout + p.stderr

    def assertFails(self, *needles):
        code, out = self.run_check()
        self.assertEqual(code, 1, out)
        for n in needles:
            self.assertIn(n, out)

    def test_issue_2_passes(self):
        code, out = self.run_check()
        self.assertEqual(code, 0, out)
        self.assertIn("PASS", out)

    def test_step1_name_differs_from_stakeholders_csv(self):
        self.edit("stakeholders.csv", "I05,高齡者,", "I05,年長者,")
        self.assertFails("I05", "年長者")

    def test_path_prefix_without_label(self):
        self.edit("path-labels.csv", "gov-local-taipei-epb,環保局\n", "")
        self.assertFails("gov-local-taipei-epb")

    def test_unknown_space_code_in_issue_line(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "`park`、`mrt-exit`\n", "`park`、`mrt-exit`、`moon`\n")
        self.assertFails("moon")

    def test_solution_space_not_in_issue_list(self):
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` |",
                  "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park`、`parking` |")
        self.assertFails("solution D", "parking")

    def test_wrong_issue_value(self):
        self.edit("stakeholders.csv", "I05,高齡者,res,高齡,1 2,", "I05,高齡者,res,高齡,2,")
        self.assertFails("I05", "議題")

    def test_moved_id_must_have_empty_issue_value(self):
        self.edit("stakeholders.csv", "O02,便利商店店員,,,,已改為 I12", "O02,便利商店店員,,,2,已改為 I12")
        self.assertFails("O02", "議題")

    def test_step1_header_wrong(self):
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "**個人**\n\n| 利害關係人編號 | 利害關係人 | 分類路徑 | 特別關注 | 與本題的關係 |",
                  "**個人**\n\n| 利害關係人編號 | 利害關係人 | 類別 | 特別關注 | 與本題的關係 |")
        self.assertFails("step 1 table header")

    def test_step1_first_header_cell_renamed(self):
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "**組織**\n\n| 利害關係人編號 | 利害關係人 | 分類路徑 |",
                  "**組織**\n\n| 編號 | 利害關係人 | 分類路徑 |")
        self.assertFails("step 1 table header wrong", "編號 | 利害關係人")

    def test_step37_wrong_path(self):
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "| I11 | `[AI模擬]` 資源回收個體業者（含高齡回收者） | `wrk` |",
                  "| I11 | `[AI模擬]` 資源回收個體業者（含高齡回收者） | `res` |")
        self.assertFails("3.7: I11 分類路徑 res")

    def test_repeated_space_code_in_issue_line(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "`park`、`mrt-exit`\n", "`park`、`mrt-exit`、`park`\n")
        self.assertFails("space code park is listed twice")

    def test_repeated_space_code_in_solution(self):
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` |",
                  "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`sidewalk` |")
        self.assertFails("solution D: space code sidewalk is listed twice")

    def test_6_2_code_not_in_6_1(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| D | 參與式選址流程 |", "| E | 參與式選址流程 |")
        self.assertFails("6.2: solution E is not in 6.1", "6.2: solution D from 6.1 has no row")

    def test_6_2_old_layout_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "| 代號 | 解法 | 涵蓋的 Must | 涵蓋的 Should / Could | 涵蓋的相同訴求群組 |\n|---|---|---|---|---|",
                  "| 解法 | 涵蓋的 Must | 涵蓋的 Should / Could | 涵蓋的相同訴求群組 |\n|---|---|---|---|")
        self.assertFails("6.2: expected one table with the header")

    def test_6_2_any_capital_letter_code(self):
        # A code like E or K is fine when 6.1 has it too.
        md = f"{ISSUE}/issue-analysis.md"
        self.edit(md, "| D | `[AI模擬]` 參與式選址流程 |", "| K | `[AI模擬]` 參與式選址流程 |")
        self.edit(md, "| D | 參與式選址流程 |", "| K | 參與式選址流程 |")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_bare_pending_with_text_outside(self):
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "【待補：題目說滿溢偵測資料不存在】",
                  "【待補】題目說滿溢偵測資料不存在")
        self.assertFails("bad 待補 item '【待補】'", "題目說滿溢偵測資料不存在")

    def test_wrong_pending_forms(self):
        for wrong in ("【待補：】", "【待補:新工處】", "【待補新工處】", "【待補 】"):
            with self.subTest(wrong=wrong):
                self.tearDown(); self.setUp()
                self.edit(f"{ISSUE}/issue-analysis.md", "人行道寬度【待補：新工處】", f"人行道寬度{wrong}")
                self.assertFails(f"bad 待補 item {wrong!r}")

    def test_correct_pending_item_passes(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "人行道寬度【待補：新工處】", "人行道寬度【待補：新工處的人行道寬度資料】")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_broken_method_link(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "(../method.md#排序方法)", "(../method.md#沒有這一節)")
        self.assertFails("broken method link ../method.md#沒有這一節")

    def test_pending_in_backticks_is_allowed(self):
        # The step 4 summary names the format in backticks: 「`【待補】` 1 則」.
        code, out = self.run_check()
        self.assertEqual(code, 0, out)
        with open(self.md, encoding="utf-8") as f:
            self.assertIn("`【待補】` 1 則", f.read())

    def test_change_log_new_id_must_exist(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| O02-US01 | I12-US01 |", "| O02-US01 | I12-US09 |")
        self.assertFails("I12-US09")

    def test_id_in_change_log_only_is_allowed_but_not_elsewhere(self):
        # O02 is in the 編號異動紀錄 section only. Using it elsewhere must fail.
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "| 商圈發展協會、便利商店門市 | `[AI模擬]` O01、I12 |",
                  "| 商圈發展協會、便利商店門市 | `[AI模擬]` O01、O02 |")
        self.assertFails("O02")


if __name__ == "__main__":
    unittest.main()
