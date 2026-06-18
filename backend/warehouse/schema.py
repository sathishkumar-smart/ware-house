from decimal import Decimal, InvalidOperation

import graphene
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Q, Sum
from django.utils import timezone
from graphene_django import DjangoObjectType
from graphql import GraphQLError
from graphql_jwt.decorators import login_required

from .models import (
    DamagedProduct,
    EmployeeProfile,
    InventoryBalance,
    Notification,
    Product,
    ReplenishmentRequest,
    ReturnRecord,
    StockMovement,
    SystemSettings,
    Vendor,
    WarehouseLocation,
)
from .services import (
    send_low_stock_alert,
    send_replenishment_request,
    send_whatsapp_replenishment,
)


# ---------------------------------------------------------------------------
# GraphQL types
# ---------------------------------------------------------------------------

class WarehouseLocationType(DjangoObjectType):
    class Meta:
        model = WarehouseLocation
        fields = "__all__"


class EmployeeProfileType(DjangoObjectType):
    username = graphene.String()
    email = graphene.String()

    class Meta:
        model = EmployeeProfile
        fields = ("id", "role", "phone", "locations", "active", "created_at")

    def resolve_username(self, info):
        return self.user.username

    def resolve_email(self, info):
        return self.user.email


class InventoryBalanceType(DjangoObjectType):
    is_low_stock = graphene.Boolean()

    class Meta:
        model = InventoryBalance
        fields = "__all__"

    def resolve_is_low_stock(self, info):
        return self.is_low_stock


class VendorType(DjangoObjectType):
    class Meta:
        model = Vendor
        fields = "__all__"


class ProductType(DjangoObjectType):
    is_low_stock = graphene.Boolean()
    balances = graphene.List(InventoryBalanceType)
    gst_rate = graphene.String()

    class Meta:
        model = Product
        fields = "__all__"

    def resolve_is_low_stock(self, info):
        return self.is_low_stock

    def resolve_balances(self, info):
        return self.balances.select_related("warehouse").filter(warehouse__active=True)

    def resolve_gst_rate(self, info):
        return str(self.gst_rate)


class StockMovementType(DjangoObjectType):
    class Meta:
        model = StockMovement
        fields = "__all__"


class ReturnRecordType(DjangoObjectType):
    class Meta:
        model = ReturnRecord
        fields = "__all__"


class DamagedProductType(DjangoObjectType):
    class Meta:
        model = DamagedProduct
        fields = "__all__"


class NotificationType(DjangoObjectType):
    class Meta:
        model = Notification
        fields = "__all__"


class ReplenishmentRequestType(DjangoObjectType):
    class Meta:
        model = ReplenishmentRequest
        fields = "__all__"


class SystemSettingsType(DjangoObjectType):
    """Public-safe subset — excludes Twilio credentials."""
    class Meta:
        model = SystemSettings
        fields = (
            "app_name",
            "app_subtitle",
            "logo_url",
            "primary_color",
            "accent_color",
            "default_dark_mode",
            "whatsapp_enabled",
            "whatsapp_from_number",
            "alert_email",
            "updated_at",
        )


class DashboardStats(graphene.ObjectType):
    total_products = graphene.Int()
    total_units = graphene.Int()
    low_stock_products = graphene.Int()
    total_vendors = graphene.Int()
    pending_returns = graphene.Int()
    damaged_units = graphene.Int()
    inventory_value = graphene.Float()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ELEVATED_ROLES = {EmployeeProfile.Role.SUPER_ADMIN, EmployeeProfile.Role.ADMIN}


def get_profile(user):
    profile, _ = EmployeeProfile.objects.get_or_create(
        user=user,
        defaults={
            "role": EmployeeProfile.Role.SUPER_ADMIN
            if user.is_superuser
            else EmployeeProfile.Role.INVENTORY_OPERATOR
        },
    )
    if not profile.active:
        raise GraphQLError("Your warehouse employee account is inactive.")
    return profile


