from graphql import GraphQLError

from .models import EmployeeProfile, FinishedProduct, RawClothBatch, WarehouseLocation

ELEVATED_ROLES = {EmployeeProfile.Role.SUPER_ADMIN, EmployeeProfile.Role.ADMIN}
MANAGEMENT_ROLES = {EmployeeProfile.Role.SUPER_ADMIN, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER}
PRODUCTION_ROLES = {
    EmployeeProfile.Role.SUPER_ADMIN, EmployeeProfile.Role.ADMIN,
    EmployeeProfile.Role.MANAGER, EmployeeProfile.Role.STORE_KEEPER,
}


def get_profile(user):
    profile, _ = EmployeeProfile.objects.get_or_create(
        user=user,
        defaults={
            "role": EmployeeProfile.Role.SUPER_ADMIN if user.is_superuser else EmployeeProfile.Role.STORE_KEEPER
        },
    )
    if not profile.active:
        raise GraphQLError("Your account has been deactivated. Contact an administrator.")
    return profile


def require_role(user, *roles):
    profile = get_profile(user)
    if profile.role == EmployeeProfile.Role.SUPER_ADMIN:
        return profile
    if profile.role not in roles:
        raise GraphQLError("You do not have permission to perform this action.")
    return profile


def accessible_warehouses(user):
    profile = get_profile(user)
    if profile.role in ELEVATED_ROLES:
        return WarehouseLocation.objects.filter(active=True)
    return profile.locations.filter(active=True)


def get_warehouse(user, warehouse_id):
    wh = accessible_warehouses(user).filter(pk=warehouse_id).first()
    if not wh:
        raise GraphQLError("Warehouse not found or not assigned to your account.")
    return wh


def get_raw_cloth_batch(batch_id):
    try:
        return RawClothBatch.objects.select_for_update().get(pk=batch_id, active=True)
    except RawClothBatch.DoesNotExist as exc:
        raise GraphQLError("Raw cloth batch not found.") from exc


def get_finished_product(product_id):
    try:
        return FinishedProduct.objects.get(pk=product_id, active=True)
    except FinishedProduct.DoesNotExist as exc:
        raise GraphQLError("Finished product not found.") from exc
