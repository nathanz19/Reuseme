#!/usr/bin/env bash
# Subagent model policy:
#   Tier 0 — composer-2.5 (default, no marker)
#   Tier 1 — claude-sonnet-5-5* (requires ESCALATE_SONNET or [tier:sonnet] in task text)
#   Tier 2 — claude-opus-5-5* (requires ESCALATE_OPUS or [tier:opus] in task text)
# Used by subagentStart and preToolUse (Task).

set -euo pipefail

input=$(cat)

export HOOK_INPUT="$input"

python3 - <<'PY'
import json
import os

POLICY_HINT = (
    "Model tiers: composer-2.5 (default); "
    "claude-sonnet-5-5-high with ESCALATE_SONNET or [tier:sonnet]; "
    "claude-opus-5-5-medium with ESCALATE_OPUS or [tier:opus] after Sonnet if needed."
)

SONNET_MARKERS = ("escalate_sonnet", "[tier:sonnet]", "tier:sonnet")
OPUS_MARKERS = ("escalate_opus", "[tier:opus]", "tier:opus")


def normalize(model: str) -> str:
    return (model or "").strip().lower()


def classify_model(model: str) -> str:
    m = normalize(model)
    if not m:
        return "inherit"
    if m.startswith("composer-2.5"):
        return "composer"
    if m.startswith("claude-sonnet-5-5") or "sonnet-5-5" in m:
        return "sonnet"
    if m.startswith("claude-opus-5-5"):
        return "opus"
    return "unknown"


def task_text(payload: dict) -> str:
    chunks: list[str] = []
    task = payload.get("task")
    if task:
        chunks.append(str(task))
    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        for key in ("prompt", "description", "task", "message"):
            value = tool_input.get(key)
            if value:
                chunks.append(str(value))
    return "\n".join(chunks).lower()


def has_marker(text: str, markers: tuple[str, ...]) -> bool:
    return any(marker in text for marker in markers)


def tier_allowed(tier: str, text: str) -> tuple[bool, str]:
    if tier in ("inherit", "composer"):
        return True, ""
    if tier == "sonnet":
        if has_marker(text, SONNET_MARKERS):
            return True, ""
        return (
            False,
            "Sonnet tier blocked: add ESCALATE_SONNET or [tier:sonnet] to the Task prompt.",
        )
    if tier == "opus":
        if has_marker(text, OPUS_MARKERS):
            return True, ""
        return (
            False,
            "Opus tier blocked: add ESCALATE_OPUS or [tier:opus] to the Task prompt "
            "(escalate to Sonnet first unless Sonnet already failed).",
        )
    return False, "Model is not on the project allowlist."


def extract_model(payload: dict) -> str:
    event = payload.get("hook_event_name") or ""
    if event == "subagentStart" or payload.get("subagent_model"):
        return payload.get("subagent_model") or ""
    if payload.get("tool_name") == "Task":
        tool_input = payload.get("tool_input") or {}
        if isinstance(tool_input, dict):
            return (
                tool_input.get("model")
                or tool_input.get("subagent_model")
                or ""
            )
    return ""


def main() -> None:
    try:
        payload = json.loads(os.environ.get("HOOK_INPUT") or "")
    except json.JSONDecodeError:
        print(
            json.dumps(
                {
                    "permission": "deny",
                    "user_message": "Model allowlist hook received invalid JSON.",
                }
            )
        )
        return

    model = extract_model(payload)
    tier = classify_model(model)
    text = task_text(payload)
    ok, reason = tier_allowed(tier, text)

    if ok:
        print(json.dumps({"permission": "allow"}))
        return

    event = payload.get("hook_event_name") or ""
    denied = normalize(model) or "(unspecified)"
    user_message = (
        f"Subagent model '{denied}' blocked ({reason}) {POLICY_HINT}"
    )
    agent_message = (
        f"{user_message} Use composer-2.5 by default. "
        "For tier 1, retry with claude-sonnet-5-5-high and ESCALATE_SONNET in the prompt. "
        "For tier 2, retry with claude-opus-5-5-medium and ESCALATE_OPUS in the prompt."
    )

    out: dict = {"permission": "deny", "user_message": user_message}
    if event != "subagentStart":
        out["agent_message"] = agent_message
    print(json.dumps(out))


main()
PY
