"""
Audit trail service — call log_action() from any service that changes data.
Keeps a lightweight append-only log of who did what to which entity.
"""
from django.contrib.auth import get_user_model
from warehouse.models import AuditLog

User = get_user_model()


def log_action(
    *,
    entity_type: str,
    entity_id: str | int,
    action: str,
    actor=None,
    detail: dict | None = None,
) -> AuditLog:
    actor_name = ""
    if actor:
        actor_name = getattr(actor, "get_full_name", lambda: "")() or actor.username
    return AuditLog.objects.create(
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        actor=actor if (actor and actor.is_authenticated) else None,
        actor_name=actor_name or "System",
        detail=detail or {},
    )
