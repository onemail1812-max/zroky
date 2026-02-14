import tempfile
import importlib.util
import unittest
from pathlib import Path


def _load_secret_scan_module():
    root = Path(__file__).resolve().parents[3]
    module_path = root / "scripts" / "secret_scan.py"
    spec = importlib.util.spec_from_file_location("secret_scan", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SecretScanTests(unittest.TestCase):
    def test_secret_scan_detects_sk_or(self):
        scanner = _load_secret_scan_module()
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "leak.txt"
            secret = "sk" + "-or-" + "v1-" + "abcdef1234567890"
            path.write_text(f"api_key={secret}", encoding="utf-8")
            findings = scanner.scan_path(Path(tmpdir))
            self.assertTrue(findings, "Expected secret scan to find sk-or leak")

    def test_secret_scan_clean_passes(self):
        scanner = _load_secret_scan_module()
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "clean.txt"
            path.write_text("no secrets here", encoding="utf-8")
            findings = scanner.scan_path(Path(tmpdir))
            self.assertEqual(findings, [])


if __name__ == "__main__":
    unittest.main()
