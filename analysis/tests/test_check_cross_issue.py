"""Tests for analysis/scripts/check_cross_issue.py.

Each test copies the issue folders, the shared files and the cross-issue
folder into a temp dir, changes one thing, runs the check as a subprocess,
and looks at the exit code and output.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import os, shutil, subprocess, sys, tempfile, unittest

from . import new_format as NEW_FORMAT

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "scripts", "check_cross_issue.py")
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv", "data/domain-types.csv", "data/solution-types.csv", "docs/method.md", "data/open-data.csv", "docs/human-inputs.md")
CROSS = os.path.join("cross-issue", "cross-issue-analysis.md")


def issue_folders():
    """Names of the issue folders in the working tree that have an issue-analysis.md."""
    return sorted(n for n in os.listdir(ANALYSIS)
                  if n != "0-template"  # the template folder is not an issue
                  and os.path.isfile(os.path.join(ANALYSIS, n, "issue-analysis.md")))


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
        # The title names the issues the file compares (「#1、#2、#3、#4、#5、#6、#8、#9」).
        # Since 2026-10-23 every issue in issues.csv has an issue-analysis.md, so
        # the test adds a fake issue #7 with no folder to the copied issues.csv.
        with open(os.path.join(self.dir, "data", "issues.csv"), "a", encoding="utf-8") as f:
            f.write("7,7-test,測試用的議題（沒有分析）,主辦單位,\n")
        self.edit("# 跨議題分析：#1、#2、#3、#4、#5、#6、#8、#9、#10、#11、#12（試作）", "# 跨議題分析：#1、#2、#3、#4、#5、#6、#7、#8、#9、#10、#11、#12（試作）")
        self.assertFails("title", "#7")

    def test_title_without_issue_numbers(self):
        self.edit("# 跨議題分析：#1、#2、#3、#4、#5、#6、#8、#9、#10、#11、#12（試作）", "# 跨議題分析（試作）")
        self.assertFails("title")

    @unittest.skipUnless(os.path.isfile(os.path.join(ANALYSIS, "9-policydiscovery", "issue-analysis.md")), "needs #9")
    def test_issue_not_in_title_gives_a_note(self):
        # #9 shares stakeholders with the other issues. When the title does not name it,
        # the check prints a note for a person (the owner decides). The #9 column of 1.1
        # then is an error, but the note is still there.
        self.edit("# 跨議題分析：#1、#2、#3、#4、#5、#6、#8、#9、#10、#11、#12（試作）", "# 跨議題分析：#1、#2、#3、#4、#5、#6、#8、#10、#11、#12（試作）")
        code, out = self.run_check()
        self.assertIn("NOTE: issue #9", out)
        self.assertIn("O07", out)

    def test_real_file_compares_all_issues_without_notes(self):
        # ETBlue added #9 on 2026-10-20, #3, #4, #5 and #6 on 2026-10-23, and #10, #11
        # and #12 on 2026-10-24. Every issue with an analysis is compared, so the check
        # prints no note.
        code, out = self.run_check()
        self.assertEqual(code, 0, out)
        self.assertIn("issues: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12]", out)
        self.assertNotIn("NOTE:", out)

    # ---------- tags and 待補 ----------

    def test_tag_without_backticks(self):
        self.edit("| 人行道設施帶的分配 | `[AI模擬]` 樹", "| 人行道設施帶的分配 | [AI模擬] 樹")
        self.assertFails("without backticks")

    def test_cell_with_two_tags(self):
        # Only the step 7 solution tables of an issue file may have cells with
        # more than one tag (ETBlue, 2026-10-22). This file keeps one tag per cell.
        self.edit("| 人行道設施帶的分配 | `[AI模擬]` 樹", "| 人行道設施帶的分配 | `[實證]` 官方資料 `[AI模擬]` 樹")
        self.assertFails("a cell has 2 tags")

    # ---------- 4.5 in the new step 7 format (plan-wbs-rollout.md, Task 1) ----------

    def new_format(self, code="X-S5"):
        """Put the small new-format fixture into the 4.5 section of this
        solution, in the copy. The other sections keep their real content."""
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        with open(self.md, "w", encoding="utf-8") as f:
            f.write(NEW_FORMAT.cross_to_new_format(text, code))

    def old_format(self, code="X-S5"):
        """Put the 4.5 section of this solution back in the old format, in the copy."""
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        with open(self.md, "w", encoding="utf-8") as f:
            f.write(NEW_FORMAT.cross_to_old_format(text, code))

    def edit_section(self, code, old, new):
        """Replace one exact piece of text inside the 4.5 section of this solution."""
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        start, end = NEW_FORMAT.cross_section_span(text, code)
        part = text[start:end]
        self.assertEqual(part.count(old), 1, f"{old!r} must occur once in {code}")
        with open(self.md, "w", encoding="utf-8") as f:
            f.write(text[:start] + part.replace(old, new) + text[end:])

    def test_new_format_passes(self):
        self.new_format()
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_old_format_section_fails(self):
        # Since 2026-11-09 every 4.5 section must be in the new format.
        self.old_format()
        self.assertFails("4.5 X-S5: the rows of the table 執行計畫 | 內容 must be 主責單位、需要的資料／API／資源、成本, in this order; found",
                         "4.5 X-S5: 成本: no 「時間」 range",
                         "4.5 X-S5: expected one work breakdown table",
                         "4.5 X-S5: expected one ```mermaid block")

    def test_unknown_table_fails(self):
        self.edit_section("X-S5", "| 項目 | 內容 |\n", "| 備註 | 內容 |\n|---|---|\n| 其他 | `[AI模擬]` 說明 |\n\n| 項目 | 內容 |\n")
        self.assertFails("4.5 X-S5: unknown table 「備註 | 內容」")

    def test_second_tag_without_backticks_in_work_item_is_reported(self):
        # This cell used to crash schedule_data with a ValueError.
        self.new_format()
        self.edit_section("X-S5", "| 1.1 | `[AI模擬]` 和各區公所訂好流程 |", "| 1.1 | `[AI模擬]` 依 [實證] 和各區公所訂好流程 |")
        code, out = self.run_check()
        self.assertEqual(code, 1, out)
        self.assertIn("4.5 X-S5: work breakdown row 「1.1」: the 工作項目 cell has 2 tags; write one tag", out)
        self.assertNotIn("Traceback", out)

    def test_new_format_chart_order_does_not_match_the_wbs(self):
        self.new_format()
        self.edit("  1.1 訂好流程 :t1_1, 2000-01-01, 30d\n  1.2 選出試點的里 :t1_2, after t1_1, 30d\n",
                  "  1.2 選出試點的里 :t1_2, 2000-01-01, 30d\n  1.1 訂好流程 :t1_1, after t1_2, 30d\n")
        self.assertFails("4.5 X-S5: chart section 「1 準備」: the tasks must be the level 2 rows 1.1、1.2, in order; found 1.2、1.1")

    def test_new_format_chart_length_does_not_match_the_wbs(self):
        # The WBS says 第 3–6 個月 (120 days). The chart says 90 days.
        self.new_format()
        self.edit("2.1 辦里民工作坊 :t2_1, after t1_2, 120d", "2.1 辦里民工作坊 :t2_1, after t1_2, 90d")
        self.assertFails("4.5 X-S5: ", "2.1")

    def test_new_format_cost_needs_the_ranges(self):
        self.new_format()
        self.edit("；人力：約 120–200 人天【待補：專業人士確認】", "【待補：專業人士確認】")
        self.assertFails("4.5 X-S5: 成本: no 「人力」 range")

    def test_new_format_has_no_steps_row(self):
        self.new_format()
        self.edit_section("X-S5", "【待補：專業人士確認】 |\n", "【待補：專業人士確認】 |\n| 執行步驟 | `[AI模擬]` 第一步 |\n")
        self.assertFails("4.5 X-S5: the rows of the table 執行計畫 | 內容 must be 主責單位、需要的資料／API／資源、成本, in this order; found")

    def test_new_format_chart_without_wbs_fails(self):
        self.new_format()
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        start = text.index("| 編號 | 工作項目 |", text.index("### 4.5.5 解法 X-S5："))
        with open(self.md, "w", encoding="utf-8") as f:
            f.write(text[:start] + text[text.index("```mermaid", start):])
        self.assertFails("4.5 X-S5: expected one work breakdown table")

    def test_only_the_cost_cell_of_the_new_format_has_two_tags(self):
        # The 主責單位 cell of a section in the new format still has one tag.
        self.new_format()
        self.edit("| 主責單位 | `[AI模擬]` 環保局 |", "| 主責單位 | `[實證]` 環保局 `[AI模擬]` 協作 |")
        self.assertFails("a cell has 2 tags")

    def test_old_format_cost_cell_keeps_one_tag(self):
        self.old_format()
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        old = next(l for l in text[text.index("### 4.5.5 解法 X-S5："):].splitlines() if l.startswith("| 成本 | "))
        self.edit(old, old[:-2] + " `[AI模擬]` 時間 |")
        self.assertFails("a cell has 2 tags")

    def test_empty_pending_item(self):
        self.edit("【待補：試點後由 X-S1 產生】", "【待補】")
        self.assertFails("bad 待補 item")

    def test_excluded_country(self):
        self.edit("可以參考美國費城選點前", "可以參考香港與美國費城選點前")
        self.assertFails("香港")

    # ---------- references ----------

    def test_story_without_issue_number(self):
        self.edit("| X-C2 | `[AI模擬]` 行人希望", "| X-C2 | `[AI模擬]` I01-US09 的行人希望")
        self.assertFails("I01-US09", "#n")

    def test_unknown_cross_ref(self):
        self.edit("| #1 解法 S3、#2 解法 S4、#8 解法 S1 | `sidewalk-furniture`", "| #1 解法 S3、#2 解法 S99、#8 解法 S1 | `sidewalk-furniture`")
        self.assertFails("#2 解法 S99")

    # ---------- ID format (ETBlue, 2026-10-31) ----------

    def test_old_solution_code_fails(self):
        # An old ID: one capital letter after X-.
        self.edit("| X-S1 | `[AI模擬]` 同一段人行道的共同參與式選址 |", "| X-" + "A | `[AI模擬]` 同一段人行道的共同參與式選址 |")
        self.assertFails("old cross-issue solution code: write X-S1")

    def test_old_need_group_id_fails(self):
        # An old ID: a zero padding.
        self.edit("| `[AI模擬]` X-N1 | 意見在設施設置", "| `[AI模擬]` X-N" + "01 | 意見在設施設置")
        self.assertFails("has a zero padding: write X-N1")

    def test_old_issue_solution_code_fails(self):
        # An old ID: 「#8 解法」 and one capital letter.
        self.edit("| X-S1 | `[AI模擬]` 同一段人行道的共同參與式選址 | #1 解法 S3、#2 解法 S4、#8 解法 S1 |",
                  "| X-S1 | `[AI模擬]` 同一段人行道的共同參與式選址 | #1 解法 S3、#2 解法 S4、#8 解法 " + "A |")
        self.assertFails("is an old solution code: write S1")

    def test_need_id_is_not_a_solution_code(self):
        # The kinds do not mix: X-N1 in the 代號 column of 4.1 is an error.
        self.edit("| X-S1 | `[AI模擬]` 同一段人行道的共同參與式選址 |", "| X-N1 | `[AI模擬]` 同一段人行道的共同參與式選址 |")
        self.assertFails("4.1: 代號 「X-N1」 is not a cross-issue solution ID")

    def test_solution_id_is_not_a_need_group(self):
        self.edit("| `[AI模擬]` X-N1 | 意見在設施設置", "| `[AI模擬]` X-S1 | 意見在設施設置")
        self.assertFails("2.1: 群組 must be a tag and an X-N ID")

    def test_summary_ref_not_in_file(self):
        self.edit("| X-N6、X-N7、X-N8、X-N16、X-N20 |\n", "| X-N6、X-N99 |\n")
        self.assertFails("X-N99")

    def test_summary_topics_order(self):
        self.edit("### 法規上的障礙", "### 相依事項的暫存")
        self.edit("### 相依事項與現行政策的關係", "### 法規上的障礙")
        self.edit("### 相依事項的暫存", "### 相依事項與現行政策的關係")
        self.assertFails("fixed order")

    # ---------- shared stakeholders ----------

    def test_shared_stakeholder_missing(self):
        self.edit("| I19 | 無家者 | 經濟弱勢 | #1、#3、#8 | #1 I19-US01 | — | #3 I19-US01 | — | — | — | #8 I19-US01 | — | — | — | — |\n", "")
        self.assertFails("I19")

    def test_shared_stakeholder_story_missing(self):
        self.edit("| #8 O03-US01 | — | — | #11 O03-US01 | — |\n", "| — | — | — | #11 O03-US01 | — |\n")
        self.assertFails("O03", "#8")

    # The 外籍 row of 1.3 (it has a note since #11 and #12 were added on 2026-10-24).
    FOREIGN_ROW = ("| 外籍 | I03、I04 | `[AI模擬]` I04 在 #11 需要看得懂大型廢棄物的預約方式（#11 I04-US01）。"
                   "【待補：#12 的 1.3 把這一類列為待補，請真人判斷 #12 是否需要納入外籍族群】 |\n")

    def test_focus_group_order(self):
        # Move the 外籍 row of 1.3 to the top of the table.
        self.edit(self.FOREIGN_ROW, "")
        self.edit("| 高齡 | I05、I11 | — |\n", "| 外籍 | I03、I04 | — |\n| 高齡 | I05、I11 | — |\n")
        self.assertFails("fixed order")

    # ---------- X-N groups ----------

    def test_need_group_one_stakeholder(self):
        self.edit("| #2 N09、#8 N05 | #2 I03-US01、#2 I04-US01、#8 I01-US10、#8 I03-US01、#8 I19-US01、#8 I25-US03 | I03、I04、I01、I19、I25 |",
                  "| #2 N09、#8 N05 | #2 I03-US01、#8 I03-US01 | I03 |")
        self.assertFails("X-N5")

    def test_need_group_one_issue(self):
        self.edit("| #2 N06、#8 N08、#11 N06 | #2 I01-US02、#2 I01-US08、#2 I09-US01、#2 I09-US02、#2 I09-US03、#2 I23-US01、#8 O03-US01、#8 I01-US09、#11 O05-US01、#11 O12-US01、#11 O24-US01、#11 I60-US01 | I01、I09、I23、O03、O05、O12、O24、I60 |",
                  "| #2 N06 | #2 I01-US02、#2 I01-US08、#2 I09-US01、#2 I09-US02、#2 I09-US03、#2 I23-US01 | I01、I09、I23 |")
        self.assertFails("X-N6", "2 or more issues")

    def test_need_group_stories_wrong(self):
        self.edit("| #1 N07、#2 N10、#3 N07、#4 N05、#5 N05、#6 N10、#8 O07-US01、#9 N01 | #1 O06-US01、#1 O07-US01、#1 O07-US02、",
                  "| #1 N07、#2 N10、#3 N07、#4 N05、#5 N05、#6 N10、#8 O07-US01、#9 N01 | #1 O06-US01、#1 O07-US01、")
        self.assertFails("X-N4", "故事編號")

    def test_priority_raised(self):
        self.edit("| `[AI模擬]` 各議題不同 | `[AI模擬]` #2 N06 是 Must", "| `[AI模擬]` M | `[AI模擬]` #2 N06 是 Must")
        self.assertFails("X-N6", "各議題不同")

    def test_priority_not_from_issues(self):
        self.edit("| #1 N15 S、#2 N03 S、#3 N04 S、#8 N07 S、#10 N05 S、#11 N05 S | `[AI模擬]` S |", "| #1 N15 S、#2 N03 S、#3 N04 S、#8 N07 S、#10 N05 S、#11 N05 S | `[AI模擬]` M |")
        self.assertFails("X-N3")

    def test_priority_listed_wrong(self):
        self.edit("| #1 N15 S、#2 N03 S、#3 N04 S、#8 N07 S、#10 N05 S、#11 N05 S |", "| #1 N15 M、#2 N03 S、#3 N04 S、#8 N07 S、#10 N05 S、#11 N05 S |")
        self.assertFails("#1 N15")

    def test_need_group_not_covered(self):
        # X-N12 is covered only by X-S7.
        self.edit("、#6 O57-US01、#11 N05 | X-N3、X-N12 |", "、#6 O57-US01、#11 N05 | X-N3 |")
        self.assertFails("X-N12", "not covered")

    # ---------- conflicts ----------

    def test_issue_conflict_with_cross_ref_not_listed(self):
        self.edit("| X-C2 | `[AI模擬]` 行人希望清潔箱離吸菸區遠一點；但清潔箱和吸菸區都要設在捷運站出口與商圈等人多的地方 | #2 C9 |",
                  "| X-C2 | `[AI模擬]` 行人希望清潔箱離吸菸區遠一點；但清潔箱和吸菸區都要設在捷運站出口與商圈等人多的地方 | #2 C1 |")
        self.assertFails("#2 C9")

    def test_way_out_unknown_code(self):
        self.edit("| `[AI模擬]` 解法 X-S5、X-S2：", "| `[AI模擬]` 解法 X-S5、X-S99：")
        self.assertFails("X-S99")

    def test_conflict_needs_not_a_need(self):
        self.edit("| #2 I01-US09 vs #2 N01、#2 N02、#8 I25-US01 |", "| #2 I01-US09 vs #2 I01-US01、#2 N02、#8 I25-US01 |")
        self.assertFails("#2 I01-US01")

    # ---------- combined solutions ----------

    def test_combined_solution_one_issue(self):
        self.edit("| #2 解法 S1、#2 解法 S2、#8 解法 S2 |", "| #2 解法 S1、#2 解法 S2 |")
        self.assertFails("X-S5", "2 or more issues")

    def test_combined_space_not_in_parts(self):
        self.edit("| #1 解法 S2、#2 解法 S2、#3 解法 S6、#8 解法 S4、#10 解法 S1、#11 解法 S1、#12 解法 S4 | `sidewalk-walkway`、`sidewalk-furniture`、`park`、`mrt-exit`、`indoor-home`、`indoor-business` |",
                  "| #1 解法 S2、#2 解法 S2、#3 解法 S6、#8 解法 S4、#10 解法 S1、#11 解法 S1、#12 解法 S4 | `sidewalk-walkway`、`sidewalk-furniture`、`park`、`mrt-exit`、`indoor-home`、`indoor-business`、`utility` |")
        self.assertFails("X-S3", "utility")

    # X-S5 joins #2 解法 S1 (digital-tool, planning), #2 解法 S2 (digital-tool,
    # intake) and #8 解法 S2 (facility, intake). Its 解法類型 cell is
    # `facility`、`planning`.
    X_E_TYPES = "`park` | `facility`、`planning` | 2026-10-20 |"

    def test_combined_solution_type_unknown(self):
        self.edit(self.X_E_TYPES, "`park` | `facility`、`foo` | 2026-10-20 |")
        self.assertFails("4.1 X-S5: 解法類型: unknown code foo")

    def test_combined_solution_type_not_in_parts(self):
        self.edit(self.X_E_TYPES, "`park` | `facility`、`subsidy` | 2026-10-20 |")
        self.assertFails("4.1 X-S5", "subsidy", "not a 解法類型 of its issue solutions")

    def test_combined_solution_too_many_types(self):
        self.edit(self.X_E_TYPES, "`park` | `digital-tool`、`facility`、`intake`、`planning` | 2026-10-20 |")
        self.assertFails("4.1 X-S5", "at most 3")

    def test_combined_solution_types_empty(self):
        self.edit(self.X_E_TYPES, "`park` |  | 2026-10-20 |")
        self.assertFails("4.1 X-S5: the 解法類型 cell is empty")

    def test_must_column_priority_wrong(self):
        self.edit("#9 N02、#9 N05、#12 N02 | #1 N06、", "#9 N02、#9 N05、#12 N02、#1 N06 | ")
        self.assertFails("#1 N06", "Must")

    def test_issue_9_need_not_covered_by_its_part(self):
        # #9 解法 S4 (the #9 part of X-S4) does not cover #9 N03 in #9 6.2.
        self.edit("#6 N02、#9 N02、#9 N05、#12 N02 |", "#6 N02、#9 N02、#9 N03、#9 N05、#12 N02 |")
        self.assertFails("#9 N03", "X-S4")

    def test_issue_9_need_with_one_issue_priority_changed(self):
        # X-N8 joins #2 I13-US02 (S) and #9 N02 (M), so its priority is 「各議題不同」, never M.
        self.edit("| #2 I13-US02 S、#9 N02 M | `[AI模擬]` 各議題不同 |", "| #2 I13-US02 S、#9 N02 M | `[AI模擬]` M |")
        self.assertFails("X-N8", "各議題不同")

    def test_need_not_covered_by_parts(self):
        self.edit("| `[AI模擬]` #1 N08、#1 O12-US01、", "| `[AI模擬]` #1 N03、#1 N08、#1 O12-US01、")
        self.assertFails("#1 N03", "X-S2")

    def test_measure_from_other_solution(self):
        self.edit("| 人行道範圍圖 | #1 解法 S4 |\n| X-S2 | 「SWW_WTH」", "| 人行道範圍圖 | #1 解法 S3 |\n| X-S2 | 「SWW_WTH」")
        self.assertFails("#1 解法 S3", "X-S2")

    # 4.5: one section per combined solution, with the tables of an issue's
    # step 7 (ETBlue, 2026-10-23): evaluation, 執行計畫, and the
    # 相依事項與現行政策的關係 rows that name the solution.
    def test_evaluation_section_missing(self):
        self.edit("### 4.5.5 解法 X-S5：", "### 4.5.5 解法 X-S99：")
        self.assertFails("4.5 X-S99: is not in 4.1", "4.5: X-S5 has no section 「### 4.5.n 解法 X-S5：…」")

    # The 災害風險 row of each combined solution sums up the 災害風險 rows of
    # its parts (ETBlue, 2026-10-22; method.md, step 7). It must not be empty.
    DISASTER_E = "| 災害風險 | `[AI模擬]` 負壓式吸菸區停電時無法排氣，封閉的吸菸室要考慮防火與排煙（#8 解法 S2）；颱風或豪雨前後，清潔箱可能被吹倒或泡水，需要有災害時的派工方式（#2 解法 S2） |"

    def test_disaster_row_missing(self):
        self.edit(self.DISASTER_E + "\n", "")
        self.assertFails("4.5 X-S5: the rows of the table 項目 | 內容 must be 相關法規、隱私、其他顧慮與風險、災害風險、可行性")

    def test_disaster_cell_with_only_a_tag(self):
        self.edit(self.DISASTER_E, "| 災害風險 | `[AI模擬]` |")
        self.assertFails("4.5 X-S5: the 「災害風險」 cell must start with a tag and text")

    def test_plan_row_order(self):
        # Swap the 需要的資料 and 成本 rows of X-S5.
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        start = text.index("### 4.5.5 解法 X-S5：")
        end = text.index("### 4.5.6", start)
        lines = text[start:end].split("\n")
        data = next(l for l in lines if l.startswith("| 需要的資料／API／資源 | "))
        cost = next(l for l in lines if l.startswith("| 成本 | "))
        self.edit(data + "\n" + cost + "\n", cost + "\n" + data + "\n")
        self.assertFails("4.5 X-S5: the rows of the table 執行計畫 | 內容 must be 主責單位、需要的資料／API／資源、成本, in this order")

    def test_dependency_copy_missing(self):
        # 「以各議題的解法為基礎」 names all 11 combined solutions, so it is under each.
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        start = text.index("### 4.5.5 解法 X-S5：")
        end = text.index("### 4.5.6", start)
        part = text[start:end]
        cut = part.index("\n| 相依事項與現行政策的關係 | 說明 | 相關編號 |")
        with open(self.md, "w", encoding="utf-8") as f:
            f.write(text[:start] + part[:cut] + "\n\n" + text[end:])
        self.assertFails("4.5 X-S5: 相依事項與現行政策的關係 「以各議題的解法為基礎」 names 解法 X-S5, so it must be in the "
                         "相依事項與現行政策的關係 table of X-S5 too")

    def test_dependency_row_must_name_its_solution(self):
        self.edit("| 現行的吸菸區設置要點 | `[AI模擬]` 解法 X-S2 的檢查清單，以 #8 的「臺北市吸菸區設置及管理要點」（115 年 10 月 1 日生效）的距離與淨寬規定為起點之一。 | #8 O22-US02、解法 X-S2 |",
                  "| 現行的吸菸區設置要點 | `[AI模擬]` 解法 X-S2 的檢查清單，以 #8 的「臺北市吸菸區設置及管理要點」（115 年 10 月 1 日生效）的距離與淨寬規定為起點之一。 | #8 O22-US02 |")
        self.assertFails("4.5 X-S2 相依事項與現行政策的關係 「現行的吸菸區設置要點」: 相關編號 must name 解法 X-S2")

    def test_summary_dependency_row_with_a_solution_fails(self):
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        head = "### 相依事項與現行政策的關係\n"
        i = text.index(head) + len(head)
        row = "\n| 項目 | 說明 | 相關編號 |\n|---|---|---|\n| 測試 | `[AI模擬]` 測試 | 解法 X-S1 |\n"
        with open(self.md, "w", encoding="utf-8") as f:
            f.write(text[:i] + row + text[i:])
        self.assertFails("分析摘要 相依事項與現行政策的關係 「測試」: names 解法 X-S1; move the row")

if __name__ == "__main__":
    unittest.main()
