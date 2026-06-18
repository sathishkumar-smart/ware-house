import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("warehouse", "0002_multilocation_roles_india"),
    ]

    operations = [
        migrations.CreateModel(
            name="SystemSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("app_name", models.CharField(default="Wareflow", max_length=60)),
                ("app_subtitle", models.CharField(default="Inventory OS", max_length=80)),
                ("logo_url", models.TextField(blank=True, help_text="URL or base64 data URI for the logo image")),
                ("primary_color", models.CharField(default="#173a2c", max_length=7)),
                ("accent_color", models.CharField(default="#d4932f", max_length=7)),
                ("default_dark_mode", models.BooleanField(default=False)),
                ("whatsapp_enabled", models.BooleanField(default=False)),
                ("whatsapp_account_sid", models.CharField(blank=True, max_length=200)),
                ("whatsapp_auth_token", models.CharField(blank=True, max_length=200)),
                ("whatsapp_from_number", models.CharField(blank=True, help_text="Twilio WhatsApp number e.g. +14155238886", max_length=20)),
                ("alert_email", models.EmailField(blank=True, max_length=254)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="settings_updates",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "System settings",
                "verbose_name_plural": "System settings",
            },
        ),
    ]
