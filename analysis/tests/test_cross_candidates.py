"""Tests for analysis/scripts/cross_candidates.py (rule R3, the candidate list).

The tests use small in-memory inputs. They do not read any file.
Run from the repo root:
python3 -I -m unittest discover -s analysis/tests -t . -p 'test_cross_candidates.py' -v
"""
import importlib.util, os, sys, tempfile, unittest

SCRIPTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")


def load_module():
    sys.path.insert(0, SCRIPTS)
    spec = importlib.util.spec_from_file_location("cross_candidates", os.path.join(SCRIPTS, "cross_candidates.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


cc = load_module()


def sol(code, types, domains=(), spaces=(), needs=(), stories=(), should_could=()):
    """One issue solution with only the fields the rule reads. needs are
    the Must needs, should_could the Should / Could needs."""
    return {"id": code, "solutionTypes": list(types), "domains": list(domains), "spaces": list(spaces),
            "stories": list(stories), "needs": {"must": list(needs), "shouldCould": list(should_could)}}


def issue(num, *solutions):
    return {"number": num, "solutions": list(solutions)}


def group(gid, *refs):
    """An X-N group. refs are (issue, need ID) pairs."""
    return {"id": gid, "needs": [{"issue": n, "id": i} for n, i in refs], "stories": []}


def cross(groups=(), repeated=(), solutions=()):
    return {"needGroups": list(groups), "repeatedNeeds": list(repeated), "solutions": list(solutions)}


def pairs(rows):
    return [f"{r['a']}~{r['b']}" for r in rows]


class CandidateTest(unittest.TestCase):
    def test_same_issue_is_never_a_pair(self):
        issues = [issue(1, sol("S1", ["facility"], ["environment"], needs=["N01"]),
                        sol("S2", ["facility"], ["environment"], needs=["N01"]))]
        c = cross([group("X-N1", (1, "N01"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_type_domain_and_need_make_one_pair_lower_issue_first(self):
        # The higher issue comes first in the input on purpose.
        issues = [issue(3, sol("S1", ["facility"], ["environment"], needs=["N02"])),
                  issue(1, sol("S4", ["facility", "planning"], ["environment"], needs=["N05"]))]
        c = cross([group("X-N2", (1, "N05"), (3, "N02"))])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["1-S4~3-S1"])
        r = rows[0]
        self.assertEqual(r["types"], ["facility"])
        self.assertEqual(r["domains"], ["environment"])
        self.assertEqual(r["spaces"], [])
        self.assertEqual(r["needs"], ["X-N2"])
        self.assertEqual(r["crossSolutions"], [])

    def test_type_and_need_without_domain_or_space_is_no_pair(self):
        issues = [issue(1, sol("S1", ["facility"], ["environment"], ["park"], needs=["N01"])),
                  issue(4, sol("S3", ["facility"], ["transport"], ["car-lane"], needs=["N03"]))]
        c = cross([group("X-N1", (1, "N01"), (4, "N03"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_platform_type_needs_no_domain_or_space(self):
        for platform in ("open-data", "intake"):
            issues = [issue(1, sol("S1", [platform], ["environment"], ["park"], needs=["N01"])),
                      issue(4, sol("S3", [platform], ["transport"], ["car-lane"], needs=["N03"]))]
            c = cross([group("X-N1", (1, "N01"), (4, "N03"))])
            self.assertEqual(pairs(cc.candidates(issues, c)), ["1-S1~4-S3"], platform)

    def test_platform_type_only_counts_when_shared(self):
        # s has open-data, t does not. The shared type is facility, so a
        # shared domain or space is needed, and there is none.
        issues = [issue(1, sol("S1", ["open-data", "facility"], ["environment"], ["park"], needs=["N01"])),
                  issue(4, sol("S3", ["facility"], ["transport"], ["car-lane"], needs=["N03"]))]
        c = cross([group("X-N1", (1, "N01"), (4, "N03"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_shared_space_without_shared_domain_is_a_pair(self):
        issues = [issue(4, sol("S5", ["facility"], ["transport"], ["car-lane", "alley"], needs=["N02"])),
                  issue(10, sol("S6", ["facility"], ["environment"], ["park", "car-lane"], needs=["N04"]))]
        c = cross([group("X-N13", (4, "N02"), (10, "N04"))])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["4-S5~10-S6"])
        self.assertEqual(rows[0]["spaces"], ["car-lane"])
        self.assertEqual(rows[0]["domains"], [])

    def test_need_in_should_could_counts(self):
        issues = [issue(1, sol("S1", ["facility"], ["environment"], should_could=["N07"])),
                  issue(2, sol("S2", ["facility"], ["environment"], should_could=["N03"]))]
        c = cross([group("X-N5", (1, "N07"), (2, "N03"))])
        self.assertEqual(pairs(cc.candidates(issues, c)), ["1-S1~2-S2"])

    def test_domain_and_need_without_shared_type_is_no_pair(self):
        issues = [issue(1, sol("S1", ["facility"], ["environment"], needs=["N01"])),
                  issue(2, sol("S2", ["planning"], ["environment"], needs=["N01"]))]
        c = cross([group("X-N1", (1, "N01"), (2, "N01"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_type_and_domain_without_shared_need_is_no_pair(self):
        issues = [issue(1, sol("S1", ["facility"], ["environment"], needs=["N01"])),
                  issue(2, sol("S2", ["facility"], ["environment"], needs=["N02"]))]
        # Each need is in a group, but not in the same group.
        c = cross([group("X-N1", (1, "N01"), (3, "N01")), group("X-N2", (2, "N02"), (3, "N02"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_need_by_story_and_by_repeated_need_row(self):
        # A solution is in a group through one of its stories too, and a 1.2
        # row counts as a shared need.
        issues = [issue(1, sol("S1", ["facility"], ["environment"], stories=["O12-US01"])),
                  issue(2, sol("S1", ["facility"], ["environment"], stories=["O12-US01", "I09-US04"]))]
        c = cross([{"id": "X-N1", "needs": [], "stories": [{"issue": 1, "id": "O12-US01"}, {"issue": 2, "id": "I09-US04"}]}],
                  [{"stakeholder": "O12", "needs": [{"issue": 1, "id": "O12-US01"}, {"issue": 2, "id": "O12-US01"}]}])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["1-S1~2-S1"])
        self.assertEqual(rows[0]["needs"], ["X-N1", "1.2 O12"])

    def test_pair_inside_a_combined_solution(self):
        issues = [issue(1, sol("S1", ["facility"], ["environment"], needs=["N01"])),
                  issue(2, sol("S1", ["facility"], ["environment"], needs=["N01"]))]
        c = cross([group("X-N1", (1, "N01"), (2, "N01"))],
                  solutions=[{"code": "X-S2", "parts": [{"issue": 1, "code": "S1"}, {"issue": 2, "code": "S1"}]},
                             {"code": "X-S1", "parts": [{"issue": 1, "code": "S1"}, {"issue": 3, "code": "S1"}]}])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["1-S1~2-S1"])
        self.assertEqual(rows[0]["crossSolutions"], ["X-S2"])

    def test_order_is_issue_number_then_solution_number(self):
        # The input is in reverse order on purpose. 10-S1 and 10-S3 are in
        # different groups, so 10-S1 ~ 2-S1 and 10-S3 ~ 12-S2 are not pairs.
        issues = [issue(12, sol("S2", ["facility"], ["transport"], needs=["N01"])),
                  issue(10, sol("S1", ["facility"], ["transport"], needs=["N01"]),
                        sol("S3", ["facility"], ["transport"], needs=["N03"])),
                  issue(3, sol("S2", ["facility"], ["transport"], needs=["N02"])),
                  issue(2, sol("S1", ["facility"], ["transport"], needs=["N02"]))]
        c = cross([group("X-N1", (10, "N01"), (12, "N01")),
                   group("X-N2", (2, "N02"), (3, "N02"), (10, "N03"))])
        rows = cc.candidates(issues, c)
        # 3-S2 ~ 10-S3 also shares X-N2.
        self.assertEqual(pairs(rows), ["2-S1~3-S2", "2-S1~10-S3", "3-S2~10-S3", "10-S1~12-S2"])
        # Same result for any input order.
        self.assertEqual(pairs(cc.candidates(list(reversed(issues)), c)), pairs(rows))

    def test_order_uses_numbers_not_text(self):
        # 12 solutions in #1 and 12 in #2, so S10, S11 and S12 exist. Text
        # order would put S10 before S2. Each pair of the same number shares
        # its own group X-N<n>, so the X-N IDs go past 10 too.
        issues = [issue(n, *[sol(f"S{k}", ["facility"], ["environment"], needs=[f"N{k:02d}"]) for k in range(12, 0, -1)])
                  for n in (2, 1)]
        groups = [group(f"X-N{k}", (1, f"N{k:02d}"), (2, f"N{k:02d}")) for k in range(12, 0, -1)]
        sols = [{"code": f"X-S{k}", "parts": [{"issue": 1, "code": f"S{k}"}, {"issue": 2, "code": f"S{k}"}]}
                for k in range(12, 0, -1)]
        rows = cc.candidates(issues, cross(groups, solutions=sols))
        self.assertEqual(pairs(rows), [f"1-S{k}~2-S{k}" for k in range(1, 13)])
        self.assertEqual([r["needs"] for r in rows], [[f"X-N{k}"] for k in range(1, 13)])
        self.assertEqual([r["crossSolutions"] for r in rows], [[f"X-S{k}"] for k in range(1, 13)])

    def test_need_and_solution_lists_use_numbers_not_text(self):
        # One pair in X-N2 and X-N10, and in X-S2 and X-S10.
        issues = [issue(1, sol("S1", ["facility"], ["environment"], needs=["N01", "N02"])),
                  issue(2, sol("S1", ["facility"], ["environment"], needs=["N01", "N02"]))]
        groups = [group("X-N10", (1, "N01"), (2, "N01")), group("X-N2", (1, "N02"), (2, "N02"))]
        both = [{"issue": 1, "code": "S1"}, {"issue": 2, "code": "S1"}]
        rows = cc.candidates(issues, cross(groups, solutions=[{"code": "X-S10", "parts": both},
                                                             {"code": "X-S2", "parts": both}]))
        self.assertEqual(rows[0]["needs"], ["X-N2", "X-N10"])
        self.assertEqual(rows[0]["crossSolutions"], ["X-S2", "X-S10"])

    def test_each_pair_once(self):
        issues = [issue(1, sol("S1", ["facility"], ["environment"], needs=["N01"])),
                  issue(2, sol("S1", ["facility"], ["environment"], needs=["N01"]))]
        c = cross([group("X-N1", (1, "N01"), (2, "N01")), group("X-N2", (1, "N01"), (2, "N01"))])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["1-S1~2-S1"])
        self.assertEqual(rows[0]["needs"], ["X-N1", "X-N2"])

    def test_csv_text(self):
        issues = [issue(1, sol("S1", ["facility", "planning"], ["environment"], ["park", "arcade"], needs=["N01"])),
                  issue(2, sol("S1", ["planning", "facility"], ["environment"], ["arcade", "park"], needs=["N01"]))]
        c = cross([group("X-N1", (1, "N01"), (2, "N01"))])
        text = cc.csv_text(cc.candidates(issues, c))
        self.assertEqual(text.splitlines(), [
            "解法甲,解法乙,共同解法類型,共同領域,共同空間類型,共同需求,已在跨議題解法",
            "1-S1,2-S1,facility、planning,environment,park、arcade,X-N1,",
        ])


class CheckModeTest(unittest.TestCase):
    def test_file_must_have_the_bom(self):
        text = cc.csv_text([])
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "candidates.csv")
            self.assertFalse(cc.file_is_current(path, text))  # no file
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(text)
            self.assertFalse(cc.file_is_current(path, text))  # no BOM
            with open(path, "w", encoding="utf-8-sig", newline="") as f:
                f.write(text)
            self.assertTrue(cc.file_is_current(path, text))
            with open(path, "w", encoding="utf-8-sig", newline="") as f:
                f.write(text + "1-S1,2-S1,,,,,\n")
            self.assertFalse(cc.file_is_current(path, text))  # other rows


if __name__ == "__main__":
    unittest.main()
