import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from tag_results import parse_results
class TagResultsTests(unittest.TestCase):
    def test_deferred_contact_does_not_block_other_members(self):
        self.assertEqual(parse_results("verified\ta\ndeferred\tb\nverified\tc\n", ["a","b","c"]), ({"a","c"},{"b"}))
    def test_incomplete_readback_rejected(self):
        with self.assertRaises(ValueError): parse_results("verified\ta\n", ["a","b"])
    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError): parse_results("verified\ta\ndeferred\ta\n", ["a"])
    def test_unknown_rejected(self):
        with self.assertRaises(ValueError): parse_results("verified\tx\n", ["a"])
