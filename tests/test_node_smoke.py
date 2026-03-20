from __future__ import annotations

import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent


def run_node_script(script_name: str) -> None:
    # 统一通过 pytest 包装现有 Node 烟雾脚本，避免仓库测试入口分裂。
    completed = subprocess.run(
        ["node", f"tests/{script_name}"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
        encoding="utf-8",
    )
    if completed.returncode != 0:
        raise AssertionError(
            f"node tests/{script_name} 失败\n"
            f"stdout:\n{completed.stdout}\n"
            f"stderr:\n{completed.stderr}"
        )


def test_story_smoke() -> None:
    run_node_script("story-smoke.js")


def test_ui_contract_smoke() -> None:
    run_node_script("ui-contract-smoke.js")
