"""Auth helpers — identifier resolution and credential login."""
from graphql import GraphQLError


def resolve_identifier(identifier: str):
    """
    Resolve a username, email address, or phone number to a User instance.
    Tries exact username → case-insensitive email → normalized phone number.
    Raises GraphQLError if no match is found.
    """
    from django.contrib.auth import get_user_model
    from warehouse.models import EmployeeProfile

    User = get_user_model()
    ident = (identifier or "").strip()
    if not ident:
        raise GraphQLError("Please enter your username, email, or phone number.")

    # 1. Exact username match
    try:
        return User.objects.get(username=ident)
    except User.DoesNotExist:
        pass

    # 2. Case-insensitive email match (use first active user if duplicates exist)
    user = User.objects.filter(email__iexact=ident, is_active=True).order_by("id").first()
    if user:
        return user

    # 3. Phone number match — normalize to raw digits and try several formats
    digits = "".join(c for c in ident if c.isdigit())
    if digits:
        phone_variants = [digits]
        if len(digits) == 10:
            phone_variants += [f"+91{digits}", f"91{digits}"]
        elif len(digits) == 12 and digits.startswith("91"):
            phone_variants += [digits[2:], f"+{digits}"]
        elif len(digits) == 13 and digits.startswith("091"):
            phone_variants += [digits[3:]]

        for variant in phone_variants:
            try:
                return EmployeeProfile.objects.get(phone=variant).user
            except EmployeeProfile.DoesNotExist:
                continue

    raise GraphQLError("No account found with that username, email, or phone number.")
