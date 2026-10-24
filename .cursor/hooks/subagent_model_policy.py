"""Shared subagent model policy for Cursor hooks."""

from __future__ import annotations

COMPOSER_SLUG = "composer-2.5"
COMPOSER_FAST_SLUG = "composer-2.5-fast"
SONNET_SLUG = "claude-sonnet-5-5-high"
OPUS_SLUG = "claude-opus-5-5-medium"

SONNET_MARKERS = ("escalate_sonnet", "[tier:sonnet]", "tier:sonnet")
OPUS_MARKERS = ("escalate_opus", "[tier:opus]", "tier:opus")


def normalize(model: str) -> str:
    return (model or "").strip().lower()


def is_composer_fast_slug(model: str) -> bool:
    m = normalize(model)
    return m == COMPOSER_FAST_SLUG or m.startswith("composer-2.5-fast[")


def is_composer_slug(model: str) -> bool:
    """Only the non-fast Composer 2.5 slug (and param variants on that slug)."""
    m = normalize(model)
    if is_composer_fast_slug(model):
        return False
    return m == COMPOSER_SLUG or m.startswith("composer-2.5[")


def is_sonnet_5_5_slug(model: str) -> bool:
    m = normalize(model)
    return m.startswith("claude-sonnet-5-5") or "sonnet-5-5" in m


def is_legacy_sonnet_slug(model: str) -> bool:
    """Sonnet 4.x and other pre-5.5 slugs the agent may still pick."""
    m = normalize(model)
    if not m.startswith("claude-sonnet"):
        return False
    if is_sonnet_5_5_slug(model):
        return False
    return True


def is_opus_5_5_slug(model: str) -> bool:
    m = normalize(model)
    return m.startswith("claude-opus-5-5")


def is_legacy_opus_slug(model: str) -> bool:
    m = normalize(model)
    if not m.startswith("claude-opus"):
        return False
    return not is_opus_5_5_slug(model)


def classify_model(model: str) -> str:
    m = normalize(model)
    if not m:
        return "inherit"
    if is_composer_fast_slug(model):
        return "composer_fast"
    if m.startswith("composer-2.5"):
        return "composer"
    if is_sonnet_5_5_slug(model):
        return "sonnet"
    if is_legacy_sonnet_slug(model):
        return "sonnet_legacy"
    if is_opus_5_5_slug(model):
        return "opus"
    if is_legacy_opus_slug(model):
        return "opus_legacy"
    return "unknown"


def task_text_from_payload(payload: dict) -> str:
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


def resolve_task_model(requested: str, text: str) -> str:
    """Model slug to enforce on Task / default subagent spawn."""
    tier = classify_model(requested)
    if tier in ("inherit", "unknown", "composer_fast"):
        return COMPOSER_SLUG
    if tier == "composer":
        return COMPOSER_SLUG
    if tier == "sonnet" and has_marker(text, SONNET_MARKERS):
        return normalize(requested) or SONNET_SLUG
    if tier == "sonnet_legacy" and has_marker(text, SONNET_MARKERS):
        return SONNET_SLUG
    if tier == "opus" and has_marker(text, OPUS_MARKERS):
        return normalize(requested) or OPUS_SLUG
    if tier == "opus_legacy" and has_marker(text, OPUS_MARKERS):
        return OPUS_SLUG
    return COMPOSER_SLUG


def spawn_allowed(subagent_model: str, text: str) -> bool:
    """subagentStart backstop: allow only resolved policy models."""
    actual = normalize(subagent_model)
    if not actual:
        return False
    if is_composer_fast_slug(subagent_model):
        return False
    if is_legacy_sonnet_slug(subagent_model) or is_legacy_opus_slug(subagent_model):
        return False
    resolved = resolve_task_model(subagent_model, text)
    if is_composer_slug(subagent_model):
        return resolved == COMPOSER_SLUG
    if is_sonnet_5_5_slug(subagent_model):
        return resolved.startswith("claude-sonnet-5-5") and has_marker(
            text, SONNET_MARKERS
        )
    if is_opus_5_5_slug(subagent_model):
        return resolved.startswith("claude-opus-5-5") and has_marker(
            text, OPUS_MARKERS
        )
    return False
