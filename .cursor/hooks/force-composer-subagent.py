#!/usr/bin/env python3
"""preToolUse (Task): rewrite model so unset/inherited slugs default to composer-2.5."""

import json
import sys
from pathlib import Path

# Allow importing subagent_model_policy when run as a script from .cursor/hooks/
sys.path.insert(0, str(Path(__file__).resolve().parent))

from subagent_model_policy import (  # noqa: E402
    normalize,
    resolve_task_model,
    task_text_from_payload,
)


def main() -> None:
    payload = json.load(sys.stdin)
    tool_input = dict(payload.get("tool_input") or {})
    requested = tool_input.get("model") or ""
    text = task_text_from_payload(payload)
    target = resolve_task_model(requested, text)

    if normalize(requested) == normalize(target):
        json.dump({"permission": "allow"}, sys.stdout)
        return

    tool_input["model"] = target
    json.dump(
        {"permission": "allow", "updated_input": tool_input},
        sys.stdout,
    )


if __name__ == "__main__":
    main()
