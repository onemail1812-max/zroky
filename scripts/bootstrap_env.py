"""Bootstrap .env files for local development."""
from __future__ import annotations

from pathlib import Path
import secrets


ROOT = Path(__file__).resolve().parent.parent
API_ENV_EXAMPLE = ROOT / "apps" / "api" / ".env.example"
API_ENV = ROOT / "apps" / "api" / ".env"
WEB_ENV_EXAMPLE = ROOT / "apps" / "web" / ".env.example"
WEB_ENV = ROOT / "apps" / "web" / ".env"


def _replace_env_value(contents: str, key: str, value: str) -> str:
    lines = contents.splitlines()
    replaced = False
    for idx, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[idx] = f"{key}={value}"
            replaced = True
            break
    if not replaced:
        lines.append(f"{key}={value}")
    return "\n".join(lines) + "\n"


def _copy_if_missing(example_path: Path, env_path: Path, post_process=None) -> None:
    if env_path.exists():
        print(f"Exists: {env_path}")
        return
    if not example_path.exists():
        raise FileNotFoundError(f"Missing example file: {example_path}")
    contents = example_path.read_text(encoding="utf-8")
    if post_process:
        contents = post_process(contents)
    env_path.write_text(contents, encoding="utf-8")
    print(f"Created: {env_path}")


def main() -> None:
    def _api_post_process(text: str) -> str:
        key = secrets.token_hex(32)
        return _replace_env_value(text, "OAUTH_ENCRYPTION_KEY", key)

    _copy_if_missing(API_ENV_EXAMPLE, API_ENV, post_process=_api_post_process)
    _copy_if_missing(WEB_ENV_EXAMPLE, WEB_ENV)


if __name__ == "__main__":
    main()
