"""
In-app notification helpers. Creates DB Notification records and optionally
fires FCM push to the recipient's registered browser tokens.
"""
from django.contrib.auth import get_user_model
from warehouse.models import Notification, EmployeeProfile

User = get_user_model()


def notify_user(*, user, title: str, message: str, level: str = "INFO", link: str = "") -> Notification:
    return Notification.objects.create(
        recipient=user,
        title=title,
        message=message,
        level=level,
        link=link,
    )


def notify_managers(*, title: str, message: str, level: str = "INFO", link: str = "") -> int:
    """Send an in-app notification to all SUPER_ADMIN, ADMIN, and MANAGER users."""
    from warehouse.permissions import MANAGEMENT_ROLES
    manager_profiles = EmployeeProfile.objects.filter(role__in=MANAGEMENT_ROLES).select_related("user")
    notifications = [
        Notification(
            recipient=p.user,
            title=title,
            message=message,
            level=level,
            link=link,
        )
        for p in manager_profiles
    ]
    Notification.objects.bulk_create(notifications)
    return len(notifications)
