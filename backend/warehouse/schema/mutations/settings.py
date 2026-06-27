import graphene
from graphql_jwt.decorators import login_required

from warehouse.models import EmployeeProfile, SystemSettings
from warehouse.permissions import require_role
from warehouse.schema.types import SystemSettingsType


class UpdateSystemSettings(graphene.Mutation):
    class Arguments:
        app_name = graphene.String()
        app_subtitle = graphene.String()
        logo_url = graphene.String()
        primary_color = graphene.String()
        accent_color = graphene.String()
        default_dark_mode = graphene.Boolean()
        alert_email = graphene.String()
        smtp_host = graphene.String()
        smtp_port = graphene.Int()
        smtp_user = graphene.String()
        smtp_password = graphene.String()
        smtp_use_tls = graphene.Boolean()
        twilio_account_sid = graphene.String()
        twilio_auth_token = graphene.String()
        twilio_from_number = graphene.String()
        sms_enabled = graphene.Boolean()
        otp_expiry_minutes = graphene.Int()

    settings = graphene.Field(SystemSettingsType)

    @login_required
    def mutate(self, info, **kwargs):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN)
        cfg = SystemSettings.load()
        for key, value in kwargs.items():
            if value is not None:
                setattr(cfg, key, value)
        cfg.updated_by = info.context.user
        cfg.save()
        return UpdateSystemSettings(settings=cfg)
