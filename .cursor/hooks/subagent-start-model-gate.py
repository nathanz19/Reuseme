#!/usr/bin/env python3
"""subagentStart backstop: deny spawns that are not on the project model policy."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from subagent_model_policy import (  # noqa: E402
    spawn_allowed,
    task_text_from_payload,
)


def main() -> None:
    payload = json.load(sys.stdin)
    model = payload.get("subagent_model") or ""
    text = task_text_from_payload(payload)

    if spawn_allowed(model, text):
        json.dump({"permission": "allow"}, sys.stdout)
        return

    json.dump(
        {
            "permission": "deny",
            "user_message": (
                "Subagents must use composer-2.5 (not composer-2.5-fast). "
                "Sonnet tier must be claude-sonnet-5-5-high (not Sonnet 4.x). "
                "Use ESCALATE_SONNET / ESCALATE_OPUS in the Task prompt for tiered models."
            ),
        },
        sys.stdout,
    )


if __name__ == "__main__":
    main()
