"""Tests for analysis/scripts/build_flat.py (the flat files in <out>/flat/).

The tests copy the issue folders, the shared files and the cross-issue folder
from the working tree into a temp dir, run build_json.py and then
build_flat.py there as subprocesses, and read the files.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import csv, importlib.util, json, os, re, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ANALYSIS, "scripts")
FLAT = os.path.join(SCRIPTS, "build_flat.py")
TAGS = {"實證", "AI整理", "AI模擬", "待補"}

# The link columns: column -> the files its IDs must be in. A need ID can be
# an N group or a story of its own, and both are rows of needs. In the
# cross-issue files a need can also be an X-N group.
LINKS = {
    "issue-stakeholders": {"issue": ["issues"], "stakeholder": ["stakeholders"]},
    "stakeholders": {"issues": ["issues"], "moved_to": ["stakeholders"]},
    "issues": {"spaces": ["space-types"]},
    "stories": {"issue": ["issues"], "stakeholder": ["stakeholders"], "want_group": ["wants"], "need": ["needs"]},
    "wants": {"issue": ["issues"], "stories": ["stories"]},
    "needs": {"issue": ["issues"], "stories": ["stories"]},
    "conflicts": {"issue": ["issues"], "stories_a": ["stories"], "stories_b": ["stories"],
                  "needs_a": ["needs"], "needs_b": ["needs"], "way_out_solutions": ["solutions"]},
    "solutions": {"issue": ["issues"], "spaces": ["space-types"], "needs_must": ["needs"],
                  "needs_should_could": ["needs"], "stories": ["stories"]},
    "cross-need-groups": {"needs": ["needs"], "stories": ["stories"], "stakeholders": ["stakeholders"]},
    "cross-conflicts": {"issue_conflicts": ["conflicts"], "stories_a": ["stories"], "stories_b": ["stories"],
                        "needs_a": ["needs", "cross-need-groups"], "needs_b": ["needs", "cross-need-groups"],
                        "way_out_solutions": ["cross-solutions"]},
    "cross-solutions": {"parts": ["solutions"], "spaces": ["space-types"], "needs_must": ["needs", "cross-need-groups"],
                        "needs_should_could": ["needs", "cross-need-groups"], "cross_need_groups": ["cross-need-groups"]},
    "space-types": {},
}


def load_module():
    spec = importlib.util.spec_from_file_location("build_flat", FLAT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def make_copy(root):
    """Copy the shared files, the issue folders and the cross-issue folder
    into root/analysis. The cross-issue file links to two docs, and
    build_json.py checks that they exist. method.md is copied. The copy of
    human-inputs.md is an empty file: its content is not needed."""
    d = os.path.join(root, "analysis")
    shutil.copytree(os.path.join(ANALYSIS, "data"), os.path.join(d, "data"))
    os.makedirs(os.path.join(d, "docs"))
    shutil.copy(os.path.join(ANALYSIS, "docs", "method.md"), os.path.join(d, "docs", "method.md"))
    open(os.path.join(d, "docs", "human-inputs.md"), "w").close()
    for n in os.listdir(ANALYSIS):
        if os.path.isfile(os.path.join(ANALYSIS, n, "issue-analysis.md")) or n == "cross-issue":
            shutil.copytree(os.path.join(ANALYSIS, n), os.path.join(d, n))
    return d


def run(script, *args):
    p = subprocess.run([sys.executable, "-I", os.path.join(SCRIPTS, script), *args], capture_output=True, text=True)
    if p.returncode != 0:
        raise AssertionError(f"{script} failed ({p.returncode}): {p.stdout}{p.stderr}")


class FlatFilesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_module()
        cls._tmp = tempfile.TemporaryDirectory()
        src = make_copy(cls._tmp.name)
        cls.out = os.path.join(cls._tmp.name, "out")
        run("build_json.py", src, cls.out)
        run("build_flat.py", cls.out)
        cls.flat = os.path.join(cls.out, "flat")
        cls.json = {}
        cls.csv = {}
        for t in cls.mod.TYPES:
            with open(os.path.join(cls.flat, f"{t}.json"), encoding="utf-8") as f:
                cls.json[t] = json.load(f)
            with open(os.path.join(cls.flat, f"{t}.csv"), encoding="utf-8", newline="") as f:
                cls.csv[t] = f.read()
        with open(os.path.join(cls.out, "index.json"), encoding="utf-8") as f:
            cls.index = json.load(f)
        cls.issues = {}
        for i in cls.index["issues"]:
            if i["available"]:
                with open(os.path.join(cls.out, "issues", f"{i['folder']}.json"), encoding="utf-8") as f:
                    cls.issues[i["number"]] = json.load(f)
        with open(os.path.join(cls.out, "cross-issue.json"), encoding="utf-8") as f:
            cls.cross = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_every_type_has_a_csv_and_a_json_file(self):
        self.assertEqual(set(LINKS), set(self.mod.TYPES))
        self.assertEqual(sorted(os.listdir(self.flat)),
                         sorted([f"{t}.csv" for t in self.mod.TYPES] + [f"{t}.json" for t in self.mod.TYPES]))
        for t in self.mod.TYPES:
            self.assertTrue(self.json[t], t)

    def test_csv_has_a_bom_and_the_same_rows_and_columns_as_the_json(self):
        for t in self.mod.TYPES:
            with self.subTest(t):
                self.assertTrue(self.csv[t].startswith("﻿"))
                rows = list(csv.DictReader(self.csv[t][1:].splitlines()))
                self.assertEqual(len(rows), len(self.json[t]))
                self.assertEqual(list(rows[0]), list(self.json[t][0]))
                for r, j in zip(rows, self.json[t]):
                    self.assertEqual(r["id"], str(j["id"]))

    def test_csv_joins_a_list_with_spaces(self):
        rows = list(csv.DictReader(self.csv["solutions"][1:].splitlines()))
        a = next(r for r in rows if r["id"] == "2-A")
        self.assertEqual(a["needs_must"].split(" ")[0], "2-N01")
        self.assertEqual(a["issue"], "2")
        self.assertEqual(a["local_id"], "A")

    def test_ids_are_unique(self):
        for t in self.mod.TYPES:
            ids = [r["id"] for r in self.json[t]]
            self.assertEqual(len(ids), len(set(ids)), t)

    def test_every_link_points_to_a_row(self):
        ids = {t: {r["id"] for r in self.json[t]} for t in self.mod.TYPES}
        checked = 0
        for t, links in LINKS.items():
            for col, targets in links.items():
                known = set().union(*(ids[x] for x in targets))
                for row in self.json[t]:
                    values = row[col] if isinstance(row[col], list) else [row[col]]
                    for v in values:
                        if v is None:
                            continue
                        checked += 1
                        self.assertIn(v, known, f"{t} {row['id']} {col}")
        self.assertGreater(checked, 3000)

    def test_tags_are_valid(self):
        for t in self.mod.TYPES:
            for row in self.json[t]:
                for col, v in row.items():
                    if col.endswith("_tag"):
                        self.assertIn(v, TAGS | {None}, f"{t} {row['id']} {col}")
                        self.assertIn(col[:-4], row, f"{t} {col} has no text column")

    def test_a_pending_cell_has_the_tag_待補(self):
        self.assertEqual(self.mod.cell_tag({"text": "【待補：x】", "tag": None, "pending": True}), "待補")
        self.assertIsNone(self.mod.cell_tag({"text": "", "tag": None, "pending": False}))
        self.assertEqual(self.mod.cell_tag({"text": "x", "tag": "實證", "pending": False}), "實證")

    def test_row_counts_match_the_issue_json(self):
        counts = {
            "issue-stakeholders": "stakeholders", "stories": "stories", "wants": "groups",
            "needs": "needs", "conflicts": "conflicts", "solutions": "solutions",
        }
        for t, key in counts.items():
            with self.subTest(t):
                for n, issue in self.issues.items():
                    rows = [r for r in self.json[t] if r["issue"] == n]
                    self.assertEqual(len(rows), len(issue[key]), f"#{n}")
                self.assertEqual(len(self.json[t]), sum(len(i[key]) for i in self.issues.values()))
        self.assertEqual(len(self.json["issues"]), len(self.index["issues"]))
        self.assertEqual(len(self.json["stakeholders"]), len(self.index["stakeholders"]))
        self.assertEqual(len(self.json["space-types"]), len(self.index["spaceTypes"]))
        self.assertEqual(len(self.json["cross-need-groups"]), len(self.cross["needGroups"]))
        self.assertEqual(len(self.json["cross-conflicts"]), len(self.cross["conflicts"]))
        self.assertEqual(len(self.json["cross-solutions"]), len(self.cross["solutions"]))

    def test_global_id_has_the_issue_number_and_the_local_id(self):
        for t in ("stories", "wants", "needs", "conflicts", "solutions"):
            for row in self.json[t]:
                self.assertEqual(row["id"], f"{row['issue']}-{row['local_id']}")

    def test_a_story_keeps_its_tags_and_dates(self):
        story = next(r for r in self.json["stories"] if r["id"] == "2-O01-US01")
        src = next(s for s in self.issues[2]["stories"] if s["id"] == "O01-US01")
        self.assertEqual(story["want"], src["want"]["text"])
        self.assertEqual(story["want_tag"], src["want"]["tag"])
        self.assertEqual(story["need"], f"2-{src['needGroup']}")
        self.assertEqual(story["added"], src["added"])
        self.assertEqual(story["updated"], src["updated"])

    def test_the_app_lists_the_same_types_in_the_same_order(self):
        # FLAT_TYPES in app/src/lib/dataFiles.ts makes the links on #/about.
        path = os.path.join(os.path.dirname(ANALYSIS), "app", "src", "lib", "dataFiles.ts")
        with open(path, encoding="utf-8") as f:
            text = f.read()
        block = text.split("export const FLAT_TYPES = [", 1)[1].split("]", 1)[0]
        self.assertEqual(tuple(re.findall(r"'([a-z-]+)'", block)), self.mod.TYPES)

    def test_every_story_has_a_need(self):
        for row in self.json["stories"]:
            self.assertIsNotNone(row["need"], row["id"])


if __name__ == "__main__":
    unittest.main()
