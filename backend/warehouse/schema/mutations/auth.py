import graphene
import graphql_jwt
from graphql_jwt.shortcuts import get_token

from warehouse.models import OTPCode
from warehouse.services.otp import request_otp, verify_otp_and_login


class RequestOTP(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        purpose = graphene.String(required=True)
        channel = graphene.String()

    email_sent = graphene.Boolean()
    sms_sent = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, username, purpose, channel=OTPCode.Channel.EMAIL):
        result = request_otp(username=username, purpose=purpose.upper(), channel=channel.upper())
        return RequestOTP(
            email_sent=result["email_sent"],
            sms_sent=result["sms_sent"],
            message="OTP sent." if (result["email_sent"] or result["sms_sent"]) else "OTP generated (delivery failed — check server settings).",
        )


class VerifyOTPLogin(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        code = graphene.String(required=True)

    token = graphene.String()
    message = graphene.String()

    def mutate(self, info, username, code):
        user = verify_otp_and_login(username=username, code=code, purpose=OTPCode.Purpose.LOGIN)
        token = get_token(user)
        return VerifyOTPLogin(token=token, message="Login successful.")
