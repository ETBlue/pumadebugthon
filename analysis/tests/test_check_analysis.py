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

    def run_check(self, folder=None):
        md, csv_ = self.md, self.csv
        if folder:
            md = os.path.join(self.dir, folder, "issue-analysis.md")
            csv_ = os.path.join(self.dir, folder, "user-stories.csv")
        p = subprocess.run([sys.executable, "-I", SCRIPT, md, csv_],
                           capture_output=True, text=True)
        return p.returncode, p.stdout + p.stderr

    def assertFails(self, *needles, folder=None):
        code, out = self.run_check(folder)
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
        self.edit("stakeholders.csv", "I05,高齡者,res,高齡,1 2 8,", "I05,高齡者,res,高齡,2,")
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
        self.edit(f"{ISSUE}/issue-analysis.md", "| D | 參與式選址流程 |", "| F | 參與式選址流程 |")
        self.assertFails("6.2: solution F is not in 6.1", "6.2: solution D from 6.1 has no row")

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

    # Cross-issue references: 「#2 O01-US01」 written in another issue file.
    # The C4 模擬結果 cell of #1 is free text, so the tests add references there.
    C4_RESULT = "（O01-US02），可以從這點開始談"

    def add_to_issue_1(self, ref):
        self.edit("1-trees/issue-analysis.md", self.C4_RESULT, f"（O01-US02），可以從這點開始談（{ref}）")

    def test_issue_1_passes(self):
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 0, out)

    def test_cross_issue_story_reference_passes(self):
        self.add_to_issue_1("見 #2 O01-US01")
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 0, out)

    def test_cross_issue_stakeholder_reference_passes(self):
        self.add_to_issue_1("見 #2 O03")
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 0, out)

    def test_cross_issue_story_not_in_that_issue(self):
        self.add_to_issue_1("見 #2 O99-US01")
        self.assertFails("#2 O99-US01", folder="1-trees")

    def test_cross_issue_stakeholder_not_in_that_issue(self):
        self.add_to_issue_1("見 #2 O99")
        self.assertFails("#2 O99", folder="1-trees")

    def test_cross_issue_unknown_issue_number(self):
        self.add_to_issue_1("見 #9 O01-US01")
        self.assertFails("#9 O01-US01", "issues.csv", folder="1-trees")

    def test_cross_issue_reference_to_own_issue(self):
        self.add_to_issue_1("見 #1 O01-US01")
        self.assertFails("#1 O01-US01", "local ID", folder="1-trees")

    def test_cross_issue_reference_in_conflict_stories_cell(self):
        self.edit("1-trees/issue-analysis.md", "`[AI模擬]` O01-US01 vs I01-US01、I16-US01",
                  "`[AI模擬]` O01-US01、#2 O01-US01 vs I01-US01、I16-US01")
        self.assertFails("5.4", "#2 O01-US01", folder="1-trees")

    def test_cross_issue_reference_in_6_2_cell(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| D | 參與式選址流程 | `[AI模擬]` O04-US01",
                  "| D | 參與式選址流程 | `[AI模擬]` #1 O01-US01、O04-US01")
        self.assertFails("6.2", "#1 O01-US01")


    # The third source tag, [AI整理] (owner decision 2026-10-18): AI summarized it
    # from real data, with counts. It is accepted wherever [實證] and [AI模擬] are.
    ROW_MD = ("| O01-US01 | 商圈店家與攤商 | `[AI模擬]` 商圈有足夠的清潔箱 | — | "
              "`[AI模擬]` 客人不會把垃圾放在店門口或花台 | 可詢問商圈發展協會；市民留言約 118 則提到同樣訴求"
              "（「市長，你給我聽好了」資料，關鍵字估算） | `[AI模擬]` S |")
    ROW_CSV = ("商圈有足夠的清潔箱,[AI模擬],—,客人不會把垃圾放在店門口或花台,[AI模擬],可詢問商圈發展協會；"
               "市民留言約 118 則提到同樣訴求（「市長，你給我聽好了」資料，關鍵字估算）,S,[AI模擬]")

    def test_ai_summary_tag_passes(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.ROW_MD, self.ROW_MD.replace("[AI模擬]", "[AI整理]"))
        self.edit(f"{ISSUE}/user-stories.csv", self.ROW_CSV, self.ROW_CSV.replace("[AI模擬]", "[AI整理]"))
        code, out = self.run_check()
        self.assertEqual(code, 0, out)
        self.assertIn("'[AI整理]': 12", out)

    def test_ai_summary_tag_in_group_and_moscow_rows_passes(self):
        md = f"{ISSUE}/issue-analysis.md"
        self.edit(md, "| `[AI模擬]` W01 |", "| `[AI整理]` W01 |")
        self.edit(md, "| `[AI模擬]` Must | 16 |", "| `[AI整理]` Must | 16 |")
        self.edit(md, "| I11 | `[AI模擬]` 資源回收個體業者", "| I11 | `[AI整理]` 資源回收個體業者")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_bare_ai_summary_tag_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.ROW_MD,
                  self.ROW_MD.replace("`[AI模擬]` 商圈有足夠的清潔箱", "[AI整理] 商圈有足夠的清潔箱"))
        self.assertFails("1 tag(s) without backticks")

    def test_ai_summary_tag_variant_fails(self):
        for wrong in ("[AI 整理]", "[ai整理]", "[AI模擬 ]"):
            with self.subTest(wrong=wrong):
                self.tearDown(); self.setUp()
                self.edit(f"{ISSUE}/issue-analysis.md", self.ROW_MD,
                          self.ROW_MD.replace("`[AI模擬]` 商圈有足夠的清潔箱", f"`{wrong}` 商圈有足夠的清潔箱"))
                self.assertFails(f"tag variant {wrong}")

    def test_ai_summary_tag_in_source_cell_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.ROW_MD,
                  self.ROW_MD.replace("| 可詢問商圈發展協會；", "| `[AI整理]` 可詢問商圈發展協會；"))
        self.assertFails("O01-US01 來源 cell should not have a tag")

if __name__ == "__main__":
    unittest.main()
