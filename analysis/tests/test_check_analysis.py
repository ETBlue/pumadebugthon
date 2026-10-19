"""Tests for analysis/scripts/check_analysis.py.

Each test copies every issue folder that has an issue-analysis.md, and the shared files, into a temp dir, changes one
thing, runs the check as a subprocess, and looks at the exit code and output.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import os, re, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "scripts", "check_analysis.py")
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv", "docs/method.md", "data/open-data.csv")
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
        self.edit("data/stakeholders.csv", "I05,高齡者,res,高齡,1 2 8,", "I05,高齡者,res,高齡,2,")
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
        md = f"{ISSUE}/issue-analysis.md"
        self.edit(md, "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`", "| K | `[AI模擬]` 參與式選址流程 | `sidewalk`")
        self.edit(md, "| D | 參與式選址流程 |", "| K | 參與式選址流程 |")
        self.edit(md, "### 7.4 解法 D：", "### 7.4 解法 K：")
        self.edit(md, "| D | `[AI模擬]` 參與式選址流程 | 中 |", "| K | `[AI模擬]` 參與式選址流程 | 中 |")
        self.edit(md, "| A、D | 家用垃圾", "| A、K | 家用垃圾")
        self.edit(md, "| D | 新設點中", "| K | 新設點中")
        self.edit(md, "| D | 設置後 3 個月", "| K | 設置後 3 個月")
        self.edit(md, "O04-US04、解法 A、解法 D |", "O04-US04、解法 A、解法 K |")
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
            self.assertIn("| Nature Ways | `[AI整理]` 新聞報導指出", f.read())

    def test_news_cell_without_verify_item_fails(self):
        self.edit("1-trees/issue-analysis.md", self.NEWS_ROW, "需真人查證（來源：Mothership，2020）")
        self.assertFails("[AI整理]", "新聞", "【待補：查證…】", folder="1-trees")

    def test_news_paragraph_without_verify_item_fails(self):
        self.edit("1-trees/issue-analysis.md", self.NEWS_ROW, "需真人查證（來源：Mothership，2020）")
        self.edit("1-trees/issue-analysis.md", "| Nature Ways | `[AI整理]` 新聞報導指出",
                  "| Nature Ways | `[AI模擬]` 新聞報導指出")
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
                self.edit("data/stakeholders.csv", "I05,高齡者,res,高齡,1 2 8,,2026-10-18", f"I05,高齡者,res,高齡,1 2 8,,{wrong}")
                self.assertFails("stakeholders.csv: I05 新增日期")

    def test_stakeholders_csv_future_date_fails(self):
        self.edit("data/stakeholders.csv", "I05,高齡者,res,高齡,1 2 8,,2026-10-18", "I05,高齡者,res,高齡,1 2 8,,2999-01-01")
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
    PETITION_ROW = "https://data.taipei/dataset/detail?id=cb423c17-88eb-4231-a725-f1b93247d1bf,臺北市政府研究發展考核委員會,政府資料開放授權條款第 1 版,2 8\n"

    def test_open_data_passes_for_each_issue(self):
        for folder in ("1-trees", "2-trashcans", "8-smokefree"):
            with self.subTest(folder=folder):
                code, out = self.run_check(folder)
                self.assertEqual(code, 0, out)

    def test_appendix_dataset_missing_from_open_data(self):
        self.edit("data/open-data.csv", self.SMOKE_ROW, "")
        self.assertFails("open-data.csv", "https://data.gov.tw/dataset/177504", folder="8-smokefree")

    def test_open_data_row_missing_an_issue(self):
        self.edit("data/open-data.csv", self.PETITION_ROW, self.PETITION_ROW.replace(",2 8\n", ",2\n"))
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
        for name in ("issue-analysis.md", "user-stories.csv"):
            shutil.copy(os.path.join(OLD_FORMAT, name), os.path.join(self.dir, "8-smokefree", name))
        code, out = self.run_check("8-smokefree")
        self.assertEqual(code, 0, out)
        self.assertIn("format: old", out)

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


if __name__ == "__main__":
    unittest.main()
