#!/usr/bin/env python
"""
Secret scan utility to block OpenRouter key leaks (OpenRouter key prefix).

Usage:
  python scripts/secret_scan.py [path]
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Iterable, List, Tuple


_PREFIX = "sk" + "-or-"
PATTERNS = [
    re.compile(_PREFIX + r"[A-Za-z0-9-]{10,}"),
]

IGNORE_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    ".next",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "dist",
    "build",
}


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_dir():
            if path.name in IGNORE_DIRS:
                # Skip entire directory tree
                continue
            continue
        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        yield path


def scan_text(text: str, path: Path) -> List[Tuple[str, int, str]]:
    findings: List[Tuple[str, int, str]] = []
    for idx, line in enumerate(text.splitlines(), start=1):
        for pattern in PATTERNS:
            if pattern.search(line):
                findings.append((str(path), idx, line.strip()))
    return findings


def scan_path(root: Path) -> List[Tuple[str, int, str]]:
    findings: List[Tuple[str, int, str]] = []
    for path in iter_files(root):
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        findings.extend(scan_text(content, path))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan for leaked OpenRouter keys.")
    parser.add_argument("path", nargs="?", default=".", help="Root path to scan")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    findings = scan_path(root)

    if findings:
        print("Secret scan failed: potential sk-or leak detected.")
        for file_path, line_no, line in findings:
            print(f"- {file_path}:{line_no}: {line}")
        return 1

    print("Secret scan passed: no sk-or leaks found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