def require_role(user, *roles):
    profile = get_profile(user)
    # Super Admin bypasses all role checks
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
    warehouse = accessible_warehouses(user).filter(pk=warehouse_id).first()
    if not warehouse:
        raise GraphQLError("Warehouse not found or not assigned to your account.")
    return warehouse


def get_product(product_id):
    try:
        return Product.objects.select_for_update().get(pk=product_id, active=True)
    except Product.DoesNotExist as exc:
        raise GraphQLError("Product not found.") from exc


def apply_stock_change(*, product, warehouse, delta, movement_type, user, reference="", notes=""):
    balance, _ = InventoryBalance.objects.select_for_update().get_or_create(
        product=product,
        warehouse=warehouse,
        defaults={"reorder_level": product.reorder_level, "bin_location": product.location},
    )
    previous = balance.quantity
    new_stock = previous + delta
    if new_stock < 0:
        raise GraphQLError(
            f"Insufficient stock. {product.name} has {previous} units at {warehouse.name}."
        )
    balance.quantity = new_stock
    balance.save(update_fields=["quantity", "updated_at"])
    product.current_stock = product.balances.aggregate(total=Sum("quantity"))["total"] or 0
    product.save(update_fields=["current_stock", "updated_at"])
    movement = StockMovement.objects.create(
        product=product,
        warehouse=warehouse,
        movement_type=movement_type,
        quantity=delta,
        previous_stock=previous,
        new_stock=new_stock,
        reference=reference,
        notes=notes,
        created_by=user,
    )
    if previous > balance.reorder_level and new_stock <= balance.reorder_level:
        transaction.on_commit(lambda: send_low_stock_alert(product, warehouse, balance))
    return movement


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

