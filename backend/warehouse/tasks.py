"""
Celery tasks — async and scheduled background work.
All notification sending (email OTP, WhatsApp, FCM) runs here
so mutations never block on slow external APIs.
"""
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


# ─── OTP / auth tasks ─────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_email_otp_task(self, to: str, code: str, expiry_minutes: int):
    try:
        from warehouse.services.notifications import send_email
        send_email(
            to=to,
            subject="Your GarmentFlow OTP",
            body_text=f"Your OTP is: {code}\nValid for {expiry_minutes} minutes.",
            body_html=f"<p>Your OTP is: <strong style='font-size:24px'>{code}</strong></p>"
                      f"<p style='color:#888'>Valid for {expiry_minutes} minutes.</p>",
        )
        logger.info("Email OTP sent to %s", to)
    except Exception as exc:
        logger.warning("Email OTP failed (%s), retrying…", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=15)
def send_whatsapp_otp_task(self, phone: str, code: str, expiry_minutes: int):
    try:
        from warehouse.services.notifications import send_whatsapp_text
        send_whatsapp_text(
            to=phone,
            body=f"Your GarmentFlow OTP is: *{code}*\nValid for {expiry_minutes} minutes.",
        )
        logger.info("WhatsApp OTP sent to %s", phone)
    except Exception as exc:
        logger.warning("WhatsApp OTP failed (%s), retrying…", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def send_push_task(self, user_id: int, title: str, body: str, data: dict | None = None):
    try:
        from warehouse.services.notifications import send_push_to_user
        send_push_to_user(user_id=user_id, title=title, body=body, data=data or {})
    except Exception as exc:
        logger.warning("FCM push failed for user %s: %s", user_id, exc)
        raise self.retry(exc=exc)


# ─── Scheduled tasks ──────────────────────────────────────────────────────────

@shared_task
def send_daily_low_stock_alert():
    """
    Runs daily (schedule configured via django-celery-beat admin).
    Sends an in-app notification + email to all managers if any stock is critically low.
    """
    from warehouse.models import RawClothBatch, ReadymadeStock, EmployeeProfile
    from warehouse.services.notify import notify_managers

    RAW_CRITICAL = 20    # metres
    RMD_CRITICAL = 5     # pieces

    low_raw = list(
        RawClothBatch.objects
        .filter(active=True, available_meters__gt=0, available_meters__lte=RAW_CRITICAL)
        .select_related("cloth_category", "cloth_color", "warehouse")
    )
    low_rmd = list(
        ReadymadeStock.objects
        .filter(quantity_available__gt=0, quantity_available__lte=RMD_CRITICAL)
        .select_related("item_type", "warehouse")
    )

    total = len(low_raw) + len(low_rmd)
    if total == 0:
        logger.info("Daily stock check: all levels OK")
        return

    lines = []
    for b in low_raw:
        lines.append(f"• {b.cloth_category.name} {b.cloth_color.name}: {b.available_meters:.1f}m ({b.warehouse.name})")
    for r in low_rmd:
        lines.append(f"• {r.item_type.name} {r.size or ''}: {r.quantity_available} pcs ({r.warehouse.name})")

    msg = f"{total} item(s) critically low:\n" + "\n".join(lines)
    notify_managers(
        title=f"⚠ {total} Critical Stock Alert{'s' if total > 1 else ''}",
        message=msg,
        level="CRITICAL",
        link="inventory",
    )
    logger.info("Sent daily stock alert: %d items", total)
