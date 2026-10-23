"""Tests for analysis/scripts/check_analysis.py.

Each test copies every issue folder that has an issue-analysis.md, the cross-issue folder and the shared files, into
a temp dir, changes one thing, runs the check as a subprocess, and looks at the exit code and output.
Before the check, run_check runs update_dates.py on the copy, so a test that changes content does not fail only
because the 更新日期 file is old. The tests of the 更新日期 check pass dates=False.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import os, re, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "scripts", "check_analysis.py")
UPDATE = os.path.join(ANALYSIS, "scripts", "update_dates.py")
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv", "docs/method.md",
          "data/open-data.csv", "data/updated-dates.csv", "docs/human-inputs.md")
ISSUE = "2-trashcans"
# No issue uses the old format now. This copy of #8 (from before commit 37057a9) tests it.
OLD_FORMAT = os.path.join(ANALYSIS, "tests", "fixtures", "old-format")


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
            os.makedirs(os.path.join(self.dir, os.path.dirname(name)), exist_ok=True)
            shutil.copy(os.path.join(ANALYSIS, name), os.path.join(self.dir, name))
        for folder in issue_folders() + ["cross-issue"]:
            shutil.copytree(os.path.join(ANALYSIS, folder), os.path.join(self.dir, folder))
        self.md = os.path.join(self.dir, ISSUE, "issue-analysis.md")
        self.csv = os.path.join(self.dir, ISSUE, "user-stories.csv")

    def tearDown(self):
        self._tmp.cleanup()

    def no_cross_issue(self):
        """Remove the copied cross-issue folder. A test that changes an issue in a
        way the cross-issue file does not match uses it, so only the issue check
        runs. update_dates.py then drops the cross-issue rows."""
        shutil.rmtree(os.path.join(self.dir, "cross-issue"))

    def edit(self, rel, old, new):
        """Replace one exact piece of text in a copied file."""
        path = os.path.join(self.dir, rel)
        enc = "utf-8-sig" if path.endswith(".csv") else "utf-8"
        with open(path, encoding=enc) as f:
            text = f.read()
        self.assertEqual(text.count(old), 1, f"{old!r} must occur once in {rel}")
        with open(path, "w", encoding=enc, newline="") as f:
            f.write(text.replace(old, new))

    def run_check(self, folder=None, dates=True):
        if dates:
            # The result does not matter here: a broken file stops update_dates.py,
            # and the check then reports the problem.
            subprocess.run([sys.executable, "-I", UPDATE, self.dir], capture_output=True, text=True)
        md, csv_ = self.md, self.csv
        if folder:
            md = os.path.join(self.dir, folder, "issue-analysis.md")
            csv_ = os.path.join(self.dir, folder, "user-stories.csv")
        p = subprocess.run([sys.executable, "-I", SCRIPT, md, csv_],
                           capture_output=True, text=True)
        return p.returncode, p.stdout + p.stderr

    def assertFails(self, *needles, folder=None, dates=True):
        code, out = self.run_check(folder, dates)
        self.assertEqual(code, 1, out)
        for n in needles:
            self.assertIn(n, out)

    def test_issue_2_passes(self):
        code, out = self.run_check()
        self.assertEqual(code, 0, out)
        self.assertIn("PASS", out)

    def test_step1_name_differs_from_stakeholders_csv(self):
        self.edit("data/stakeholders.csv", "I05,高齡者,", "I05,年長者,")
        self.assertFails("I05", "年長者")

    def test_path_prefix_without_label(self):
        self.edit("data/path-labels.csv", "gov-local-taipei-epb,環保局\n", "")
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
        self.edit("data/stakeholders.csv", "I05,高齡者,res,高齡,1 2 3 4 5 6 8 9,", "I05,高齡者,res,高齡,2,")
        self.assertFails("I05", "議題")

    def test_moved_id_must_have_empty_issue_value(self):
        self.edit("data/stakeholders.csv", "O02,便利商店店員,,,,已改為 I12", "O02,便利商店店員,,,2,已改為 I12")
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
        self.assertFails("3.8: I11 分類路徑 res")

    def test_new_stakeholder_section_found_by_name(self):
        # The section is 「### 3.n 新增的利害關係人」 for any n. A wrong row
        # under another number is still found.
        self.edit(f"{ISSUE}/issue-analysis.md", "### 3.8 新增的利害關係人", "### 3.9 新增的利害關係人")
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "| I11 | `[AI模擬]` 資源回收個體業者（含高齡回收者） | `wrk` |",
                  "| I11 | `[AI模擬]` 資源回收個體業者（含高齡回收者） | `res` |")
        self.assertFails("3.9: I11 分類路徑 res")

    def test_new_stakeholder_section_missing_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "### 3.8 新增的利害關係人", "### 3.8 其他")
        self.assertFails("新增的利害關係人")

    def make_no_space(self):
        """Turn the copied #2 into an issue with no city space: the line
        「空間類型：無」 and 「—」 in every 6.1 空間類型 cell."""
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        text = text.replace("空間類型：`sidewalk`、`arcade`、`park`、`mrt-exit`\n", "空間類型：無\n", 1)
        sec = text.split("### 6.1", 1)[1].split("### 6.2", 1)[0]
        new_sec = re.sub(r"^(\| [A-Z] \| [^|]+ \| )`[^|]+` \|", r"\1— |", sec, flags=re.M)
        self.assertEqual(new_sec.count("| — |"), 5)
        with open(self.md, "w", encoding="utf-8") as f:
            f.write(text.replace(sec, new_sec))

    def test_no_space_issue_passes(self):
        # An issue with no city space (ETBlue, 2026-10-20).
        self.make_no_space()
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_no_space_issue_with_solution_space_fails(self):
        self.make_no_space()
        self.edit(f"{ISSUE}/issue-analysis.md", "| D | `[AI模擬]` 參與式選址流程 | — |",
                  "| D | `[AI模擬]` 參與式選址流程 | `park` |")
        self.assertFails("solution D", "無")

    def test_dash_solution_space_in_issue_with_spaces_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` |",
                  "| D | `[AI模擬]` 參與式選址流程 | — |")
        self.assertFails("solution D", "無")

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
                  "| 代號 | 解法 | 涵蓋的 Must 需求 | 涵蓋的 Should / Could 需求 |\n|---|---|---|---|",
                  "| 解法 | 涵蓋的 Must 需求 | 涵蓋的 Should / Could 需求 |\n|---|---|---|")
        self.assertFails("6.2: expected one table with the header")

    def test_6_2_any_capital_letter_code(self):
        # A code like E or K is fine when 6.1 has it too.
        self.no_cross_issue()
        md = f"{ISSUE}/issue-analysis.md"
        self.edit(md, "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`", "| K | `[AI模擬]` 參與式選址流程 | `sidewalk`")
        self.edit(md, "| D | 參與式選址流程 |", "| K | 參與式選址流程 |")
        self.edit(md, "### 7.4 解法 D：", "### 7.4 解法 K：")
        self.edit(md, "| D | `[AI模擬]` 參與式選址流程 | 中 |", "| K | `[AI模擬]` 參與式選址流程 | 中 |")
        self.edit(md, "| A、D | 家用垃圾", "| A、K | 家用垃圾")
        self.edit(md, "| D | 新設點中", "| K | 新設點中")
        self.edit(md, "| D | 設置後 3 個月", "| K | 設置後 3 個月")
        # Every other 「解法 D」, also in a list such as 「解法 A、B、D：」.
        path = os.path.join(self.dir, md)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        with open(path, "w", encoding="utf-8") as f:
            f.write(re.sub(r"(解法 (?:[A-Z]、)*)D(?![A-Za-z])", r"\1K", text))
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
        self.edit(f"{ISSUE}/issue-analysis.md", "(../docs/method.md#步驟-5依需求排序)", "(../docs/method.md#沒有這一節)")
        self.assertFails("broken method link ../docs/method.md#沒有這一節")

    def test_pending_in_backticks_is_allowed(self):
        # The step 4 summary names the format in backticks: 「`【待補】` 1 則」.
        code, out = self.run_check()
        self.assertEqual(code, 0, out)
        with open(self.md, encoding="utf-8") as f:
            self.assertIn("`【待補】` 1 則", f.read())

    def test_change_log_new_id_must_exist(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| O02-US01 | I12-US01 |", "| O02-US01 | I12-US09 |")
        self.assertFails("I12-US09")

    # A deleted ID has 「—」 as its new ID. The old ID must still be gone from step 1 or step 4.
    DELETED_ROW = "| O02-US02 | — | 2026-10-21 | 刪除。 |\n"

    def add_change_log_row(self, row):
        self.edit(f"{ISSUE}/issue-analysis.md", "| O03-US03 | I13-US02 |", f"{row}| O03-US03 | I13-US02 |")

    def test_change_log_deleted_story_passes(self):
        self.add_change_log_row(self.DELETED_ROW)
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_change_log_deleted_stakeholder_passes(self):
        self.add_change_log_row("| I99 | — | 2026-10-21 | 刪除。 |\n")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_change_log_deleted_story_still_in_step_4_fails(self):
        self.add_change_log_row("| I12-US01 | — | 2026-10-21 | 刪除。 |\n")
        self.assertFails("old ID I12-US01 is still in step 4")

    def test_id_in_change_log_only_is_allowed_but_not_elsewhere(self):
        # O02 is in the 編號異動紀錄 section only. Using it elsewhere must fail.
        self.edit(f"{ISSUE}/issue-analysis.md",
                  "| 商圈發展協會、便利商店門市 | `[AI模擬]` O01、I12 |",
                  "| 商圈發展協會、便利商店門市 | `[AI模擬]` O01、O02 |")
        self.assertFails("O02")

    # 16d. the 6.1 practice tables (ETBlue, 2026-10-22).
    PRACTICE = "| 美國紐約：新設計的清潔箱（Better Bin） |"
    PRACTICE_USE = "| `[AI模擬]` 解法 B 在被丟家用垃圾的點"

    def test_practice_without_place_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.PRACTICE, "| 新設計的清潔箱（Better Bin） |")
        self.assertFails("6.1 practice 「新設計的清潔箱（Better Bin）」", "做法 must start with its place")

    def test_practice_place_with_tai_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.PRACTICE, "| 台灣台北市：新設計的清潔箱（Better Bin） |")
        self.assertFails("write the place with 臺")

    def test_practice_unknown_solution_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.PRACTICE_USE, "| `[AI模擬]` 解法 Z 在被丟家用垃圾的點")
        self.assertFails("names 解法 Z, which is not in 6.1")

    def test_practice_step7_section_of_no_solution_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "（N04、7.2）", "（N04、7.6）")
        self.assertFails("names 7.6, which is not the step 7 section of a solution")

    def test_practice_without_solution_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.PRACTICE_USE, "| `[AI模擬]` 在被丟家用垃圾的點")
        self.assertFails("6.1 practice 「美國紐約：新設計的清潔箱（Better Bin）」", "must name at least one solution")

    def test_practice_solution_of_other_issue_does_not_count(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.PRACTICE_USE, "| `[AI模擬]` #8 解法 B 在被丟家用垃圾的點")
        self.assertFails("must name at least one solution")

    def test_practice_step7_section_passes(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.PRACTICE_USE, "| `[AI模擬]` 7.2 在被丟家用垃圾的點")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    # Cross-issue references: 「#2 O01-US01」 written in another issue file.
    # The C4 模擬結果 cell of #1 is free text, so the tests add references there.
    C4_RESULT = "（O01-US02），可以從這點開始談"

    def add_to_issue_1(self, ref):
        self.edit("1-trees/issue-analysis.md", self.C4_RESULT, f"（O01-US02），可以從這點開始談（{ref}）")

    def test_issue_1_passes(self):
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 0, out)

    def test_cross_issue_story_reference_passes(self):
        self.no_cross_issue()
        self.add_to_issue_1("見 #2 O01-US01")
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 0, out)

    def test_cross_issue_stakeholder_reference_passes(self):
        self.no_cross_issue()
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
        self.add_to_issue_1("見 #99 O01-US01")
        self.assertFails("#99 O01-US01", "issues.csv", folder="1-trees")

    def test_cross_issue_reference_to_own_issue(self):
        self.add_to_issue_1("見 #1 O01-US01")
        self.assertFails("#1 O01-US01", "local ID", folder="1-trees")

    def test_cross_issue_reference_in_conflict_stories_cell(self):
        self.edit("1-trees/issue-analysis.md", "`[AI模擬]` O01-US01 vs I01-US01、I16-US01",
                  "`[AI模擬]` O01-US01、#2 O01-US01 vs I01-US01、I16-US01")
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 1, out)
        # One error, in 6.4 (the needs-based format).
        self.assertEqual(out.count("6.4 C4: #2 O01-US01 refers to another issue"), 1, out)
        self.assertNotIn("5.4", out)

    def test_cross_issue_reference_in_old_format_conflict(self):
        # In the old format (the fixture in place of #8), the conflicts are in 5.4.
        path = os.path.join(self.dir, "8-smokefree", "issue-analysis.md")
        shutil.copy(os.path.join(OLD_FORMAT, "user-stories.csv"), os.path.join(self.dir, "8-smokefree", "user-stories.csv"))
        with open(os.path.join(OLD_FORMAT, "issue-analysis.md"), encoding="utf-8") as f:
            text = f.read()
        m = re.search(r"^\| C1 \| .*? \| `\[AI模擬\]` ([OI]\d\d-US\d\d)", text, re.M)
        self.assertIsNotNone(m)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text[:m.start(1)] + "#1 I06-US02、" + text[m.start(1):])
        self.assertFails("5.4 C1: #1 I06-US02 refers to another issue", folder="8-smokefree")

    def test_cross_issue_reference_in_6_2_cell(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| D | 參與式選址流程 | `[AI模擬]` N04",
                  "| D | 參與式選址流程 | `[AI模擬]` #1 O01-US01、N04")
        self.assertFails("6.2", "#1 O01-US01")


    # The third source tag, [AI整理] (owner decision 2026-10-18): AI summarized it
    # from real data, with counts. It is accepted wherever [實證] and [AI模擬] are.
    ROW_MD = ("| O01-US01 | 商圈店家與攤商 | `[AI模擬]` 商圈有足夠的清潔箱 | — | "
              "`[AI模擬]` 店門口與花台保持乾淨，不必替客人收拾垃圾 | N02 | 可詢問商圈發展協會；市民留言約 118 則提到同樣訴求"
              "（「市長，你給我聽好了」資料，關鍵字估算） | `[AI模擬]` S |")
    ROW_CSV = ("商圈有足夠的清潔箱,[AI模擬],—,店門口與花台保持乾淨，不必替客人收拾垃圾,[AI模擬],N02,可詢問商圈發展協會；"
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
        self.edit(md, "| `[AI模擬]` N10 |", "| `[AI整理]` N10 |")
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

    # News content is [AI整理] (owner decision 2026-10-18). An [AI整理] cell that
    # mentions 新聞 must have a 【待補：查證…】 item in the same row (or line).
    NEWS_ROW = "需真人查證【待補：查證 Nature Ways 的官方數字】（來源：Mothership，2020）"

    def test_news_cell_with_verify_item_passes(self):
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 0, out)
        with open(os.path.join(self.dir, "1-trees", "issue-analysis.md"), encoding="utf-8") as f:
            self.assertIn("| 新加坡：Nature Ways | `[AI整理]` 新聞報導指出", f.read())

    def test_news_cell_without_verify_item_fails(self):
        self.edit("1-trees/issue-analysis.md", self.NEWS_ROW, "需真人查證（來源：Mothership，2020）")
        self.assertFails("[AI整理]", "新聞", "【待補：查證…】", folder="1-trees")

    def test_news_paragraph_without_verify_item_fails(self):
        self.edit("1-trees/issue-analysis.md", self.NEWS_ROW, "需真人查證（來源：Mothership，2020）")
        self.edit("1-trees/issue-analysis.md", "| 新加坡：Nature Ways | `[AI整理]` 新聞報導指出",
                  "| 新加坡：Nature Ways | `[AI模擬]` 新聞報導指出")
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 0, out)
        self.edit("1-trees/issue-analysis.md", "\n## 步驟 2", "\n`[AI整理]` 新聞報導指出某件事。\n\n## 步驟 2")
        self.assertFails("[AI整理]", "新聞", folder="1-trees")

    def test_citizen_data_ai_summary_needs_no_verify_item(self):
        # [AI整理] cells from the citizen data do not mention 新聞, so no 查證 item is needed.
        code, out = self.run_check()
        self.assertEqual(code, 0, out)


    # 新增日期 (owner decision 2026-10-18): stakeholders.csv and each 6.1 table
    # have a date column for the app's "recent" lists. YYYY-MM-DD, not in the future.
    SOL_D = "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` | 2026-10-16 |"

    def test_stakeholders_csv_has_date_column(self):
        with open(os.path.join(self.dir, "data", "stakeholders.csv"), encoding="utf-8-sig") as f:
            header = f.readline().strip().split(",")
        self.assertEqual(header[-2:], ["備註", "新增日期"])

    def test_stakeholders_csv_without_date_column_fails(self):
        path = os.path.join(self.dir, "data", "stakeholders.csv")
        with open(path, encoding="utf-8-sig") as f:
            lines = f.read().splitlines()
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            f.write("".join(l.rsplit(",", 1)[0] + "\n" for l in lines))
        self.assertFails("stakeholders.csv", "新增日期")

    def test_stakeholders_csv_bad_date_fails(self):
        for wrong in ("2026/10/18", "", "2026-13-01"):
            with self.subTest(wrong=wrong):
                self.tearDown(); self.setUp()
                self.edit("data/stakeholders.csv", "I05,高齡者,res,高齡,1 2 3 4 5 6 8 9,,2026-10-18", f"I05,高齡者,res,高齡,1 2 3 4 5 6 8 9,,{wrong}")
                self.assertFails("stakeholders.csv: I05 新增日期")

    def test_stakeholders_csv_future_date_fails(self):
        self.edit("data/stakeholders.csv", "I05,高齡者,res,高齡,1 2 3 4 5 6 8 9,,2026-10-18", "I05,高齡者,res,高齡,1 2 3 4 5 6 8 9,,2999-01-01")
        self.assertFails("stakeholders.csv: I05 新增日期 2999-01-01", "future")

    def test_solution_date_passes(self):
        with open(self.md, encoding="utf-8") as f:
            self.assertIn(self.SOL_D, f.read())
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_solution_without_date_column_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| 代號 | 解法 | 空間類型 | 新增日期 | 一句話說明 |\n|---|---|---|---|---|",
                  "| 代號 | 解法 | 空間類型 | 一句話說明 |\n|---|---|---|---|")
        self.assertFails("6.1: no 新增日期 column")

    def test_solution_bad_date_fails(self):
        for wrong in ("2026-10", "—", "2026-02-30"):
            with self.subTest(wrong=wrong):
                self.tearDown(); self.setUp()
                self.edit(f"{ISSUE}/issue-analysis.md", self.SOL_D, self.SOL_D.replace("2026-10-16", wrong))
                self.assertFails("6.1 solution D: 新增日期")

    def test_solution_future_date_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.SOL_D, self.SOL_D.replace("2026-10-16", "2999-01-01"))
        self.assertFails("6.1 solution D: 新增日期 2999-01-01", "future")


    # Each solution in 6.1 has its own step 7 section and a 總覽 row, so its
    # page in the app has content. A solution code is never reused.
    def test_solution_without_step_7_section_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "### 7.4 解法 D：參與式選址流程", "### 7.4 參與式選址流程")
        self.assertFails("步驟 7: solution D from 6.1 has no section 「### 7.n 解法 D：…」")

    def test_step_7_section_for_unknown_solution_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "### 7.4 解法 D：參與式選址流程", "### 7.4 解法 F：參與式選址流程")
        self.assertFails("步驟 7: 「### 7.4 解法 F：參與式選址流程」: solution F is not in 6.1")

    # Each step 7 solution table has a 「災害風險」 row (ETBlue, 2026-10-22).
    # The cell is a tag and a list of disasters, or a tag and exactly
    # 「無明顯相關災害風險」. The check does not look at which disasters are listed.
    DISASTER_D = "需事先說明決策方式 |\n| 災害風險 | `[AI模擬]` 無明顯相關災害風險 |\n"

    def set_disaster_d(self, row):
        """Replace the 災害風險 row of #2 解法 D with `row` (a full line, or "" to remove it)."""
        self.edit(f"{ISSUE}/issue-analysis.md", self.DISASTER_D, "需事先說明決策方式 |\n" + row)

    def test_every_issue_passes_with_disaster_rows(self):
        for folder in issue_folders():
            with self.subTest(folder=folder):
                code, out = self.run_check(folder)
                self.assertEqual(code, 0, out)

    def test_step_7_without_disaster_row_fails(self):
        self.set_disaster_d("")
        self.assertFails("步驟 7 #2 解法 D: no 「災害風險」 row")

    def test_step_7_empty_disaster_cell_fails(self):
        for row in ("| 災害風險 |  |\n", "| 災害風險 | `[AI模擬]` |\n"):
            with self.subTest(row=row):
                self.tearDown(); self.setUp()
                self.set_disaster_d(row)
                self.assertFails("步驟 7 #2 解法 D: the 「災害風險」 cell is empty")

    def test_step_7_disaster_cell_without_tag_fails(self):
        self.set_disaster_d("| 災害風險 | 無明顯相關災害風險 |\n")
        self.assertFails("步驟 7 #2 解法 D: the 「災害風險」 cell must start with a tag")

    def test_step_7_no_disaster_text_must_stand_alone(self):
        self.set_disaster_d("| 災害風險 | `[AI模擬]` 無明顯相關災害風險，但颱風時要注意 |\n")
        self.assertFails("步驟 7 #2 解法 D: write 「無明顯相關災害風險」 alone")

    def test_step_7_disaster_list_passes(self):
        self.set_disaster_d("| 災害風險 | `[AI模擬]` 風災：颱風時工作坊可能取消【待補：查證】 |\n")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    # Each step 7 solution section has an evaluation table and a plan table
    # (ETBlue, 2026-10-23), each with all its rows, once each, in this order.
    # Each cell starts with a tag and has text after it, or is one 【待補：…】 item.
    STEP7_ROWS = ["相關法規", "隱私", "其他顧慮與風險", "災害風險", "可行性"]
    PLAN_ROWS = ["主責單位", "需要的資料／API／資源", "成本", "執行步驟"]

    def row_d(self, name):
        """The full line (with the newline) of the row `name` in the step 7 table of #2 解法 D."""
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        start = text.index("### 7.4 解法 D：")
        end = text.index("\n### ", start)
        line = next(l for l in text[start:end].split("\n") if l.startswith(f"| {name} |"))
        return line + "\n"

    def test_step_7_without_row_fails(self):
        for name in self.STEP7_ROWS + self.PLAN_ROWS:
            if name == "災害風險": continue  # tested above
            with self.subTest(row=name):
                self.tearDown(); self.setUp()
                self.edit_in_section("D", self.row_d(name), "")
                self.assertFails(f"步驟 7 #2 解法 D: no 「{name}」 row")

    def test_step_7_two_rows_fail(self):
        line = self.row_d("相關法規")
        self.edit(f"{ISSUE}/issue-analysis.md", line, line + line)
        self.assertFails("步驟 7 #2 解法 D: two 「相關法規」 rows")

    def test_step_7_empty_cell_fails(self):
        for row in ("| 隱私 |  |\n", "| 隱私 | `[AI模擬]` |\n"):
            with self.subTest(row=row):
                self.tearDown(); self.setUp()
                self.edit_in_section("D", self.row_d("隱私"), row)
                self.assertFails("步驟 7 #2 解法 D: the 「隱私」 cell is empty")

    def test_step_7_cell_without_tag_fails(self):
        line = self.row_d("主責單位")
        self.edit(f"{ISSUE}/issue-analysis.md", line, line.replace("`[AI模擬]` ", ""))
        self.assertFails("步驟 7 #2 解法 D: the 「主責單位」 cell must start with a tag")

    def test_step_7_unknown_row_fails(self):
        line = self.row_d("隱私")
        self.edit(f"{ISSUE}/issue-analysis.md", line, line + "| 備註 | `[AI模擬]` 其他說明 |\n")
        self.assertFails("步驟 7 #2 解法 D: unknown row 「備註」")

    def test_step_7_wrong_order_fails(self):
        a, b = self.row_d("隱私"), self.row_d("其他顧慮與風險")
        self.edit_in_section("D", a + b, b + a)
        self.assertFails("步驟 7 #2 解法 D: the rows of the evaluation table must be in this order: " + "、".join(self.STEP7_ROWS))

    def test_step_7_plan_wrong_order_fails(self):
        a, b = self.row_d("成本"), self.row_d("執行步驟")
        self.edit_in_section("D", a + b, b + a)
        self.assertFails("步驟 7 #2 解法 D: the rows of the 執行計畫 table must be in this order: " + "、".join(self.PLAN_ROWS))

    def test_step_7_row_in_the_wrong_table_fails(self):
        # 主責單位 belongs to the plan table, not the evaluation table.
        owner, feas = self.row_d("主責單位"), self.row_d("可行性")
        self.edit_in_section("D", owner, "")
        self.edit_in_section("D", feas, feas + owner)
        self.assertFails("步驟 7 #2 解法 D: unknown row 「主責單位」 in the evaluation table", "步驟 7 #2 解法 D: no 「主責單位」 row")

    def test_step_7_without_plan_table_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| 執行計畫 | 內容 |\n|---|---|\n| 主責單位 | `[AI模擬]` 環保局；協作：民政局",
                  "| 項目 | 內容 |\n|---|---|\n| 主責單位 | `[AI模擬]` 環保局；協作：民政局")
        self.assertFails("步驟 7 #2 解法 D: no table with the header 執行計畫 | 內容", "步驟 7 #2 解法 D: two tables with the header 項目 | 內容")

    def test_step_7_unknown_table_fails(self):
        self.edit_in_section("D", self.row_d("執行步驟"),
                  self.row_d("執行步驟") + "\n| 備註 | 內容 |\n|---|---|\n| 其他 | `[AI模擬]` 說明 |\n")
        self.assertFails("步驟 7 #2 解法 D: unknown table 「備註 | 內容」")

    def test_step_7_steps_placeholder_passes(self):
        # A solution with no plan yet has 「【待補：執行步驟】」. A cell may also be
        # one other 【待補：…】 item, or tagged text.
        self.edit_in_section("D", self.row_d("執行步驟"), "| 執行步驟 | 【待補：執行步驟】 |\n")
        self.edit_in_section("D", self.row_d("成本"), "| 成本 | 【待補：單價】 |\n")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_step_7_steps_with_text_passes(self):
        self.edit_in_section("D", self.row_d("執行步驟"), "| 執行步驟 | `[AI模擬]` 先在 2 個里試辦，再擴大 |\n")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_step_7_cell_with_text_beside_pending_needs_a_tag(self):
        self.edit_in_section("D", self.row_d("執行步驟"), "| 執行步驟 | 先試辦【待補：時程】 |\n")
        self.assertFails("步驟 7 #2 解法 D: the 「執行步驟」 cell must start with a tag")

    # The 相依事項與現行政策的關係 table of a step 7 section (ETBlue,
    # 2026-10-23). In #2, 「現行的裁撤與復設做法」 names 解法 A and D, so it is
    # under both, with the same text.
    DEP_ROW = ("| 現行的裁撤與復設做法 | `[AI模擬]` 現行做法是依家戶垃圾違規棄置量評估清潔箱的裁撤或復設（題目原文）。"
               "解法 A、D 在這個做法上加入行人流量與里民討論，需要和環保局確認兩者怎麼銜接。 | O04-US04、解法 A、解法 D |\n")

    def dep_section(self, code):
        """(start, end) of the step 7 section of #2 解法 <code> in the copied file."""
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        start = text.index(f" 解法 {code}：", text.index("## 步驟 7"))
        return text, start, text.index("\n### ", start)

    def edit_in_section(self, code, old, new):
        text, start, end = self.dep_section(code)
        part = text[start:end]
        self.assertEqual(part.count(old), 1)
        with open(self.md, "w", encoding="utf-8") as f:
            f.write(text[:start] + part.replace(old, new) + text[end:])

    def test_step_7_dependency_rows_pass(self):
        text, start, end = self.dep_section("D")
        self.assertIn("| 相依事項與現行政策的關係 | 說明 | 相關編號 |\n|---|---|---|\n" + self.DEP_ROW, text[start:end])
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_step_7_dependency_row_must_name_its_solution(self):
        # Under 解法 D, a row whose 相關編號 does not name D.
        self.edit_in_section("D", self.DEP_ROW, self.DEP_ROW.replace("| O04-US04、解法 A、解法 D |", "| O04-US04、解法 A |"))
        self.assertFails("步驟 7 #2 解法 D 相依事項與現行政策的關係 「現行的裁撤與復設做法」: 相關編號 must name 解法 D")

    def test_step_7_dependency_row_missing_under_a_named_solution(self):
        # The row names 解法 D, but it is only under 解法 A.
        self.edit_in_section("D", "\n| 相依事項與現行政策的關係 | 說明 | 相關編號 |\n|---|---|---|\n" + self.DEP_ROW, "")
        self.assertFails("步驟 7 #2 解法 D: 相依事項與現行政策的關係 「現行的裁撤與復設做法」 names 解法 D, so it must be in the "
                         "相依事項與現行政策的關係 table of 解法 D too")

    def test_step_7_dependency_copies_must_be_the_same(self):
        self.edit_in_section("D", "需要和環保局確認兩者怎麼銜接。", "需要和環保局確認。")
        self.assertFails("the copies of 相依事項與現行政策的關係 「現行的裁撤與復設做法」 under 解法 A、解法 D are not the same")

    def test_step_7_dependency_bad_reference_fails(self):
        for old, new, needle in (("O04-US04、解法 A、解法 D", "O04-US99、解法 A、解法 D", "O04-US99 is not in"),
                                 ("O04-US04、解法 A、解法 D", "見 7.1、解法 A、解法 D", "「見 7.1」 is not a reference")):
            with self.subTest(new=new):
                self.tearDown(); self.setUp()
                # Change both copies, so they stay the same.
                self.edit_in_section("A", old, new)
                self.edit_in_section("D", old, new)
                self.assertFails(f"相依事項與現行政策的關係 「現行的裁撤與復設做法」: {needle}")

    def test_step_7_dependency_cell_has_one_tag(self):
        self.edit_in_section("A", "（題目原文）。", "（題目原文）。 `[實證]` 官方")
        self.edit_in_section("D", "（題目原文）。", "（題目原文）。 `[實證]` 官方")
        self.assertFails("a cell has 2 tags")

    def test_summary_dependency_row_with_a_solution_fails(self):
        # The 分析摘要 keeps only the rows that name no solution of this issue.
        self.edit(f"{ISSUE}/issue-analysis.md", "| C9、I01-US09、#8 解法 B |", "| C9、I01-US09、#8 解法 B、解法 A |")
        self.assertFails("分析摘要 相依事項與現行政策的關係 「和 #8 無菸城市」: names 解法 A; move the row")

    def test_summary_dependency_topic_without_table_passes(self):
        # #1: every row names a solution, so the topic has only a sentence.
        with open(os.path.join(self.dir, "1-trees", "issue-analysis.md"), encoding="utf-8") as f:
            text = f.read()
        body = text.split("### 相依事項與現行政策的關係", 1)[1].split("\n## ", 1)[0]
        self.assertNotIn("| 項目 |", body)
        code, out = self.run_check("1-trees")
        self.assertEqual(code, 0, out)

    # A step 7 cell may hold more than one tag (ETBlue, 2026-10-22). Each part
    # starts with its own tag and has text after it. Other cells keep one tag.
    def test_step_7_mixed_cell_passes(self):
        self.edit_in_section("D", self.row_d("相關法規"),
                  "| 相關法規 | `[實證]` 官方資料寫的規定 `[AI整理]` 新聞報導指出的做法，需真人查證【待補：查證新聞】 `[AI模擬]` 推想 |\n")
        self.set_disaster_d("| 災害風險 | `[AI模擬]` 風災：颱風時工作坊可能取消。 `[實證]` 官方資料的停班規定 |\n")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_step_7_mixed_cell_with_empty_tag_fails(self):
        for value in ("`[實證]` 官方資料 `[AI模擬]`", "`[實證]` `[AI模擬]` 推想"):
            with self.subTest(value=value):
                self.tearDown(); self.setUp()
                self.edit_in_section("D", self.row_d("隱私"), f"| 隱私 | {value} |\n")
                self.assertFails("步驟 7 #2 解法 D: the 「隱私」 cell has a tag with no text after it")

    def test_step_7_cell_with_only_tags_is_empty(self):
        self.edit_in_section("D", self.row_d("隱私"), "| 隱私 | `[實證]` `[AI模擬]` |\n")
        self.assertFails("步驟 7 #2 解法 D: the 「隱私」 cell is empty")

    def test_step_7_mixed_cell_must_start_with_tag(self):
        self.edit_in_section("D", self.row_d("隱私"), "| 隱私 | 說明 `[實證]` 官方資料 `[AI模擬]` 推想 |\n")
        self.assertFails("步驟 7 #2 解法 D: the 「隱私」 cell must start with a tag")

    def test_step_7_no_disaster_text_must_stand_alone_in_mixed_cell(self):
        self.set_disaster_d("| 災害風險 | `[AI模擬]` 無明顯相關災害風險 `[實證]` 官方資料 |\n")
        self.assertFails("步驟 7 #2 解法 D: write 「無明顯相關災害風險」 alone")

    def test_two_tags_outside_step_7_fail(self):
        # A cell outside the step 7 solution tables keeps one tag: here a 6.1 row.
        self.edit(f"{ISSUE}/issue-analysis.md", "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`",
                  "| D | `[AI模擬]` 參與式選址流程 `[實證]` 官方 | `sidewalk`")
        self.assertFails("a cell has 2 tags; only the cells of the step 7 solution tables may have more than one")

    def test_step_7_every_issue_has_all_rows(self):
        # The current data of every issue passes the row check.
        for folder in issue_folders():
            with self.subTest(folder=folder):
                code, out = self.run_check(folder)
                self.assertEqual(code, 0, out)
                self.assertNotIn("步驟 7 #", out)

    def test_solution_without_overview_row_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.OVERVIEW_D + "\n", "")
        self.assertFails("總覽: solution D from 6.1 has no row")

    # The 總覽 table: 代號 (the code only), then 解法 (the row tag and a short name).
    OVERVIEW_D = "| D | `[AI模擬]` 參與式選址流程 | 中 | 中 | 流程變慢、代表性不足 | 環保局、民政局 |"

    def test_overview_old_format_fails(self):
        # The old table put the tag, the code and the name in one first cell.
        with open(self.md, encoding="utf-8") as f:
            text = f.read()
        start = text.index("| 代號 | 解法 | 成本 |")
        end = text.index("\n\n", start)
        old = "\n".join(re.sub(r"^\| ([A-Z]) \| (`[^`]+`) ", r"| \2 \1 ", l) for l in text[start:end].split("\n")[2:])
        self.edit(f"{ISSUE}/issue-analysis.md", text[start:end],
                  "| 解法 | 成本 | 可行性 | 主要風險 | 主責單位 |\n|---|---|---|---|---|\n" + old)
        self.assertFails("總覽: expected one table with the header 代號 | 解法 | 成本 | 可行性 | 主要風險 | 主責單位")

    def test_overview_code_with_tag_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.OVERVIEW_D, self.OVERVIEW_D.replace("| D | `[AI模擬]` ", "| `[AI模擬]` D | "))
        self.assertFails("總覽: 代號 must be one capital letter")

    def test_overview_name_without_tag_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.OVERVIEW_D, self.OVERVIEW_D.replace("`[AI模擬]` ", ""))
        self.assertFails("總覽 row D: the 解法 cell must start with the row tag")

    def test_overview_two_rows_fail(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.OVERVIEW_D, self.OVERVIEW_D + "\n" + self.OVERVIEW_D)
        self.assertFails("總覽: solution D has two rows")

    # A 6.3 cell must stand alone on the solution page: no 「見下表」 or 「見上表」.
    MEASURE_ROW = "| C | 開放資料的資料時間涵蓋終點 | `[實證]` 2018-01-10 |"

    # A 6.3 解法 cell lists codes separated by 「、」, the same as other lists.
    MEASURE_AD = "| A、D | 家用垃圾違規棄置件數（試點區） |"

    def test_measure_codes_with_comma_fail(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.MEASURE_AD, "| A, D | 家用垃圾違規棄置件數（試點區） |")
        self.assertFails("6.3 row 「家用垃圾違規棄置件數（試點區）」: 解法 cell 「A, D」: separate codes with 「、」")

    def test_measure_code_not_in_6_1_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.MEASURE_AD, "| A、F | 家用垃圾違規棄置件數（試點區） |")
        self.assertFails("6.3 row 「家用垃圾違規棄置件數（試點區）」: solution F is not in 6.1")

    def test_measure_cell_pointing_below_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.MEASURE_ROW, "| C | 開放資料的資料時間涵蓋終點 | `[實證]` 見下表 |")
        self.assertFails("6.3 row 「開放資料的資料時間涵蓋終點」: 「見下表」")

    def test_measure_cell_pointing_above_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.MEASURE_ROW, "| C | 開放資料的資料時間涵蓋終點 | `[實證]` 2018-01-10（見上表） |")
        self.assertFails("6.3 row 「開放資料的資料時間涵蓋終點」: 「見上表」")

    # open-data.csv lists every open dataset (data.gov.tw, data.taipei) cited in
    # an appendix, and each row lists the issues whose appendix cites it.
    SMOKE_ROW = "臺北市指定吸菸區,https://data.gov.tw/dataset/177504,臺北市政府衛生局,政府資料開放授權條款第 1 版,8\n"
    PETITION_ROW = "https://data.taipei/dataset/detail?id=cb423c17-88eb-4231-a725-f1b93247d1bf,臺北市政府研究發展考核委員會,政府資料開放授權條款第 1 版,2 3 4 5 6 8\n"

    def test_open_data_passes_for_each_issue(self):
        for folder in ("1-trees", "2-trashcans", "3-mice", "4-neihutraffic", "5-busroutes", "6-oldbuildings", "8-smokefree"):
            with self.subTest(folder=folder):
                code, out = self.run_check(folder)
                self.assertEqual(code, 0, out)

    def test_appendix_dataset_missing_from_open_data(self):
        self.edit("data/open-data.csv", self.SMOKE_ROW, "")
        self.assertFails("open-data.csv", "https://data.gov.tw/dataset/177504", folder="8-smokefree")

    def test_open_data_row_missing_an_issue(self):
        self.edit("data/open-data.csv", self.PETITION_ROW, self.PETITION_ROW.replace(",2 3 4 5 6 8\n", ",2 3 4 5 6\n"))
        self.assertFails("open-data.csv", "cb423c17", folder="8-smokefree")

    def test_open_data_row_not_in_appendix(self):
        self.edit("data/open-data.csv", self.SMOKE_ROW, self.SMOKE_ROW.replace(",8\n", ",2 8\n"))
        self.assertFails("open-data.csv", "https://data.gov.tw/dataset/177504", "not in the appendix")

    def test_open_data_bad_issue_value(self):
        self.edit("data/open-data.csv", self.SMOKE_ROW, self.SMOKE_ROW.replace(",8\n", ",#8\n"))
        self.assertFails("open-data.csv", "議題", folder="8-smokefree")

    def test_open_data_file_has_bom_and_header(self):
        with open(os.path.join(self.dir, "data", "open-data.csv"), "rb") as f:
            raw = f.read()
        self.assertTrue(raw.startswith(b"\xef\xbb\xbf"))
        self.assertEqual(raw[3:].decode("utf-8").splitlines()[0], "名稱,網址,提供機關,授權,議題")


    # ---------- 1.3 特別關注族群檢查 ----------
    # The #2 table: 呼吸道疾病 has no stakeholder; I11 is in two groups.
    FOCUS_RESP = "| 呼吸道疾病 | （無） | 【待補：本議題是否需要納入過敏或呼吸道疾病者的觀點】 |\n"
    FOCUS_OLD = "| 高齡 | I05、I11 | — |\n"
    FOCUS_FOREIGN = "| 外籍 | I03、I04 | — |\n"

    def test_focus_table_passes_in_every_issue(self):
        for folder in ("1-trees", "2-trashcans", "8-smokefree"):
            with self.subTest(folder=folder):
                code, out = self.run_check(folder)
                self.assertEqual(code, 0, out)

    def test_focus_section_missing_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "### 1.3 特別關注族群檢查", "### 1.3 其他檢查")
        self.assertFails("特別關注族群檢查")

    def test_focus_header_wrong_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "| 特別關注 | 納入的利害關係人 | 說明 |",
                  "| 特別關注 | 利害關係人 | 說明 |")
        self.assertFails("特別關注族群檢查", "header")

    def test_focus_group_missing_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_RESP, "")
        self.assertFails("特別關注族群檢查", "呼吸道疾病")

    def test_focus_groups_out_of_order_fail(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_OLD + "| 身心障礙 | I06 | — |\n",
                  "| 身心障礙 | I06 | — |\n" + self.FOCUS_OLD)
        self.assertFails("特別關注族群檢查", "order")

    def test_focus_id_missing_fails(self):
        # I11 has 高齡 in stakeholders.csv, so the 高齡 row must list it.
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_OLD, "| 高齡 | I05 | — |\n")
        self.assertFails("特別關注族群檢查", "高齡", "I11")

    def test_focus_id_without_that_tag_fails(self):
        # I01 is in #2 but has no 特別關注.
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_FOREIGN, "| 外籍 | I01、I03、I04 | — |\n")
        self.assertFails("特別關注族群檢查", "外籍", "I01")

    def test_focus_id_not_in_issue_fails(self):
        # I19 has 經濟弱勢 but is not a stakeholder of #2.
        self.edit(f"{ISSUE}/issue-analysis.md", "| 經濟弱勢 | I11 | — |\n", "| 經濟弱勢 | I11、I19 | — |\n")
        self.assertFails("特別關注族群檢查", "I19")

    def test_focus_none_but_group_has_stakeholders_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_FOREIGN, "| 外籍 | （無） | 【待補：本議題是否需要納入外籍人士的觀點】 |\n")
        self.assertFails("特別關注族群檢查", "外籍", "I03")

    def test_focus_bad_id_list_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_FOREIGN, "| 外籍 | I03, I04 | — |\n")
        self.assertFails("特別關注族群檢查", "外籍", "、")

    def test_focus_none_with_empty_note_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_RESP, "| 呼吸道疾病 | （無） |  |\n")
        self.assertFails("特別關注族群檢查", "呼吸道疾病", "說明")

    def test_focus_none_with_dash_note_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_RESP, "| 呼吸道疾病 | （無） | — |\n")
        self.assertFails("特別關注族群檢查", "呼吸道疾病", "說明")

    def test_focus_none_note_must_be_a_pending_item(self):
        # Only a person decides that a group does not apply, so the AI writes a question, not a verdict.
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_RESP, "| 呼吸道疾病 | （無） | `[AI模擬]` 與本題無關 |\n")
        self.assertFails("特別關注族群檢查", "呼吸道疾病", "【待補：")

    def test_focus_note_of_included_group_needs_a_tag(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_FOREIGN, "| 外籍 | I03、I04 | 需要多語言 |\n")
        self.assertFails("特別關注族群檢查", "外籍", "tag")

    def test_focus_note_of_included_group_with_tag_passes(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.FOCUS_FOREIGN, "| 外籍 | I03、I04 | `[AI模擬]` 需要多語言 |\n")
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    # ---------- 分析摘要 ----------
    # A row of the #2 summary, used by the tests below.
    SUMMARY_ROW = ("| 選址討論的速度與代表性 | `[AI模擬]` 解法 D 的里民討論會讓設置變慢；常出席的人聲音比較大；"
                   "討論結果如果不被採用，可能傷害信任。 | 解法 D、N05、O05-US01 |")

    def summary_row(self, text, refs):
        return f"| 選址討論的速度與代表性 | {text} | {refs} |"

    def test_summary_passes_in_every_issue(self):
        for folder in ("1-trees", "2-trashcans", "8-smokefree"):
            with self.subTest(folder=folder):
                code, out = self.run_check(folder)
                self.assertEqual(code, 0, out)

    def test_summary_missing_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "## 分析摘要\n", "## 摘要\n")
        self.assertFails("分析摘要: no heading")

    def test_summary_after_step_1_fails(self):
        md = f"{ISSUE}/issue-analysis.md"
        self.edit(md, "## 分析摘要\n", "## 分析摘要（舊）\n")
        self.edit(md, "## 編號異動紀錄\n", "## 分析摘要\n\n### 難以取捨的決定\n\n## 編號異動紀錄\n")
        self.assertFails("分析摘要: the section must come before")

    def test_summary_topic_missing_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "### 法規上的障礙\n", "### 法規\n")
        self.assertFails("分析摘要", "法規上的障礙")

    def test_summary_topics_out_of_order_fail(self):
        md = f"{ISSUE}/issue-analysis.md"
        self.edit(md, "### 難以取捨的決定\n", "### TMP\n")
        self.edit(md, "### 可能的爭議\n", "### 難以取捨的決定\n")
        self.edit(md, "### TMP\n", "### 可能的爭議\n")
        self.assertFails("分析摘要", "order")

    def test_summary_header_wrong_fails(self):
        md = f"{ISSUE}/issue-analysis.md"
        self.edit(md, "### 法規上的障礙\n\n| 項目 | 說明 | 相關編號 |", "### 法規上的障礙\n\n| 項目 | 內容 | 相關編號 |")
        self.assertFails("分析摘要 法規上的障礙", "header")

    def test_summary_row_without_tag_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.SUMMARY_ROW,
                  self.summary_row("店家希望不要預設由店家清理清潔箱。", "C5、O01-US02"))
        self.assertFails("分析摘要 可能的爭議", "選址討論的速度與代表性", "tag")

    def test_summary_pending_row_passes(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.SUMMARY_ROW,
                  self.summary_row("【待補：需要真人確認選址討論的方式】", "—"))
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_summary_tagged_row_without_refs_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.SUMMARY_ROW,
                  self.summary_row("`[AI模擬]` 店家希望不要預設由店家清理清潔箱。", "—"))
        self.assertFails("分析摘要 可能的爭議", "選址討論的速度與代表性", "相關編號")

    def test_summary_bad_ref_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.SUMMARY_ROW,
                  self.summary_row("`[AI模擬]` 店家希望不要預設由店家清理清潔箱。", "C5, O01-US02"))
        self.assertFails("分析摘要 可能的爭議", "「C5, O01-US02」 is not a reference")

    def test_summary_unknown_local_refs_fail(self):
        for ref in ("C99", "解法 Z", "W99", "I99", "I01-US99"):
            with self.subTest(ref=ref):
                # A fresh copy for each reference.
                self.tearDown()
                self.setUp()
                self.edit(f"{ISSUE}/issue-analysis.md", self.SUMMARY_ROW,
                          self.summary_row("`[AI模擬]` 店家希望不要預設由店家清理清潔箱。", f"C5、{ref}"))
                self.assertFails("分析摘要 可能的爭議", ref)

    def test_summary_cross_ref_missing_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.SUMMARY_ROW,
                  self.summary_row("`[AI模擬]` 店家希望不要預設由店家清理清潔箱。", "C5、#8 解法 Z"))
        self.assertFails("#8 解法 Z", "not in issue #8")

    def test_summary_cross_ref_to_own_issue_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.SUMMARY_ROW,
                  self.summary_row("`[AI模擬]` 店家希望不要預設由店家清理清潔箱。", "#2 C5"))
        self.assertFails("#2 C5", "this is issue #2 itself")

    def test_summary_cross_ref_passes(self):
        self.edit(f"{ISSUE}/issue-analysis.md", self.SUMMARY_ROW,
                  self.summary_row("`[AI模擬]` 店家希望不要預設由店家清理清潔箱。", "C5、#8 解法 B、#8 C3、#1 I06-US02、#8 W03"))
        code, out = self.run_check()
        self.assertEqual(code, 0, out)


    # ---------- the needs-based format (#1, #2 and #8; owner decision 2026-10-20) ----------
    MD = f"{ISSUE}/issue-analysis.md"
    I06_ROW = "| `[AI模擬]` 安全通行，不會撞到 | N07 | 可詢問身障團體 | `[AI模擬]` M |"
    I01_US03_PRIO = "（關鍵字估算） | `[AI模擬]` M |\n| I01-US04 |"

    def test_other_issues_pass_in_needs_format(self):
        for folder in ("1-trees", "8-smokefree"):
            with self.subTest(folder=folder):
                code, out = self.run_check(folder)
                self.assertEqual(code, 0, out)
                self.assertIn("N groups:", out)
                self.assertNotIn("format: old", out)

    def test_old_format_still_passes(self):
        # The fixture takes the place of #8. Its stakeholders are the same as in #8 now.
        self.no_cross_issue()
        for name in ("issue-analysis.md", "user-stories.csv"):
            shutil.copy(os.path.join(OLD_FORMAT, name), os.path.join(self.dir, "8-smokefree", name))
        # The fixture is older than the 災害風險 row (2026-10-22). The check now
        # requires the row in every file, so add it after each 其他顧慮與風險 row of
        # this copy. The fixture file itself stays as it was.
        path = os.path.join(self.dir, "8-smokefree", "issue-analysis.md")
        with open(path, encoding="utf-8") as f:
            text = f.read()
        text, n = re.subn(r"^(\| 其他顧慮與風險 \|.*\n)", r"\1| 災害風險 | `[AI模擬]` 無明顯相關災害風險 |\n", text, flags=re.M)
        self.assertEqual(n, 5)
        # #8 cites an open dataset that is newer than the fixture (2026-10-22),
        # and open-data.csv lists it for #8. Add it to the end of the appendix
        # of this copy too (the appendix is the last 「## 」 section).
        text += "\n- [data.gov.tw 133055](https://data.gov.tw/dataset/133055)\n"
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        code, out = self.run_check("8-smokefree")
        self.assertEqual(code, 0, out)
        self.assertIn("format: old", out)

    def test_old_format_without_disaster_row_fails(self):
        # The row is required in an old-format file too.
        self.no_cross_issue()
        for name in ("issue-analysis.md", "user-stories.csv"):
            shutil.copy(os.path.join(OLD_FORMAT, name), os.path.join(self.dir, "8-smokefree", name))
        self.assertFails("步驟 7 #8 解法 A: no 「災害風險」 row", folder="8-smokefree")

    def test_need_group_with_one_story_fails(self):
        self.edit(self.MD, self.I06_ROW, self.I06_ROW.replace("N07", "N11"))
        self.assertFails("N11 has only 1 story")

    def test_need_group_with_one_stakeholder_fails(self):
        # Two stories of I06 alone do not make a shared need.
        self.edit(self.MD, self.I06_ROW, self.I06_ROW.replace("N07", "N11"))
        row = "| `[AI模擬]` 和其他人一樣可以自己丟垃圾 | N08 |"
        self.edit(self.MD, row, row.replace("N08", "N11"))
        self.assertFails("N11 has only 1 stakeholder (I06)")

    def test_story_priority_must_be_its_need_priority(self):
        self.edit(self.MD, self.I01_US03_PRIO, self.I01_US03_PRIO.replace("` M |", "` S |"))
        self.assertFails("I01-US03: priority in step 4 is S, but its need N01 is M")

    def test_need_with_two_priority_rows_fails(self):
        row = "| N07 | 在人行道上安全通行 | I06-US01、I07-US02 | `[AI模擬]` M |"
        self.edit(self.MD, row, row.replace("N07 | 在人行道上安全通行 | I06-US01、I07-US02 | `[AI模擬]` M |",
                                            "N07 | 在人行道上安全通行 | I06-US01、I07-US02 | `[AI模擬]` S | `[AI模擬]` x |\n" + row))
        self.assertFails("need N07 has two rows")

    def test_need_without_priority_row_fails(self):
        path = os.path.join(self.dir, self.MD)
        with open(path, encoding="utf-8") as f:
            lines = f.read().split("\n")
        kept = [l for l in lines if not l.startswith("| N07 | 在人行道上安全通行 |")]
        self.assertEqual(len(kept), len(lines) - 1)
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(kept))
        self.assertFails("5.2: need N07 has no priority row")

    def test_grouped_story_cannot_have_its_own_priority_row(self):
        row = "| I24-US01 | 趕不上垃圾車時，也能依規定丟家用垃圾 | I24-US01 |"
        self.edit(self.MD, row, "| I06-US01 | 安全通行 | I06-US01 | `[AI模擬]` M | `[AI模擬]` x |\n" + row)
        self.assertFails("5.2: story I06-US01 is in N07")

    def test_6_2_unknown_need_fails(self):
        self.edit(self.MD, "| C | 找桶指引與開放資料 | `[AI模擬]` N01 |", "| C | 找桶指引與開放資料 | `[AI模擬]` N01、N99 |")
        self.assertFails("6.2 C: 「N99」 is not a need", "N99 is referenced but is not a 相同需求群組")

    def test_6_2_story_of_a_group_fails(self):
        self.edit(self.MD, "| C | 找桶指引與開放資料 | `[AI模擬]` N01 |", "| C | 找桶指引與開放資料 | `[AI模擬]` N01、I06-US01 |")
        self.assertFails("6.2 C: I06-US01 is in N07; write N07")

    def test_6_2_should_need_in_must_column_fails(self):
        self.edit(self.MD, "| C | 找桶指引與開放資料 | `[AI模擬]` N01 |", "| C | 找桶指引與開放資料 | `[AI模擬]` N01、N08 |")
        self.assertFails("6.2 C: N08 is S")

    def test_6_2_old_header_in_needs_format_fails(self):
        self.edit(self.MD, "| 代號 | 解法 | 涵蓋的 Must 需求 | 涵蓋的 Should / Could 需求 |",
                  "| 代號 | 解法 | 涵蓋的 Must | 涵蓋的 Should / Could |")
        self.assertFails("6.2: expected one table with the header 代號 | 解法 | 涵蓋的 Must 需求")

    def test_must_need_not_covered_fails(self):
        self.edit(self.MD, "| E | 家用垃圾的彈性收集點（題目外的配套） | `[AI模擬]` N01、O04-US02、I24-US01 |",
                  "| E | 家用垃圾的彈性收集點（題目外的配套） | `[AI模擬]` N01、O04-US02 |")
        self.assertFails("Must need I24-US01 is not covered")

    def test_conflict_side_with_unknown_story_fails(self):
        self.edit(self.MD, "| `[AI模擬]` I01-US01 vs O08-US02 |", "| `[AI模擬]` I01-US01 vs O08-US09 |")
        self.assertFails("6.4 C3: story O08-US09 is not in step 4")

    def test_conflict_needs_must_exist(self):
        self.edit(self.MD, "| N01 vs O08-US02 |", "| N01 vs N99 |")
        self.assertFails("6.4 C3: 雙方的需求 「N99」 is not a need")

    def test_way_out_must_be_filled(self):
        old = "| `[AI模擬]` 未找到：本文件的解法沒有處理源頭減量"
        self.edit(self.MD, old, "| `[AI模擬]` 本文件的解法沒有處理源頭減量")
        self.assertFails("6.4 C3: 以需求為本的解方 must start with a tag and 「解法 X：」")

    def test_way_out_not_found_needs_a_method(self):
        self.edit(self.MD, "| `[AI模擬]` 全市線上意見地圖，例如 **Pol.is**（vTaiwan 曾使用的工具），找出各方都同意的說法 |", "| — |")
        self.assertFails("6.4 C3: no solution was found, so 可能的審議方法 must start with a tag")

    def test_way_out_unknown_solution_fails(self):
        self.edit(self.MD, "| `[AI模擬]` 解法 E、D：E 的收集點", "| `[AI模擬]` 解法 E、Z：E 的收集點")
        self.assertFails("6.4 C8: 以需求為本的解方 names 解法 Z, which is not in 6.1")

    def test_way_out_cross_issue_solution_must_exist(self):
        self.edit(self.MD, "菸蒂收集設備放在吸菸區內（#8 解法 B） | `[AI模擬]` 備案", "菸蒂收集設備放在吸菸區內（#8 解法 Z） | `[AI模擬]` 備案")
        self.assertFails("#8 解法 Z")

    def test_summary_need_ref_passes_and_unknown_fails(self):
        self.edit(self.MD, self.SUMMARY_ROW,
                  self.summary_row("`[AI模擬]` 解法 D 的里民討論會讓設置變慢。", "解法 D、N99"))
        self.assertFails("分析摘要 可能的爭議", "N99 is not in 相同需求群組")

    def test_csv_must_have_need_group_column(self):
        self.edit(f"{ISSUE}/user-stories.csv", "以便標記,相同需求編號,來源", "以便標記,來源")
        self.assertFails("CSV header wrong")


    # 更新日期 (design 3.23.8, decision 90): issues.csv 新增日期 and updated-dates.csv.
    ISSUE_ROW_9 = "9,9-policydiscovery,將產品探索技巧運用到政策前期研究,參加者補充,2026-10-20"
    DATES = "data/updated-dates.csv"

    def dates_row(self, type_, iid):
        """The line of one item in the copied updated-dates.csv."""
        with open(os.path.join(self.dir, self.DATES), encoding="utf-8-sig") as f:
            return next(l for l in f.read().splitlines() if l.startswith(f"{type_},{iid},"))

    def test_dates_pass_without_running_update(self):
        code, out = self.run_check(dates=False)
        self.assertEqual(code, 0, out)

    def test_issue_added_date_required_for_analyzed_issue(self):
        self.edit("data/issues.csv", self.ISSUE_ROW_9, self.ISSUE_ROW_9[:-len("2026-10-20")])
        self.assertFails("issues.csv: #9 新增日期")

    def test_issue_added_date_bad_or_future_fails(self):
        for wrong, needle in (("2026/10/20", "not YYYY-MM-DD"), ("2999-01-01", "future")):
            with self.subTest(wrong=wrong):
                self.tearDown(); self.setUp()
                self.edit("data/issues.csv", self.ISSUE_ROW_9, self.ISSUE_ROW_9.replace("2026-10-20", wrong))
                self.assertFails("issues.csv: #9 新增日期", needle)

    def test_issues_csv_without_date_column_fails(self):
        path = os.path.join(self.dir, "data", "issues.csv")
        with open(path, encoding="utf-8-sig") as f:
            lines = f.read().splitlines()
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            f.write("".join(l.rsplit(",", 1)[0] + "\n" for l in lines))
        self.assertFails("issues.csv: no 新增日期 column")

    def test_story_change_without_update_fails(self):
        self.edit(f"{ISSUE}/issue-analysis.md", "`[AI模擬]` 商圈有足夠的清潔箱 |", "`[AI模擬]` 商圈有更多的清潔箱 |")
        subprocess.run([sys.executable, "-I", os.path.join(ANALYSIS, "scripts", "build_csv.py"), self.md, self.csv],
                       capture_output=True, check=True)
        self.assertFails("updated-dates.csv: 利害關係人 O01", "請執行 update_dates.py", dates=False)
        # After update_dates.py the check passes.
        code, out = self.run_check()
        self.assertEqual(code, 0, out)

    def test_missing_row_fails(self):
        row = self.dates_row("解法", "2-A")
        self.edit(self.DATES, row + "\n", "")
        self.assertFails("updated-dates.csv: no row for 解法 2-A", "請執行 update_dates.py", dates=False)

    def test_extra_row_fails(self):
        row = self.dates_row("解法", "2-A")
        self.edit(self.DATES, row + "\n", row + "\n" + row.replace("2-A", "2-Z") + "\n")
        self.assertFails("updated-dates.csv: 解法 2-Z is not", dates=False)

    def test_wrong_fingerprint_fails(self):
        row = self.dates_row("跨議題解法", "X-A")
        self.edit(self.DATES, row, row[:-12] + "000000000000")
        self.assertFails("updated-dates.csv: 跨議題解法 X-A", "請執行 update_dates.py", dates=False)

    def test_bad_updated_date_fails(self):
        row = self.dates_row("利害關係人", "I05")
        date = row.split(",")[3]
        for wrong, needle in (("2026/10/20", "not YYYY-MM-DD"), ("2026-02-30", "not a real date"),
                              ("2999-01-01", "future"), ("2026-10-01", "before its 新增日期 2026-10-18")):
            with self.subTest(wrong=wrong):
                self.tearDown(); self.setUp()
                self.edit(self.DATES, row, row.replace(f",{date},", f",{wrong},"))
                self.assertFails("updated-dates.csv: 利害關係人 I05 更新日期", needle, dates=False)

    def test_bad_story_added_date_fails(self):
        # A user story keeps its 新增日期 in updated-dates.csv.
        row = self.dates_row("使用者故事", "2-O01-US01")
        parts = row.split(",")
        for added, updated, needle in (("", parts[3], "新增日期 '' is not YYYY-MM-DD"),
                                       ("2999-01-01", parts[3], "新增日期 2999-01-01 is in the future"),
                                       ("2026-10-20", "2026-10-19", "更新日期 2026-10-19 is before its 新增日期 2026-10-20")):
            with self.subTest(added=added):
                self.tearDown(); self.setUp()
                self.edit(self.DATES, row, ",".join(parts[:2] + [added, updated] + parts[4:]))
                self.assertFails("updated-dates.csv: 使用者故事 2-O01-US01", needle, dates=False)

    def test_added_date_on_other_type_fails(self):
        # A stakeholder's 新增日期 is in stakeholders.csv, so the column stays empty.
        row = self.dates_row("利害關係人", "I05")
        self.edit(self.DATES, row, row.replace("I05,,", "I05,2026-10-18,"))
        self.assertFails("updated-dates.csv: 利害關係人 I05 新增日期 must be empty", dates=False)


if __name__ == "__main__":
    unittest.main()