class Query(graphene.ObjectType):
    products = graphene.List(ProductType, search=graphene.String(), low_stock_only=graphene.Boolean())
    vendors = graphene.List(VendorType)
    stock_movements = graphene.List(StockMovementType, limit=graphene.Int())
    returns = graphene.List(ReturnRecordType, limit=graphene.Int())
    damaged_products = graphene.List(DamagedProductType, limit=graphene.Int())
    dashboard_stats = graphene.Field(DashboardStats)
    warehouse_locations = graphene.List(WarehouseLocationType)
    employee_profile = graphene.Field(EmployeeProfileType)
    employees = graphene.List(EmployeeProfileType)
    inventory_balances = graphene.List(InventoryBalanceType, warehouse_id=graphene.ID())
    notifications = graphene.List(NotificationType, unread_only=graphene.Boolean())
    replenishment_requests = graphene.List(ReplenishmentRequestType, limit=graphene.Int())
    system_settings = graphene.Field(SystemSettingsType)

    def resolve_system_settings(self, info):
        return SystemSettings.load()

    @login_required
    def resolve_notifications(self, info, unread_only=False):
        queryset = Notification.objects.filter(recipient=info.context.user)
        return queryset.filter(read=False) if unread_only else queryset[:100]

    @login_required
    def resolve_replenishment_requests(self, info, limit=50):
        profile = get_profile(info.context.user)
        if profile.role not in {EmployeeProfile.Role.SUPER_ADMIN, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER}:
            return []
        return ReplenishmentRequest.objects.select_related(
            "product", "vendor", "warehouse", "created_by"
        ).filter(warehouse__in=accessible_warehouses(info.context.user))[: min(limit, 100)]

    @login_required
    def resolve_warehouse_locations(self, info):
        profile = get_profile(info.context.user)
        if profile.role in ELEVATED_ROLES:
            # ADMIN/SUPER_ADMIN see ALL warehouses (active + inactive) to reactivate them
            return WarehouseLocation.objects.order_by("name")
        return profile.locations.filter(active=True)

    @login_required
    def resolve_employee_profile(self, info):
        return get_profile(info.context.user)

    @login_required
    def resolve_employees(self, info):
        profile = get_profile(info.context.user)
        if profile.role not in {EmployeeProfile.Role.SUPER_ADMIN, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER}:
            return []
        queryset = EmployeeProfile.objects.select_related("user").prefetch_related("locations")
        if profile.role == EmployeeProfile.Role.MANAGER:
            queryset = queryset.filter(
                locations__in=accessible_warehouses(info.context.user)
            ).distinct()
        return queryset

    @login_required
    def resolve_inventory_balances(self, info, warehouse_id=None):
        queryset = InventoryBalance.objects.select_related("product", "warehouse").filter(
            warehouse__in=accessible_warehouses(info.context.user),
            product__active=True,
        )
        return queryset.filter(warehouse_id=warehouse_id) if warehouse_id else queryset

    @login_required
    def resolve_products(self, info, search=None, low_stock_only=False):
        queryset = Product.objects.select_related("vendor").prefetch_related("balances__warehouse").filter(active=True)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(category__icontains=search)
            )
        if low_stock_only:
            queryset = queryset.filter(
                balances__warehouse__in=accessible_warehouses(info.context.user),
                balances__quantity__lte=F("balances__reorder_level"),
            ).distinct()
        return queryset

    @login_required
    def resolve_vendors(self, info):
        return Vendor.objects.filter(active=True)

    @login_required
    def resolve_stock_movements(self, info, limit=30):
        return StockMovement.objects.select_related("product", "created_by", "warehouse").filter(
            warehouse__in=accessible_warehouses(info.context.user)
        )[: min(limit, 100)]

    @login_required
    def resolve_returns(self, info, limit=30):
        return ReturnRecord.objects.select_related("product", "vendor", "warehouse").filter(
            warehouse__in=accessible_warehouses(info.context.user)
        )[: min(limit, 100)]

    @login_required
    def resolve_damaged_products(self, info, limit=30):
        return DamagedProduct.objects.select_related("product", "vendor", "warehouse").filter(
            warehouse__in=accessible_warehouses(info.context.user)
        )[: min(limit, 100)]

    @login_required
    def resolve_dashboard_stats(self, info):
        warehouses = accessible_warehouses(info.context.user)
        products = Product.objects.filter(active=True)
        balances = InventoryBalance.objects.filter(
            warehouse__in=warehouses,
            product__active=True,
        )
        damaged = DamagedProduct.objects.filter(
            warehouse__in=warehouses,
            status=DamagedProduct.Status.QUARANTINED,
        )
        return DashboardStats(
            total_products=products.count(),
            total_units=balances.aggregate(total=Sum("quantity"))["total"] or 0,
            low_stock_products=balances.filter(quantity__lte=F("reorder_level"))
            .values("product")
            .distinct()
            .count(),
            total_vendors=Vendor.objects.filter(active=True).count(),
            pending_returns=ReturnRecord.objects.filter(
                warehouse__in=warehouses,
                status=ReturnRecord.Status.PENDING,
            ).count(),
            damaged_units=damaged.aggregate(total=Sum("quantity"))["total"] or 0,
            inventory_value=sum(
                balance.quantity * balance.product.unit_price
                for balance in balances.select_related("product")
            ),
        )


# ---------------------------------------------------------------------------
# Mutations
# ---------------------------------------------------------------------------

