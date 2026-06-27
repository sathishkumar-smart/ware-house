"""OTP generation, delivery (email + SMS), and verification."""
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from graphql import GraphQLError

from warehouse.models import OTPCode, SystemSettings

User = get_user_model()


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _send_email_otp(user, code: str, purpose: str, cfg: SystemSettings):
    subject = "Your login OTP" if purpose == OTPCode.Purpose.LOGIN else "Your password reset OTP"
    body = (
        f"Hello {user.username},\n\n"
        f"Your OTP for {purpose.lower().replace('_', ' ')} is: {code}\n\n"
        f"This code is valid for {cfg.otp_expiry_minutes} minutes.\n\n"
        "If you did not request this, please ignore this email."
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=cfg.alert_email or "noreply@garmentflow.app",
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception:
        return False


def _send_sms_otp(user, code: str, purpose: str, cfg: SystemSettings):
    if not cfg.sms_enabled or not cfg.twilio_account_sid:
        return False
    try:
        from twilio.rest import Client
        client = Client(cfg.twilio_account_sid, cfg.twilio_auth_token)
        from warehouse.models import EmployeeProfile
        try:
            phone = EmployeeProfile.objects.get(user=user).phone
        except EmployeeProfile.DoesNotExist:
            return False
        if not phone:
            return False
        client.messages.create(
            body=f"Your GarmentFlow OTP: {code} (valid {cfg.otp_expiry_minutes} min)",
            from_=cfg.twilio_from_number,
            to=phone,
        )
        return True
    except Exception:
        return False


def request_otp(*, username: str, purpose: str, channel: str) -> dict:
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist as exc:
        raise GraphQLError("User not found.") from exc

    cfg = SystemSettings.load()

    # Rate-limit: max 3 valid unused OTPs per user per hour
    recent = OTPCode.objects.filter(
        user=user, purpose=purpose, used=False,
        created_at__gte=timezone.now() - timedelta(hours=1),
    ).count()
    if recent >= 3:
        raise GraphQLError("Too many OTP requests. Please wait before trying again.")

    code = _generate_code()
    expiry = timezone.now() + timedelta(minutes=cfg.otp_expiry_minutes)

    otp = OTPCode.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        channel=channel,
        expires_at=expiry,
    )

    email_sent, sms_sent = False, False
    if channel in (OTPCode.Channel.EMAIL, "BOTH"):
        email_sent = _send_email_otp(user, code, purpose, cfg)
    if channel in (OTPCode.Channel.SMS, "BOTH"):
        sms_sent = _send_sms_otp(user, code, purpose, cfg)

    return {"otp_id": otp.pk, "email_sent": email_sent, "sms_sent": sms_sent}


def verify_otp_and_login(*, username: str, code: str, purpose: str):
    """Verify OTP and return the user (caller creates JWT token)."""
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist as exc:
        raise GraphQLError("Invalid credentials.") from exc

    otp = (
        OTPCode.objects
        .filter(user=user, purpose=purpose, used=False)
        .order_by("-created_at")
        .first()
    )
    if not otp or not otp.is_valid:
        raise GraphQLError("OTP has expired or is invalid. Please request a new one.")

    otp.attempts += 1
    if otp.code != code:
        otp.save(update_fields=["attempts"])
        raise GraphQLError("Incorrect OTP.")

    otp.used = True
    otp.save(update_fields=["used", "attempts"])
    return user
