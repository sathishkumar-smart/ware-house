"""
Notification delivery services: email (SMTP), WhatsApp (Meta Graph API), and FCM push.
Settings are read from SystemSettings.load() so admins can configure without redeploy.
"""
import json
import logging
import os

import requests
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v25.0"

# ─── helpers ──────────────────────────────────────────────────────────────────

def _normalise_phone(phone: str) -> str:
    digits = "".join(c for c in (phone or "") if c.isdigit())
    # Promote 10-digit numbers to Indian international format
    if len(digits) == 10:
        return f"91{digits}"
    return digits


# ─── email ────────────────────────────────────────────────────────────────────

def send_email(*, to: str, subject: str, body_text: str, body_html: str = "") -> bool:
    """Send an email using the SMTP settings from SystemSettings. Never raises."""
    if not to:
        return False
    try:
        from warehouse.models import SystemSettings
        cfg = SystemSettings.load()
        if not cfg.email_enabled:
            logger.debug("Email disabled in settings; skipping email to %s", to)
            return False

        from_email = cfg.smtp_from_email or cfg.smtp_user
        if not from_email:
            logger.warning("smtp_from_email not configured; skipping email to %s", to)
            return False

        from django.core.mail import get_connection
        connection = get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host=cfg.smtp_host or "localhost",
            port=cfg.smtp_port or 587,
            username=cfg.smtp_user or "",
            password=cfg.smtp_password or "",
            use_tls=bool(cfg.smtp_use_tls),
        )
        msg = EmailMultiAlternatives(
            subject=subject, body=body_text, from_email=from_email, to=[to],
            connection=connection,
        )
        if body_html:
            msg.attach_alternative(body_html, "text/html")
        msg.send(fail_silently=False)

        logger.info("Email sent to %s | subject: %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


# ─── whatsapp ─────────────────────────────────────────────────────────────────

def send_whatsapp_template(
    *,
    to: str,
    template_name: str,
    variables: list | None = None,
    components: list | None = None,
    language: str = "en_US",
) -> bool:
    """
    Send a WhatsApp Business template message via Meta Graph API.
    Reads wa_token and wa_phone_number_id from SystemSettings. Never raises.
    """
    to_digits = _normalise_phone(to)
    if not to_digits:
        logger.warning("send_whatsapp_template: empty recipient; skipping.")
        return False

    try:
        from warehouse.models import SystemSettings
        cfg = SystemSettings.load()
        if not cfg.wa_enabled:
            logger.debug("WhatsApp disabled in settings; skipping WA to %s", to_digits)
            return False

        token = cfg.wa_token.strip() if cfg.wa_token else ""
        phone_id = cfg.wa_phone_number_id.strip() if cfg.wa_phone_number_id else ""

        if not token or not phone_id:
            logger.warning("WhatsApp credentials not configured; skipping WA to %s", to_digits)
            return False

        payload_components = components or []
        if not payload_components and variables:
            payload_components = [
                {"type": "body", "parameters": [{"type": "text", "text": str(v)} for v in variables]}
            ]

        payload = {
            "messaging_product": "whatsapp",
            "to": to_digits,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
                "components": payload_components,
            },
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        api_url = f"{GRAPH_API_BASE}/{phone_id}/messages"

        response = requests.post(api_url, json=payload, headers=headers, timeout=15)
        data = response.json() if response.content else {}
        if response.ok:
            logger.info("WhatsApp sent to %s (template=%s)", to_digits, template_name)
            return True

        error = (data.get("error") or {}) if isinstance(data, dict) else {}
        code = error.get("code")

        # Retry: language fallback en_US → en
        if code == 132001 and language == "en_US":
            payload["template"]["language"]["code"] = "en"
            r2 = requests.post(api_url, json=payload, headers=headers, timeout=15)
            if r2.ok:
                logger.info("WhatsApp sent to %s (template=%s, lang=en fallback)", to_digits, template_name)
                return True

        logger.error("WhatsApp API error for %s: %s", to_digits, error)
        return False

    except Exception as exc:
        logger.error("WhatsApp request failed for %s: %s", to_digits, exc)
        return False


def send_whatsapp_text(*, to: str, body: str) -> bool:
    """Send a freeform WhatsApp text (only works within 24-hour customer-initiated window)."""
    to_digits = _normalise_phone(to)
    if not to_digits:
        return False

    try:
        from warehouse.models import SystemSettings
        cfg = SystemSettings.load()
        if not cfg.wa_enabled or not cfg.wa_token or not cfg.wa_phone_number_id:
            return False

        payload = {
            "messaging_product": "whatsapp",
            "to": to_digits,
            "type": "text",
            "text": {"body": body},
        }
        headers = {"Authorization": f"Bearer {cfg.wa_token.strip()}", "Content-Type": "application/json"}
        api_url = f"{GRAPH_API_BASE}/{cfg.wa_phone_number_id.strip()}/messages"
        r = requests.post(api_url, json=payload, headers=headers, timeout=15)
        return r.ok
    except Exception as exc:
        logger.error("send_whatsapp_text failed: %s", exc)
        return False


# ─── FCM push ─────────────────────────────────────────────────────────────────

_firebase_app = None


def _get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            _firebase_app = firebase_admin.get_app()
            return _firebase_app

        from warehouse.models import SystemSettings
        cfg = SystemSettings.load()
        sa_json = cfg.firebase_service_account_json or os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
        if not sa_json:
            logger.warning("FCM: FIREBASE_SERVICE_ACCOUNT_JSON not set — push disabled.")
            return None

        sa_dict = json.loads(sa_json)
        cred = credentials.Certificate(sa_dict)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("FCM: Firebase initialized (project=%s)", sa_dict.get("project_id"))
        return _firebase_app
    except Exception as exc:
        logger.error("FCM: Failed to initialize Firebase: %s", exc)
        return None


def send_push(*, title: str, body: str, data: dict | None = None, tokens: list[str]) -> int:
    """Send FCM push to a list of tokens. Returns success count. Never raises."""
    if not tokens:
        return 0
    app = _get_firebase_app()
    if app is None:
        return 0
    try:
        from firebase_admin import messaging

        messages = [
            messaging.Message(
                data={"title": title, "body": body, **{k: str(v) for k, v in (data or {}).items()}},
                token=token,
                webpush=messaging.WebpushConfig(headers={"TTL": "86400"}),
            )
            for token in tokens
        ]
        batch = messaging.send_each(messages)
        logger.info("FCM: sent %d/%d push(es)", batch.success_count, len(tokens))

        stale = []
        for i, resp in enumerate(batch.responses):
            if not resp.success:
                err_code = str(getattr(resp.exception, "code", ""))
                if "not-registered" in err_code or "invalid-registration-token" in err_code:
                    stale.append(tokens[i])
        if stale:
            from warehouse.models import FCMToken
            FCMToken.objects.filter(token__in=stale).delete()

        return batch.success_count
    except Exception as exc:
        logger.error("FCM: send_push failed: %s", exc)
        return 0


def send_push_to_user(*, user_id: int, title: str, body: str, data: dict | None = None) -> int:
    """Send push to all FCM tokens registered for a user."""
    try:
        from warehouse.models import FCMToken
        tokens = list(FCMToken.objects.filter(user_id=user_id).values_list("token", flat=True))
        return send_push(title=title, body=body, data=data, tokens=tokens)
    except Exception as exc:
        logger.error("FCM: send_push_to_user failed: %s", exc)
        return 0


def send_push_to_all(*, title: str, body: str, data: dict | None = None) -> int:
    """Broadcast push to all registered FCM tokens."""
    try:
        from warehouse.models import FCMToken
        tokens = list(FCMToken.objects.values_list("token", flat=True))
        return send_push(title=title, body=body, data=data, tokens=tokens)
    except Exception as exc:
        logger.error("FCM: send_push_to_all failed: %s", exc)
        return 0