class CreateVendor(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        contact_person = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        address = graphene.String()
        gstin = graphene.String()

    vendor = graphene.Field(VendorType)

    @login_required
    def mutate(self, info, name, contact_person="", email="", phone="", address="", gstin=""):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        return CreateVendor(
            vendor=Vendor.objects.create(
                name=name.strip(),
                contact_person=contact_person.strip(),
                email=email.strip(),
                phone=phone.strip(),
                address=address.strip(),
                gstin=gstin.strip().upper(),
            )
        )


class UpdateVendor(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        name = graphene.String()
        contact_person = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        address = graphene.String()
        gstin = graphene.String()
        active = graphene.Boolean()

    vendor = graphene.Field(VendorType)

    @login_required
    def mutate(self, info, id, **kwargs):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        try:
            vendor = Vendor.objects.get(pk=id)
        except Vendor.DoesNotExist as exc:
            raise GraphQLError("Vendor not found.") from exc
        for field, value in kwargs.items():
            if value is not None:
                if field == "gstin":
                    value = value.strip().upper()
                elif isinstance(value, str):
                    value = value.strip()
                setattr(vendor, field, value)
        vendor.save()
        return UpdateVendor(vendor=vendor)


class CreateProduct(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        sku = graphene.String(required=True)
        category = graphene.String()
        description = graphene.String()
        vendor_id = graphene.ID()
        unit_price = graphene.String()
        gst_rate = graphene.String()
        hsn_code = graphene.String()
        initial_stock = graphene.Int()
        reorder_level = graphene.Int()
        location = graphene.String()
        warehouse_id = graphene.ID(required=True)

    product = graphene.Field(ProductType)

    @login_required
    @transaction.atomic
    def mutate(
        self,
        info,
        name,
        sku,
        warehouse_id,
        category="",
        description="",
        vendor_id=None,
        unit_price="0",
        gst_rate="0",
        hsn_code="",
        initial_stock=0,
        reorder_level=10,
        location="",
    ):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        if Product.objects.filter(sku__iexact=sku.strip()).exists():
            raise GraphQLError("A product with this SKU already exists.")
        if initial_stock < 0 or reorder_level < 0:
            raise GraphQLError("Stock and reorder level cannot be negative.")
        try:
            price, tax_rate = Decimal(unit_price), Decimal(gst_rate)
        except InvalidOperation as exc:
            raise GraphQLError("Unit price and GST rate must be valid numbers.") from exc
        warehouse = get_warehouse(info.context.user, warehouse_id)
        vendor = Vendor.objects.filter(pk=vendor_id, active=True).first() if vendor_id else None
        product = Product.objects.create(
            name=name.strip(),
            sku=sku.strip().upper(),
            category=category.strip(),
            description=description.strip(),
            vendor=vendor,
            unit_price=price,
            gst_rate=tax_rate,
            hsn_code=hsn_code.strip(),
            current_stock=initial_stock,
            reorder_level=reorder_level,
            location=location.strip(),
        )
        InventoryBalance.objects.create(
            product=product,
            warehouse=warehouse,
            quantity=initial_stock,
            reorder_level=reorder_level,
            bin_location=location.strip(),
        )
        if initial_stock:
            StockMovement.objects.create(
                product=product,
                warehouse=warehouse,
                movement_type=StockMovement.MovementType.RECEIPT,
                quantity=initial_stock,
                previous_stock=0,
                new_stock=initial_stock,
                notes="Opening stock",
                created_by=info.context.user,
            )
        return CreateProduct(product=product)


class UpdateStock(graphene.Mutation):
    class Arguments:
        product_id = graphene.ID(required=True)
        warehouse_id = graphene.ID(required=True)
        movement_type = graphene.String(required=True)
        quantity = graphene.Int(required=True)
        reference = graphene.String()
        notes = graphene.String()

    movement = graphene.Field(StockMovementType)

    @login_required
    @transaction.atomic
    def mutate(self, info, product_id, warehouse_id, movement_type, quantity, reference="", notes=""):
        require_role(
            info.context.user,
            EmployeeProfile.Role.ADMIN,
            EmployeeProfile.Role.MANAGER,
            EmployeeProfile.Role.INVENTORY_OPERATOR,
        )
        if quantity <= 0:
            raise GraphQLError("Quantity must be greater than zero.")
        movement_type = movement_type.upper()
        allowed = {
            StockMovement.MovementType.RECEIPT: 1,
            StockMovement.MovementType.ISSUE: -1,
            StockMovement.MovementType.ADJUSTMENT: 1,
        }
        if movement_type not in allowed:
            raise GraphQLError("Movement type must be RECEIPT, ISSUE, or ADJUSTMENT.")
        movement = apply_stock_change(
            product=get_product(product_id),
            warehouse=get_warehouse(info.context.user, warehouse_id),
            delta=quantity * allowed[movement_type],
            movement_type=movement_type,
            user=info.context.user,
            reference=reference,
            notes=notes,
        )
        return UpdateStock(movement=movement)


class CreateReturn(graphene.Mutation):
    class Arguments:
        product_id = graphene.ID(required=True)
        warehouse_id = graphene.ID(required=True)
        return_type = graphene.String(required=True)
        condition = graphene.String(required=True)
        quantity = graphene.Int(required=True)
        vendor_id = graphene.ID()
        reference = graphene.String()
        reason = graphene.String(required=True)

    return_record = graphene.Field(ReturnRecordType)

    @login_required
    @transaction.atomic
    def mutate(
        self,
        info,
        product_id,
        warehouse_id,
        return_type,
        condition,
        quantity,
        reason,
        vendor_id=None,
        reference="",
    ):
        require_role(
            info.context.user,
            EmployeeProfile.Role.ADMIN,
            EmployeeProfile.Role.MANAGER,
            EmployeeProfile.Role.INVENTORY_OPERATOR,
        )
        return_type, condition = return_type.upper(), condition.upper()
        if return_type not in ReturnRecord.ReturnType.values:
            raise GraphQLError("Return type must be CUSTOMER or VENDOR.")
        if condition not in ReturnRecord.Condition.values:
            raise GraphQLError("Condition must be RESTOCKABLE or DAMAGED.")
        if quantity <= 0:
            raise GraphQLError("Quantity must be greater than zero.")
        product = get_product(product_id)
        warehouse = get_warehouse(info.context.user, warehouse_id)
        vendor = Vendor.objects.filter(pk=vendor_id).first() if vendor_id else product.vendor
        record = ReturnRecord.objects.create(
            product=product,
            warehouse=warehouse,
            vendor=vendor,
            return_type=return_type,
            condition=condition,
            quantity=quantity,
            reference=reference,
            reason=reason,
            created_by=info.context.user,
        )
        movement_type, delta = None, 0
        if return_type == ReturnRecord.ReturnType.CUSTOMER and condition == ReturnRecord.Condition.RESTOCKABLE:
            movement_type, delta = StockMovement.MovementType.CUSTOMER_RETURN, quantity
        elif return_type == ReturnRecord.ReturnType.VENDOR:
            movement_type, delta = StockMovement.MovementType.VENDOR_RETURN, -quantity
        if movement_type:
            apply_stock_change(
                product=product,
                warehouse=warehouse,
                delta=delta,
                movement_type=movement_type,
                user=info.context.user,
                reference=reference,
                notes=reason,
            )
        return CreateReturn(return_record=record)


class ReportDamage(graphene.Mutation):
    class Arguments:
        product_id = graphene.ID(required=True)
        warehouse_id = graphene.ID(required=True)
        quantity = graphene.Int(required=True)
        reason = graphene.String(required=True)
        reference = graphene.String()

    damage = graphene.Field(DamagedProductType)

    @login_required
    @transaction.atomic
    def mutate(self, info, product_id, warehouse_id, quantity, reason, reference=""):
        require_role(
            info.context.user,
            EmployeeProfile.Role.ADMIN,
            EmployeeProfile.Role.MANAGER,
            EmployeeProfile.Role.INVENTORY_OPERATOR,
        )
        if quantity <= 0:
            raise GraphQLError("Quantity must be greater than zero.")
        product = get_product(product_id)
        warehouse = get_warehouse(info.context.user, warehouse_id)
        damage = DamagedProduct.objects.create(
            product=product,
            warehouse=warehouse,
            vendor=product.vendor,
            quantity=quantity,
            reason=reason,
            reference=reference,
            created_by=info.context.user,
        )
        apply_stock_change(
            product=product,
            warehouse=warehouse,
            delta=-quantity,
            movement_type=StockMovement.MovementType.DAMAGE,
            user=info.context.user,
            reference=reference,
            notes=reason,
        )
        return ReportDamage(damage=damage)


class ResolveDamage(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        status = graphene.String(required=True)
        notes = graphene.String()

    damage = graphene.Field(DamagedProductType)

    @login_required
    def mutate(self, info, id, status, notes=""):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        status = status.upper()
        if status not in DamagedProduct.Status.values:
            raise GraphQLError("Invalid status.")
        try:
            damage = DamagedProduct.objects.get(pk=id)
        except DamagedProduct.DoesNotExist as exc:
            raise GraphQLError("Damage record not found.") from exc
        damage.status = status
        if status == DamagedProduct.Status.RESOLVED:
            damage.resolved_at = timezone.now()
        if notes:
            damage.reason = f"{damage.reason}\nResolution: {notes}"
        damage.save()
        return ResolveDamage(damage=damage)


class CreateWarehouseLocation(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        code = graphene.String(required=True)
        address = graphene.String()
        city = graphene.String()
        state = graphene.String()
        pincode = graphene.String()

    warehouse = graphene.Field(WarehouseLocationType)

    @login_required
    def mutate(self, info, name, code, address="", city="", state="", pincode=""):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN)
        if WarehouseLocation.objects.filter(code__iexact=code.strip()).exists():
            raise GraphQLError("A warehouse with this code already exists.")
        return CreateWarehouseLocation(
            warehouse=WarehouseLocation.objects.create(
                name=name.strip(),
                code=code.strip().upper(),
                address=address.strip(),
                city=city.strip(),
                state=state.strip(),
                pincode=pincode.strip(),
            )
        )


class UpdateWarehouseLocation(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        name = graphene.String()
        address = graphene.String()
        city = graphene.String()
        state = graphene.String()
        pincode = graphene.String()
        active = graphene.Boolean()

    warehouse = graphene.Field(WarehouseLocationType)

    @login_required
    def mutate(self, info, id, **kwargs):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN)
        try:
            wh = WarehouseLocation.objects.get(pk=id)
        except WarehouseLocation.DoesNotExist as exc:
            raise GraphQLError("Warehouse not found.") from exc
        for field, value in kwargs.items():
            if value is not None:
                setattr(wh, field, value.strip() if isinstance(value, str) else value)
        wh.save()
        return UpdateWarehouseLocation(warehouse=wh)


class CreateEmployee(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        password = graphene.String(required=True)
        email = graphene.String()
        phone = graphene.String()
        role = graphene.String(required=True)
        warehouse_ids = graphene.List(graphene.NonNull(graphene.ID), required=True)

    employee = graphene.Field(EmployeeProfileType)

    @login_required
    @transaction.atomic
    def mutate(
        self,
        info,
        username,
        password,
        role,
        warehouse_ids,
        email="",
        phone="",
    ):
        caller = require_role(info.context.user, EmployeeProfile.Role.ADMIN)
        role = role.upper()
        if role not in EmployeeProfile.Role.values:
            raise GraphQLError("Invalid employee role.")
        if role == EmployeeProfile.Role.SUPER_ADMIN and caller.role != EmployeeProfile.Role.SUPER_ADMIN:
            raise GraphQLError("Only a Super Administrator can create Super Administrator accounts.")
        User = get_user_model()
        if User.objects.filter(username__iexact=username.strip()).exists():
            raise GraphQLError("An employee with this username already exists.")
        warehouses = list(
            WarehouseLocation.objects.filter(pk__in=warehouse_ids, active=True)
        )
        if len(warehouses) != len(set(warehouse_ids)):
            raise GraphQLError("One or more selected warehouses are invalid.")
        user = User.objects.create_user(
            username=username.strip(),
            email=email.strip(),
            password=password,
        )
        profile = EmployeeProfile.objects.create(
            user=user,
            role=role,
            phone=phone.strip(),
        )
        profile.locations.set(warehouses)
        return CreateEmployee(employee=profile)


class UpdateEmployee(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        role = graphene.String()
        phone = graphene.String()
        email = graphene.String()
        active = graphene.Boolean()
        warehouse_ids = graphene.List(graphene.NonNull(graphene.ID))

    employee = graphene.Field(EmployeeProfileType)

    @login_required
    @transaction.atomic
    def mutate(self, info, id, role=None, phone=None, email=None, active=None, warehouse_ids=None):
        caller = require_role(info.context.user, EmployeeProfile.Role.ADMIN)
        try:
            profile = EmployeeProfile.objects.select_related("user").get(pk=id)
        except EmployeeProfile.DoesNotExist as exc:
            raise GraphQLError("Employee not found.") from exc
        # Only a Super Admin can modify another Super Admin account
        if (profile.role == EmployeeProfile.Role.SUPER_ADMIN
                and caller.role != EmployeeProfile.Role.SUPER_ADMIN):
            raise GraphQLError("Super Administrator accounts can only be managed by another Super Administrator.")
        if role is not None:
            role = role.upper()
            if role not in EmployeeProfile.Role.values:
                raise GraphQLError("Invalid role.")
            # Only Super Admin can promote someone to Super Admin
            if role == EmployeeProfile.Role.SUPER_ADMIN and caller.role != EmployeeProfile.Role.SUPER_ADMIN:
                raise GraphQLError("Only a Super Administrator can assign the Super Administrator role.")
            profile.role = role
        if phone is not None:
            profile.phone = phone.strip()
        if active is not None:
            if active is False and profile.user == info.context.user:
                raise GraphQLError("You cannot deactivate your own account.")
            profile.active = active
        if email is not None:
            profile.user.email = email.strip()
            profile.user.save(update_fields=["email"])
        if warehouse_ids is not None:
            warehouses = list(WarehouseLocation.objects.filter(pk__in=warehouse_ids, active=True))
            profile.locations.set(warehouses)
        profile.save()
        return UpdateEmployee(employee=profile)


class ResetEmployeePassword(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        new_password = graphene.String(required=True)

    ok = graphene.Boolean()

    @login_required
    def mutate(self, info, id, new_password):
        caller = require_role(info.context.user, EmployeeProfile.Role.ADMIN)
        try:
            profile = EmployeeProfile.objects.select_related("user").get(pk=id)
        except EmployeeProfile.DoesNotExist as exc:
            raise GraphQLError("Employee not found.") from exc
        if (profile.role == EmployeeProfile.Role.SUPER_ADMIN
                and caller.role != EmployeeProfile.Role.SUPER_ADMIN):
            raise GraphQLError("Super Administrator passwords can only be changed by another Super Administrator.")
        if len(new_password) < 8:
            raise GraphQLError("Password must be at least 8 characters.")
        profile.user.set_password(new_password)
        profile.user.save(update_fields=["password"])
        return ResetEmployeePassword(ok=True)


class RequestReplenishment(graphene.Mutation):
    class Arguments:
        product_id = graphene.ID(required=True)
        warehouse_id = graphene.ID(required=True)
        quantity = graphene.Int(required=True)
        expected_date = graphene.Date()
        notes = graphene.String()
        send_now = graphene.Boolean()

    request = graphene.Field(ReplenishmentRequestType)
    email_sent = graphene.Boolean()
    whatsapp_sent = graphene.Boolean()

    @login_required
    @transaction.atomic
    def mutate(
        self,
        info,
        product_id,
        warehouse_id,
        quantity,
        expected_date=None,
        notes="",
        send_now=True,
    ):
        require_role(
            info.context.user,
            EmployeeProfile.Role.ADMIN,
            EmployeeProfile.Role.MANAGER,
        )
        if quantity <= 0:
            raise GraphQLError("Quantity must be greater than zero.")
        product = get_product(product_id)
        if not product.vendor:
            raise GraphQLError("Assign a vendor to this product before requesting replenishment.")
        req = ReplenishmentRequest.objects.create(
            product=product,
            vendor=product.vendor,
            warehouse=get_warehouse(info.context.user, warehouse_id),
            quantity=quantity,
            expected_date=expected_date,
            notes=notes,
            created_by=info.context.user,
        )
        email_sent = False
        whatsapp_sent = False
        if send_now:
            try:
                email_sent = send_replenishment_request(req)
            except Exception:
                email_sent = False
            try:
                whatsapp_sent = send_whatsapp_replenishment(req)
            except Exception:
                whatsapp_sent = False
            if email_sent or whatsapp_sent:
                req.status = ReplenishmentRequest.Status.SENT
                req.sent_at = timezone.now()
                req.save(update_fields=["status", "sent_at"])
        managers = EmployeeProfile.objects.filter(
            role__in=[EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER],
            active=True,
        ).select_related("user")
        Notification.objects.bulk_create(
            [
                Notification(
                    recipient=manager.user,
                    title=f"Replenishment requested: {product.name}",
                    message=(
                        f"{quantity} units requested from {product.vendor.name} "
                        f"for {req.warehouse.name}."
                    ),
                    level=Notification.Level.INFO,
                )
                for manager in managers
            ]
        )
        return RequestReplenishment(request=req, email_sent=email_sent, whatsapp_sent=whatsapp_sent)


class UpdateReplenishmentStatus(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        status = graphene.String(required=True)

    request = graphene.Field(ReplenishmentRequestType)

    @login_required
    def mutate(self, info, id, status):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        status = status.upper()
        if status not in ReplenishmentRequest.Status.values:
            raise GraphQLError("Invalid status.")
        try:
            req = ReplenishmentRequest.objects.get(pk=id)
        except ReplenishmentRequest.DoesNotExist as exc:
            raise GraphQLError("Replenishment request not found.") from exc
        req.status = status
        if status == ReplenishmentRequest.Status.SENT and not req.sent_at:
            req.sent_at = timezone.now()
        req.save()
        return UpdateReplenishmentStatus(request=req)


class MarkNotificationsRead(graphene.Mutation):
    class Arguments:
        ids = graphene.List(graphene.ID)
        mark_all = graphene.Boolean()

    count = graphene.Int()

    @login_required
    def mutate(self, info, ids=None, mark_all=False):
        qs = Notification.objects.filter(recipient=info.context.user, read=False)
        if not mark_all and ids:
            qs = qs.filter(pk__in=ids)
        count = qs.update(read=True)
        return MarkNotificationsRead(count=count)


class UpdateSystemSettings(graphene.Mutation):
    class Arguments:
        app_name = graphene.String()
        app_subtitle = graphene.String()
        logo_url = graphene.String()
        primary_color = graphene.String()
        accent_color = graphene.String()
        default_dark_mode = graphene.Boolean()
        whatsapp_enabled = graphene.Boolean()
        whatsapp_account_sid = graphene.String()
        whatsapp_auth_token = graphene.String()
        whatsapp_from_number = graphene.String()
        alert_email = graphene.String()

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


class Mutation(graphene.ObjectType):
    create_vendor = CreateVendor.Field()
    update_vendor = UpdateVendor.Field()
    create_product = CreateProduct.Field()
    update_stock = UpdateStock.Field()
    create_return = CreateReturn.Field()
    report_damage = ReportDamage.Field()
    resolve_damage = ResolveDamage.Field()
    create_warehouse_location = CreateWarehouseLocation.Field()
    update_warehouse_location = UpdateWarehouseLocation.Field()
    create_employee = CreateEmployee.Field()
    update_employee = UpdateEmployee.Field()
    reset_employee_password = ResetEmployeePassword.Field()
    request_replenishment = RequestReplenishment.Field()
    update_replenishment_status = UpdateReplenishmentStatus.Field()
    mark_notifications_read = MarkNotificationsRead.Field()
    update_system_settings = UpdateSystemSettings.Field()
