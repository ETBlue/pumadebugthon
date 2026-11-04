"""Tests for the new step 7 format: cost ranges, the work breakdown (WBS)
table and the gantt chart (pilot on #2, ETBlue, 2026-11-04; method.md,
成本範圍與工作分解（新格式）).

- AnalysisCommonWbsTest tests analysis_common.cost_problems and
  step7_schedule with small fixtures. The fixture has two phases, and phase
  1 has two items, so that order and matching are really tested.
- CheckWbsTest and BuildWbsTest copy the issue folders into a temp dir and
  run check_analysis.py, check_cross_issue.py, update_dates.py and
  build_json.py there. #2 is in the new format (since 2026-11-04). to_steps
  turns one solution back into the old format; with_fixture puts the small
  fixture into one solution, so the build test knows the exact values.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import importlib.util, json, os, re, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ANALYSIS, "scripts")
ISSUE = "2-trashcans"
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv", "data/domain-types.csv",
          "data/solution-types.csv", "docs/method.md", "data/open-data.csv", "data/updated-dates.csv", "docs/human-inputs.md")


def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


COST = "`[AI模擬]` 時間：約 6–9 個月；經費：約 NT$ 50–100 萬；人力：約 120–200 人天【待補：專業人士確認】"
PLAN = """| 執行計畫 | 內容 |
|---|---|
| 主責單位 | `[AI模擬]` 環保局 |
| 需要的資料／API／資源 | `[AI模擬]` 里界資料 |
| 成本 | `[AI模擬]` 成本中（人力與場地）。""" + COST + " |\n"
WBS = """| 編號 | 工作項目 | 主責單位 | 期間 | 人天 |
|---|---|---|---|---|
| 1 | `[AI模擬]` 準備：訂好流程與分工 | 環保局 | 第 1–2 個月 | 約 20–40 |
| 1.1 | `[AI模擬]` 和各區公所訂好流程 | 環保局 | 第 1 個月 | 約 10–20 |
| 1.2 | `[AI模擬]` 選出試點的里 | 環保局 | 第 2 個月 | 【待補：人力估計】 |
| 2 | `[AI模擬]` 試點：在幾個里辦工作坊 | 環保局 | 第 3–6 個月 | 約 60–100 |
| 2.1 | `[AI模擬]` 辦里民工作坊 | 民政局 | 第 3–6 個月 | 約 40–60 |
"""
GANTT = """```mermaid
gantt
  title 時程示意：每格約 1 個月，不是實際日期
  dateFormat YYYY-MM-DD
  axisFormat ·
  tickInterval 1month
  todayMarker off
  section 1 準備
  1.1 訂好流程 :t1_1, 2000-01-01, 30d
  1.2 選出試點的里 :t1_2, after t1_1, 30d
  section 2 試點
  2.1 辦里民工作坊 :t2_1, after t1_2, 120d
```
"""
SECTION = PLAN + "\n" + WBS + "\n" + GANTT


def section_span(text, code):
    """The start and end of the step 7 section of solution code (for example
    "S4") in the issue text."""
    start = text.index(f"解法 {code}：", text.index("## 步驟 7"))
    return start, text.index("\n### ", start)


SCHEDULE = re.compile(r"\n\n\| 編號 \| 工作項目 .*?\n```mermaid\n.*?\n```", re.S)


def to_steps(text, code):
    """The text with the step 7 section of solution code in the old format:
    the WBS table and the chart are replaced by a 執行步驟 row, and the
    ranges are taken out of the 成本 cell."""
    start, end = section_span(text, code)
    part, n = SCHEDULE.subn("\n| 執行步驟 | `[AI模擬]` 先試辦 |", text[start:end], count=1)
    assert n == 1
    part = re.sub(r"`\[AI模擬\]` [^`|]*?時間：.*?【待補：專業人士確認】", "", part)
    return text[:start] + part + text[end:]


def with_fixture(text, code):
    """The text with the 成本 ranges, the WBS table and the chart of solution
    code replaced by COST, WBS and GANTT above."""
    start, end = section_span(text, code)
    part = re.sub(r"`\[AI模擬\]` [^`|]*?時間：.*?【待補：專業人士確認】", lambda m: COST, text[start:end], count=1)
    part, n = SCHEDULE.subn(lambda m: "\n\n" + WBS + "\n" + GANTT.rstrip("\n"), part, count=1)
    assert n == 1
    return text[:start] + part + text[end:]


class AnalysisCommonWbsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.common = load("analysis_common")

    def problems(self, section=SECTION):
        return self.common.step7_schedule(section.split("\n"))[2]

    def assertProblem(self, section, needle):
        found = self.problems(section)
        self.assertTrue(any(needle in p for p in found), f"{needle!r} not in {found}")

    # ---- cost ----

    def test_cost_passes(self):
        self.assertEqual(self.common.cost_problems("`[AI模擬]` 成本中（人力）。" + COST), [])
        # Each range in its own [AI模擬] part, and 億, and an old 【待補】 item kept.
        self.assertEqual(self.common.cost_problems(
            "`[AI模擬]` 成本高【待補：市場詢價】 `[AI模擬]` 時間：約 12–18 個月 `[AI模擬]` 經費：約 NT$ 0.5–1 億 "
            "`[AI模擬]` 人力：約 300–500 人天【待補：專業人士確認】"), [])

    def test_cost_missing_range_fails(self):
        p = self.common.cost_problems("`[AI模擬]` 成本中。`[AI模擬]` 時間：約 6–9 個月；人力：約 120–200 人天【待補：專業人士確認】")
        self.assertEqual(p, ["no 「經費」 range; write it like 「經費：約 NT$ 50–100 萬」"])

    def test_cost_range_order_fails(self):
        p = self.common.cost_problems("`[AI模擬]` 成本中。`[AI模擬]` 經費：約 NT$ 50–100 萬；時間：約 6–9 個月；人力：約 120–200 人天【待補：專業人士確認】")
        self.assertIn("「經費」 must come after the range before it (the order is 時間、經費、人力)", p)

    def test_cost_range_not_ai_fails(self):
        p = self.common.cost_problems("`[實證]` 成本中。時間：約 6–9 個月 `[AI模擬]` 經費：約 NT$ 50–100 萬；人力：約 120–200 人天【待補：專業人士確認】")
        self.assertEqual(p, ["「時間：約 6–9 個月」 must be in a part that starts with `[AI模擬]`"])

    def test_cost_bad_range_fails(self):
        p = self.common.cost_problems("`[AI模擬]` 成本中。" + COST.replace("6–9", "9–6"))
        self.assertEqual(p, ["「時間：約 9–6 個月」: the first number must be smaller than the second"])

    def test_cost_check_item_once(self):
        p = self.common.cost_problems("`[AI模擬]` 成本中。" + COST.replace("【待補：專業人士確認】", ""))
        self.assertEqual(p, ["write 「【待補：專業人士確認】」 once, after the ranges (found 0)"])
        p = self.common.cost_problems("`[AI模擬]` 成本中【待補：專業人士確認】。" + COST)
        self.assertEqual(p, ["write 「【待補：專業人士確認】」 once, after the ranges (found 2)"])
        p = self.common.cost_problems("`[AI模擬]` 成本中【待補：專業人士確認】。" + COST.replace("【待補：專業人士確認】", ""))
        self.assertEqual(p, ["「【待補：專業人士確認】」 must come after the last range"])

    # ---- the WBS table and the chart ----

    def test_section_passes(self):
        rows, gantt, problems = self.common.step7_schedule(SECTION.split("\n"))
        self.assertEqual(problems, [])
        self.assertEqual([(r["id"], r["level"]) for r in rows], [("1", 1), ("1.1", 2), ("1.2", 2), ("2", 1), ("2.1", 2)])
        self.assertEqual(rows[2]["days"], "【待補：人力估計】")
        self.assertEqual(gantt[0], "gantt")
        self.assertEqual(gantt[-1], "  2.1 辦里民工作坊 :t2_1, after t1_2, 120d")

    def test_format_of_a_section(self):
        self.assertEqual(self.common.step7_format(SECTION.split("\n")), "wbs")
        self.assertEqual(self.common.step7_format(PLAN.split("\n")), "steps")
        self.assertEqual(self.common.step7_format((PLAN + "\n" + GANTT).split("\n")), "wbs")

    def test_without_table_or_chart_fails(self):
        self.assertProblem(PLAN + "\n" + GANTT, "expected one work breakdown table with the header | 編號 | 工作項目 | 主責單位 | 期間 | 人天 |, found 0")
        self.assertProblem(PLAN + "\n" + WBS, "expected one ```mermaid block (the gantt chart), found 0")
        self.assertProblem(SECTION + "\n" + GANTT, "expected one ```mermaid block (the gantt chart), found 2")

    def test_placement_fails(self):
        self.assertProblem(PLAN + "\n說明\n\n" + WBS + "\n" + GANTT, "must come right after the 執行計畫 table")
        self.assertProblem(PLAN + "\n" + WBS + "\n說明\n\n" + GANTT, "the ```mermaid block must come right after the work breakdown table")
        self.assertProblem(SECTION.rstrip("`\n") + "\n", "the ```mermaid block has no closing ``` line")

    def test_id_order_fails(self):
        a = "| 1.1 | `[AI模擬]` 和各區公所訂好流程 | 環保局 | 第 1 個月 | 約 10–20 |\n"
        b = "| 1.2 | `[AI模擬]` 選出試點的里 | 環保局 | 第 2 個月 | 【待補：人力估計】 |\n"
        self.assertProblem(SECTION.replace(a + b, b + a), "work breakdown row 「1.2」: expected 「1.1」 here")
        self.assertProblem(SECTION.replace("| 2.1 |", "| 2.2 |"), "work breakdown row 「2.2」: expected 「2.1」 here")
        self.assertProblem(SECTION.replace("| 2 | `[AI", "| 3 | `[AI"), "work breakdown row 「3」: expected 「2」 here")
        self.assertProblem(SECTION.replace("| 1.1 |", "| 1.a |"), "work breakdown row 「1.a」: 編號 must be")

    def test_phase_without_items_fails(self):
        rows = [l for l in WBS.split("\n") if not l.startswith("| 1.")]
        self.assertProblem(PLAN + "\n" + "\n".join(rows) + "\n" + GANTT, "work breakdown phase 「1」 has no level 2 row (for example 「1.1」)")
        last = "| 2.1 | `[AI模擬]` 辦里民工作坊 | 民政局 | 第 3–6 個月 | 約 40–60 |\n"
        self.assertProblem(SECTION.replace(last, ""), "work breakdown phase 「2」 has no level 2 row (for example 「2.1」)")

    def test_tags_fail(self):
        self.assertProblem(SECTION.replace("| `[AI模擬]` 選出試點的里 |", "| 選出試點的里 |"),
                           "work breakdown row 「1.2」: the 工作項目 cell must start with one tag")
        self.assertProblem(SECTION.replace("| `[AI模擬]` 選出試點的里 |", "| `[AI模擬]` 選出 `[實證]` 試點的里 |"),
                           "work breakdown row 「1.2」: the 工作項目 cell has 2 tags; write one tag")
        self.assertProblem(SECTION.replace("| 民政局 |", "| `[AI模擬]` 民政局 |"),
                           "work breakdown row 「2.1」: the 主責單位 cell has no tag; only 工作項目 starts with a tag")

    def test_phase_name_fails(self):
        self.assertProblem(SECTION.replace("`[AI模擬]` 準備：訂好流程與分工", "`[AI模擬]` ：訂好流程與分工"),
                           "work breakdown row 「1」: the 工作項目 cell must start with the phase name after the tag")
        self.assertProblem(SECTION.replace("`[AI模擬]` 準備：訂好流程與分工", "`[AI模擬]` 準備#1"),
                           "work breakdown row 「1」: the phase name 「準備#1」 must not hold")

    def test_period_fails(self):
        for bad in ("2026 年 1 月", "第 1-2 個月", "第 2–1 個月", "1 個月"):
            with self.subTest(period=bad):
                self.assertTrue(any("work breakdown row 「1」: 期間" in p
                                    for p in self.problems(SECTION.replace("| 第 1–2 個月 |", f"| {bad} |"))))

    def test_days_fail(self):
        self.assertProblem(SECTION.replace("| 約 20–40 |", "| 30 |"), "work breakdown row 「1」: 人天 must be 「約 a–b」 or one 【待補：…】 item")
        self.assertProblem(SECTION.replace("| 約 20–40 |", "| 約 40–20 |"), "work breakdown row 「1」: 人天 「約 40–20」: the first number must be smaller")

    def test_chart_settings_fail(self):
        self.assertProblem(SECTION.replace("gantt\n", "flowchart\n"), "the ```mermaid block must start with the line 「gantt」")
        self.assertProblem(SECTION.replace("  axisFormat ·\n", "  axisFormat %Y-%m\n"), "after 「gantt」 the chart must have these lines")
        self.assertProblem(SECTION.replace("  todayMarker off\n", ""), "after 「gantt」 the chart must have these lines")

    def test_chart_sections_fail(self):
        self.assertProblem(SECTION.replace("section 2 試點", "section 2 試辦"),
                           "the chart sections must be the level 1 rows of the work breakdown table, in order: 「1 準備」、「2 試點」; found 「1 準備」、「2 試辦」")

    def test_chart_tasks_fail(self):
        t1, t2 = "  1.1 訂好流程 :t1_1, 2000-01-01, 30d\n", "  1.2 選出試點的里 :t1_2, after t1_1, 30d\n"
        swapped = SECTION.replace(t1 + t2, t2.replace("after t1_1", "2000-01-01") + t1.replace("2000-01-01", "after t1_2"))
        self.assertProblem(swapped, "chart section 「1 準備」: the tasks must be the level 2 rows 1.1、1.2, in order; found 1.2、1.1")
        self.assertProblem(SECTION.replace(t2, ""), "chart section 「1 準備」: the tasks must be the level 2 rows 1.1、1.2, in order; found 1.1")
        self.assertProblem(SECTION.replace(":t1_2,", ":t1_3,"), "chart task 「1.2 選出試點的里」: the id must be 「t1_2」, found 「t1_3」")
        self.assertProblem(SECTION.replace("1.2 選出試點的里 :", "選出試點的里 :"), "the name must start with its 編號")

    def test_chart_task_start_fails(self):
        self.assertProblem(SECTION.replace("t1_1, 2000-01-01", "t1_1, 2026-01-01"), "the first task starts on 2000-01-01, found 「2026-01-01」")
        self.assertProblem(SECTION.replace("after t1_1, 30d", "after t2_1, 30d"), "「after t2_1」 names no task above it")
        self.assertProblem(SECTION.replace("after t1_1, 30d", "1999-12-01, 30d"), "only the first task has a date; write 「after t…」, found 「1999-12-01」")
        self.assertProblem(SECTION.replace("after t1_1, 30d", "after t1_1, 1M"), "chart line 「1.2 選出試點的里 :t1_2, after t1_1, 1M」")

    # ---- the chart compared with 期間 ----

    def test_chart_matches_periods(self):
        # Two tasks after one task, and a task after two tasks: the start is
        # the latest end of the named tasks.
        wbs = WBS.replace("| 2.1 | `[AI模擬]` 辦里民工作坊 | 民政局 | 第 3–6 個月 | 約 40–60 |\n",
                          "| 2.1 | `[AI模擬]` 辦里民工作坊 | 民政局 | 第 3–6 個月 | 約 40–60 |\n"
                          "| 2.2 | `[AI模擬]` 整理意見 | 環保局 | 第 3–4 個月 | 約 5–10 |\n"
                          "| 2.3 | `[AI模擬]` 寫出報告 | 環保局 | 第 7 個月 | 約 5–10 |\n").replace("第 3–6 個月 | 約 60–100", "第 3–7 個月 | 約 60–100")
        gantt = GANTT.replace("120d\n", "120d\n  2.2 整理意見 :t2_2, after t1_2, 60d\n  2.3 寫出報告 :t2_3, after t2_1 t2_2, 30d\n")
        self.assertEqual(self.problems(PLAN + "\n" + wbs + "\n" + gantt), [])

    def test_chart_wrong_length_fails(self):
        self.assertEqual(self.problems(SECTION.replace(":t2_1, after t1_2, 120d", ":t2_1, after t1_2, 90d")),
                         ["chart task 「2.1 辦里民工作坊」: 期間 「第 3–6 個月」 is 120d, found 90d"])

    def test_chart_wrong_start_fails(self):
        # 1.2 starts after 1.1 (day 30), but its 期間 「第 3 個月」 starts on day 60.
        wrong = SECTION.replace("選出試點的里 | 環保局 | 第 2 個月 |", "選出試點的里 | 環保局 | 第 3 個月 |")
        self.assertIn("chart task 「1.2 選出試點的里」: 期間 「第 3 個月」 starts on day 60 (after 2000-01-01), found day 30",
                      self.problems(wrong))
        # A longer first task moves every task after it.
        self.assertIn("chart task 「2.1 辦里民工作坊」: 期間 「第 3–6 個月」 starts on day 60 (after 2000-01-01), found day 90",
                      self.problems(SECTION.replace(":t1_2, after t1_1, 30d", ":t1_2, after t1_1, 60d")))

    def test_chart_later_fixed_date_fails(self):
        # A later task with a date is an error even when the date is right.
        self.assertEqual(self.problems(SECTION.replace("after t1_1, 30d", "2000-01-31, 30d")),
                         ["chart task 「1.2 選出試點的里」: only the first task has a date; write 「after t…」, found 「2000-01-31」"])
        # A wrong date is compared with 期間 too.
        self.assertIn("chart task 「1.2 選出試點的里」: 期間 「第 2 個月」 starts on day 30 (after 2000-01-01), found day 60",
                      self.problems(SECTION.replace("after t1_1, 30d", "2000-03-01, 30d")))

    def test_phase_span_fails(self):
        self.assertEqual(self.problems(SECTION.replace("| 第 1–2 個月 |", "| 第 1–3 個月 |")),
                         ["work breakdown row 「1」: 期間 must cover its level 2 rows (1.1、1.2), so it is 「第 1–2 個月」; found 「第 1–3 個月」"])
        self.assertEqual(self.problems(SECTION.replace("| 第 3–6 個月 | 約 60–100 |", "| 第 4–6 個月 | 約 60–100 |")),
                         ["work breakdown row 「2」: 期間 must cover its level 2 rows (2.1), so it is 「第 3–6 個月」; found 「第 4–6 個月」"])

    def test_chart_pending_fails(self):
        self.assertProblem(SECTION.replace("2.1 辦里民工作坊 :", "2.1 辦工作坊【待補：場次】 :"), "the chart must not hold 【待補】 items")


def make_copy(root):
    """Copy the shared files, the issue folders and the cross-issue folder
    into root/analysis. Return that dir."""
    out = os.path.join(root, "analysis")
    for name in SHARED:
        os.makedirs(os.path.join(out, os.path.dirname(name)), exist_ok=True)
        shutil.copy(os.path.join(ANALYSIS, name), os.path.join(out, name))
    for folder in sorted(os.listdir(ANALYSIS)):
        if folder == "cross-issue" or (folder != "0-template" and os.path.isfile(os.path.join(ANALYSIS, folder, "issue-analysis.md"))):
            shutil.copytree(os.path.join(ANALYSIS, folder), os.path.join(out, folder))
    return out


def read_issue(analysis_dir):
    with open(os.path.join(analysis_dir, ISSUE, "issue-analysis.md"), encoding="utf-8") as f:
        return f.read()


def write_issue(analysis_dir, text):
    with open(os.path.join(analysis_dir, ISSUE, "issue-analysis.md"), "w", encoding="utf-8") as f:
        f.write(text)


class CheckWbsTest(unittest.TestCase):
    """check_analysis.py and check_cross_issue.py on a copy (#2 is in the new format)."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = make_copy(self._tmp.name)
        self.md = os.path.join(self.dir, ISSUE, "issue-analysis.md")
        self.text = read_issue(self.dir)

    def tearDown(self):
        self._tmp.cleanup()

    def write(self, text):
        write_issue(self.dir, text)

    def run_script(self, *args):
        p = subprocess.run([sys.executable, "-I", *args], capture_output=True, text=True)
        return p.returncode, p.stdout + p.stderr

    def check(self):
        self.run_script(os.path.join(SCRIPTS, "update_dates.py"), self.dir)
        return self.run_script(os.path.join(SCRIPTS, "check_analysis.py"), self.md, os.path.join(self.dir, ISSUE, "user-stories.csv"))

    def test_new_format_passes(self):
        code, out = self.check()
        self.assertEqual(code, 0, out)
        code, out = self.run_script(os.path.join(SCRIPTS, "check_cross_issue.py"), os.path.join(self.dir, "cross-issue", "cross-issue-analysis.md"))
        self.assertEqual(code, 0, out)

    def test_mixed_formats_fail(self):
        # S1 goes back to the 執行步驟 row; the others stay in the new format.
        self.write(to_steps(self.text, "S1"))
        code, out = self.check()
        self.assertEqual(code, 1, out)
        self.assertIn("步驟 7 #2: one file must use one format; new format (work breakdown table and chart): 解法 S2、S3、S4、S5; old format (執行步驟 row): 解法 S1", out)

    def test_steps_row_in_new_format_fails(self):
        text = self.text
        start = text.index("### 7.4 解法 S4：")
        cost = text.index("| 成本 |", start)
        text = text[:cost] + "| 執行步驟 | `[AI模擬]` 先試辦 |\n" + text[cost:]
        self.write(text)
        code, out = self.check()
        self.assertEqual(code, 1, out)
        self.assertIn("步驟 7 #2 解法 S4: unknown row 「執行步驟」 in the 執行計畫 table (the rows are: 主責單位、需要的資料／API／資源、成本)", out)

    def test_problems_are_reported_by_solution(self):
        text = with_fixture(self.text, "S4")
        start = text.index("### 7.4 解法 S4：")
        cost = text.index("時間：約 6–9 個月", start)
        text = text[:cost] + "時間：約 6 個月" + text[cost + len("時間：約 6–9 個月"):]
        i = text.index("| 第 1–2 個月 |", start)
        text = text[:i] + "| 2026-01 |" + text[i + len("| 第 1–2 個月 |"):]
        self.write(text)
        code, out = self.check()
        self.assertEqual(code, 1, out)
        self.assertIn("步驟 7 #2 解法 S4: 成本: no 「時間」 range; write it like 「時間：約 6–9 個月」", out)
        self.assertIn("步驟 7 #2 解法 S4: work breakdown row 「1」: 期間 must be 「第 n 個月」 or 「第 n–m 個月」", out)
        self.assertNotIn("解法 S3:", out)

    def test_wbs_in_cross_issue_fails(self):
        # 4.5 keeps the old format until the rollout.
        path = os.path.join(self.dir, "cross-issue", "cross-issue-analysis.md")
        with open(path, encoding="utf-8") as f:
            text = f.read()
        i = text.index("| 執行步驟 |", text.index("### 4.5.1 "))
        end = text.index("\n", i) + 1
        with open(path, "w", encoding="utf-8") as f:
            f.write(text[:end] + "\n" + WBS + text[end:])
        code, out = self.run_script(os.path.join(SCRIPTS, "check_cross_issue.py"), path)
        self.assertEqual(code, 1, out)
        self.assertIn("unknown table 「編號 | 工作項目 | 主責單位 | 期間 | 人天」", out)


class BuildWbsTest(unittest.TestCase):
    """build_json.py on a copy where #2 解法 S4 has the small fixture."""

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.dir = make_copy(cls._tmp.name)
        write_issue(cls.dir, with_fixture(read_issue(cls.dir), "S4"))
        cls.out = os.path.join(cls._tmp.name, "out")
        p = subprocess.run([sys.executable, "-I", os.path.join(SCRIPTS, "build_json.py"), cls.dir, cls.out], capture_output=True, text=True)
        if p.returncode != 0:
            raise AssertionError(p.stdout + p.stderr)
        with open(os.path.join(cls.out, "issues", f"{ISSUE}.json"), encoding="utf-8") as f:
            cls.issue = json.load(f)
        with open(os.path.join(cls.out, "issues", "1-trees.json"), encoding="utf-8") as f:
            cls.old = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_plan_has_no_steps(self):
        for s in self.issue["solutions"]:
            self.assertEqual(list(s["plan"]), ["owner", "resources", "cost"], s["id"])
        cost = self.issue["solutions"][3]["plan"]["cost"]
        self.assertEqual([p["tag"] for p in cost], ["AI模擬", "AI模擬"])
        self.assertEqual(cost[1]["text"], COST.replace("`[AI模擬]` ", ""))

    def test_schedule(self):
        s = self.issue["solutions"][3]
        self.assertEqual(s["id"], "S4")
        rows = s["schedule"]["rows"]
        self.assertEqual([(r["id"], r["level"]) for r in rows], [("1", 1), ("1.1", 2), ("1.2", 2), ("2", 1), ("2.1", 2)])
        self.assertEqual(rows[0], {"id": "1", "level": 1, "item": {"text": "準備：訂好流程與分工", "tag": "AI模擬", "pending": False},
                                   "owner": "環保局", "period": "第 1–2 個月", "days": "約 20–40"})
        self.assertEqual(rows[2]["days"], "【待補：人力估計】")
        self.assertEqual(s["schedule"]["gantt"], GANTT.split("\n", 1)[1].rsplit("```", 1)[0].rstrip("\n"))
        self.assertEqual(list(s["schedule"]), ["rows", "gantt"])

    def test_schedule_pending(self):
        s = self.issue["solutions"][3]
        item = {"section": "7.4 解法 S4：參與式選址流程", "text": "【待補：人力估計】", "context": "工作分解 1.2：選出試點的里"}
        self.assertIn(item, s["pending"])
        self.assertIn(item, self.issue["pending"])
        self.assertIn({"section": "7.4 解法 S4：參與式選址流程", "text": "【待補：專業人士確認】", "context": "成本"}, s["pending"])

    def test_old_format_unchanged(self):
        for s in self.old["solutions"]:
            self.assertEqual(list(s["plan"]), ["owner", "resources", "cost", "steps"], s["id"])
            self.assertIsNone(s["schedule"], s["id"])

    def test_update_dates_reads_the_new_format(self):
        p = subprocess.run([sys.executable, "-I", os.path.join(SCRIPTS, "update_dates.py"), self.dir], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)


if __name__ == "__main__":
    unittest.main()
