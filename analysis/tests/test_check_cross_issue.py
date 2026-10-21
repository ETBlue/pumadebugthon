"""Tests for analysis/scripts/check_cross_issue.py.

Each test copies the issue folders, the shared files and the cross-issue
folder into a temp dir, changes one thing, runs the check as a subprocess,
and looks at the exit code and output.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import os, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "scripts", "check_cross_issue.py")
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv", "docs/method.md", "data/open-data.csv", "docs/human-inputs.md")
CROSS = os.path.join("cross-issue", "cross-issue-analysis.md")


def issue_folders():
    """Names of the issue folders in the working tree that have an issue-analysis.md."""
    return sorted(n for n in os.listdir(ANALYSIS)
                  if os.path.isfile(os.path.join(ANALYSIS, n, "issue-analysis.md")))


class CheckCrossIssueTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = os.path.join(self._tmp.name, "analysis")
        os.makedirs(self.dir)
        for name in SHARED:
            os.makedirs(os.path.join(self.dir, os.path.dirname(name)), exist_ok=True)
            shutil.copy(os.path.join(ANALYSIS, name), os.path.join(self.dir, name))
        for folder in issue_folders() + ["cross-issue"]:
            shutil.copytree(os.path.join(ANALYSIS, folder), os.path.join(self.dir, folder))
        self.md = os.path.join(self.dir, CROSS)

    def tearDown(self):
        self._tmp.cleanup()

    def edit(self, old, new, rel=CROSS):
        """Replace one exact piece of text in a copied file."""
        path = os.path.join(self.dir, rel)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        self.assertEqual(text.count(old), 1, f"{old!r} must occur once in {rel}")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text.replace(old, new))

    def run_check(self):
        p = subprocess.run([sys.executable, "-I", SCRIPT, self.md], capture_output=True, text=True)
        return p.returncode, p.stdout + p.stderr

    def assertFails(self, *needles):
        code, out = self.run_check()
        self.assertEqual(code, 1, out)
        for n in needles:
            self.assertIn(n, out)

    # ---------- the real file ----------

    def test_real_file_passes(self):
        code, out = self.run_check()
        self.assertEqual(code, 0, out)
        self.assertIn("PASS", out)

    # ---------- the issues the file compares ----------

    def test_title_names_issue_without_analysis(self):
        # The title names the issues the file compares (「#1、#2、#8、#9」).
        self.edit("# 跨議題分析：#1、#2、#8、#9（試作）", "# 跨議題分析：#1、#2、#3、#8、#9（試作）")
        self.assertFails("title", "#3")

    def test_title_without_issue_numbers(self):
        self.edit("# 跨議題分析：#1、#2、#8、#9（試作）", "# 跨議題分析（試作）")
        self.assertFails("title")

    @unittest.skipUnless(os.path.isfile(os.path.join(ANALYSIS, "9-policydiscovery", "issue-analysis.md")), "needs #9")
    def test_issue_not_in_title_gives_a_note(self):
        # #9 shares stakeholders with #1, #2 and #8. When the title does not name it, the
        # check prints a note for a person (the owner decides). The #9 column of 1.1 then
        # is an error, but the note is still there.
        self.edit("# 跨議題分析：#1、#2、#8、#9（試作）", "# 跨議題分析：#1、#2、#8（試作）")
        code, out = self.run_check()
        self.assertIn("NOTE: issue #9", out)
        self.assertIn("O07", out)

    def test_real_file_compares_9_and_gives_no_note(self):
        # ETBlue added #9 on 2026-10-20, so no issue is left out.
        code, out = self.run_check()
        self.assertEqual(code, 0, out)
        self.assertIn("issues: [1, 2, 8, 9]", out)
        self.assertNotIn("NOTE:", out)

    # ---------- tags and 待補 ----------

    def test_tag_without_backticks(self):
        self.edit("| 人行道設施帶的分配 | `[AI模擬]` 樹", "| 人行道設施帶的分配 | [AI模擬] 樹")
        self.assertFails("without backticks")

    def test_empty_pending_item(self):
        self.edit("【待補：試點後由 X-A 產生】", "【待補】")
        self.assertFails("bad 待補 item")

    def test_excluded_country(self):
        self.edit("可以參考美國費城選點前", "可以參考香港與美國費城選點前")
        self.assertFails("香港")

    # ---------- references ----------

    def test_story_without_issue_number(self):
        self.edit("| X-C2 | `[AI模擬]` 行人希望", "| X-C2 | `[AI模擬]` I01-US09 的行人希望")
        self.assertFails("I01-US09", "#n")

    def test_unknown_cross_ref(self):
        self.edit("| #1 解法 C、#2 解法 D、#8 解法 A | `sidewalk`", "| #1 解法 C、#2 解法 Z、#8 解法 A | `sidewalk`")
        self.assertFails("#2 解法 Z")

    def test_summary_ref_not_in_file(self):
        self.edit("| X-N06、X-N07、X-N08 |\n", "| X-N06、X-N09 |\n")
        self.assertFails("X-N09")

    def test_summary_topics_order(self):
        self.edit("### 法規上的障礙", "### 相依事項的暫存")
        self.edit("### 相依事項與現行政策的關係", "### 法規上的障礙")
        self.edit("### 相依事項的暫存", "### 相依事項與現行政策的關係")
        self.assertFails("fixed order")

    # ---------- shared stakeholders ----------

    def test_shared_stakeholder_missing(self):
        self.edit("| I19 | 無家者 | 經濟弱勢 | #1、#8 | #1 I19-US01 | — | #8 I19-US01 | — |\n", "")
        self.assertFails("I19")

    def test_shared_stakeholder_story_missing(self):
        self.edit("| #8 O03-US01 | — |\n", "| — | — |\n")
        self.assertFails("O03", "#8")

    def test_focus_group_order(self):
        self.edit("| 外籍 | I03、I04 | — |\n| 經濟弱勢 | I19 | — |", "| 經濟弱勢 | I19 | — |\n| 外籍 | I03、I04 | — |")
        self.assertFails("fixed order")

    # ---------- X-N groups ----------

    def test_need_group_one_stakeholder(self):
        self.edit("| #2 N09、#8 N05 | #2 I03-US01、#2 I04-US01、#8 I01-US10、#8 I03-US01、#8 I19-US01、#8 I25-US03 | I03、I04、I01、I19、I25 |",
                  "| #2 N09、#8 N05 | #2 I03-US01、#8 I03-US01 | I03 |")
        self.assertFails("X-N05")

    def test_need_group_one_issue(self):
        self.edit("| #2 N06、#8 N08 | #2 I01-US02、#2 I01-US08、#2 I09-US01、#2 I09-US02、#2 I09-US03、#2 I23-US01、#8 O03-US01、#8 I01-US09 | I01、I09、I23、O03 |",
                  "| #2 N06 | #2 I01-US02、#2 I01-US08、#2 I09-US01、#2 I09-US02、#2 I09-US03、#2 I23-US01 | I01、I09、I23 |")
        self.assertFails("X-N06", "2 or more issues")

    def test_need_group_stories_wrong(self):
        self.edit("| #1 N07、#2 N10、#8 O07-US01、#9 N01 | #1 O06-US01、#1 O07-US01、#1 O07-US02、",
                  "| #1 N07、#2 N10、#8 O07-US01、#9 N01 | #1 O06-US01、#1 O07-US01、")
        self.assertFails("X-N04", "故事編號")

    def test_priority_raised(self):
        self.edit("| `[AI模擬]` 各議題不同 | `[AI模擬]` #2 N06 是 Must", "| `[AI模擬]` M | `[AI模擬]` #2 N06 是 Must")
        self.assertFails("X-N06", "各議題不同")

    def test_priority_not_from_issues(self):
        self.edit("| #1 N15 S、#2 N03 S、#8 N07 S | `[AI模擬]` S |", "| #1 N15 S、#2 N03 S、#8 N07 S | `[AI模擬]` M |")
        self.assertFails("X-N03")

    def test_priority_listed_wrong(self):
        self.edit("| #1 N15 S、#2 N03 S、#8 N07 S |", "| #1 N15 M、#2 N03 S、#8 N07 S |")
        self.assertFails("#1 N15")

    def test_need_group_not_covered(self):
        self.edit("| X-N04、X-N05、X-N07、X-N08 |", "| X-N05、X-N07、X-N08 |")
        self.assertFails("X-N04", "not covered")

    # ---------- conflicts ----------

    def test_issue_conflict_with_cross_ref_not_listed(self):
        self.edit("| X-C2 | `[AI模擬]` 行人希望清潔箱離吸菸區遠一點；但清潔箱和吸菸區都要設在捷運站出口與商圈等人多的地方 | #2 C9 |",
                  "| X-C2 | `[AI模擬]` 行人希望清潔箱離吸菸區遠一點；但清潔箱和吸菸區都要設在捷運站出口與商圈等人多的地方 | #2 C1 |")
        self.assertFails("#2 C9")

    def test_way_out_unknown_code(self):
        self.edit("| `[AI模擬]` 解法 X-E、X-B：", "| `[AI模擬]` 解法 X-E、X-Q：")
        self.assertFails("X-Q")

    def test_conflict_needs_not_a_need(self):
        self.edit("| #2 I01-US09 vs #2 N01、#2 N02、#8 I25-US01 |", "| #2 I01-US09 vs #2 I01-US01、#2 N02、#8 I25-US01 |")
        self.assertFails("#2 I01-US01")

    # ---------- combined solutions ----------

    def test_combined_solution_one_issue(self):
        self.edit("| #2 解法 A、#2 解法 B、#8 解法 B |", "| #2 解法 A、#2 解法 B |")
        self.assertFails("X-E", "2 or more issues")

    def test_combined_space_not_in_parts(self):
        self.edit("| #1 解法 B、#2 解法 B、#8 解法 D | `sidewalk`、`park`、`mrt-exit` |",
                  "| #1 解法 B、#2 解法 B、#8 解法 D | `sidewalk`、`park`、`mrt-exit`、`utility` |")
        self.assertFails("X-C", "utility")

    def test_must_column_priority_wrong(self):
        self.edit("| `[AI模擬]` #2 N01、#9 N02、#9 N05 | #1 N06、", "| `[AI模擬]` #2 N01、#9 N02、#9 N05、#1 N06 | ")
        self.assertFails("#1 N06", "Must")

    def test_issue_9_need_not_covered_by_its_part(self):
        # #9 解法 D (the #9 part of X-D) does not cover #9 N03 in #9 6.2.
        self.edit("| `[AI模擬]` #2 N01、#9 N02、#9 N05 |", "| `[AI模擬]` #2 N01、#9 N02、#9 N03、#9 N05 |")
        self.assertFails("#9 N03", "X-D")

    def test_issue_9_need_with_one_issue_priority_changed(self):
        # X-N08 joins #2 I13-US02 (S) and #9 N02 (M), so its priority is 「各議題不同」, never M.
        self.edit("| #2 I13-US02 S、#9 N02 M | `[AI模擬]` 各議題不同 |", "| #2 I13-US02 S、#9 N02 M | `[AI模擬]` M |")
        self.assertFails("X-N08", "各議題不同")

    def test_need_not_covered_by_parts(self):
        self.edit("| `[AI模擬]` #1 N08、#1 O12-US01、", "| `[AI模擬]` #1 N03、#1 N08、#1 O12-US01、")
        self.assertFails("#1 N03", "X-B")

    def test_measure_from_other_solution(self):
        self.edit("| 人行道範圍圖 | #1 解法 D |\n| X-B | 「SWW_WTH」", "| 人行道範圍圖 | #1 解法 C |\n| X-B | 「SWW_WTH」")
        self.assertFails("#1 解法 C", "X-B")

    def test_risk_row_missing(self):
        self.edit("| X-E | `[AI模擬]` 環保局（清潔箱與清運）", "| X-Z | `[AI模擬]` 環保局（清潔箱與清運）")
        self.assertFails("X-E")

    # Each 主要風險 cell in 4.5 has the disaster risks of its parts, written as
    # 「災害風險：…（#n 解法 X）」 (ETBlue, 2026-10-22; method.md, step 7).
    DISASTER_E = "；災害風險：負壓式吸菸區停電時無法排氣"

    def test_risk_cell_without_disaster_risks(self):
        self.edit(self.DISASTER_E, "；負壓式吸菸區停電時無法排氣")
        self.assertFails("4.5 X-E: 主要風險 has no 「災害風險：」")

    def test_risk_cell_with_empty_disaster_risks(self):
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        tail = text[text.index(self.DISASTER_E):text.index("（#2 解法 B） |\n\n")] + "（#2 解法 B）"
        self.edit(tail, "；災害風險：")
        self.assertFails("4.5 X-E: 主要風險 has no 「災害風險：」")


if __name__ == "__main__":
    unittest.main()
