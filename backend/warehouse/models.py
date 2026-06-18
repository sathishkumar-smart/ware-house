from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class WarehouseLocation(models.Model):
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=30, unique=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class EmployeeProfile(models.Model):
    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Administrator"
        ADMIN = "ADMIN", "Administrator"
        MANAGER = "MANAGER", "Warehouse manager"
        INVENTORY_OPERATOR = "INVENTORY_OPERATOR", "Inventory operator"
        AUDITOR = "AUDITOR", "Auditor / read only"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="warehouse_profile",
        on_delete=models.CASCADE,
    )
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.INVENTORY_OPERATOR)
    phone = models.CharField(max_length=20, blank=True)
    locations = models.ManyToManyField(WarehouseLocation, related_name="employees", blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"


class Vendor(models.Model):
    name = models.CharField(max_length=160)
    contact_person = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=180)
    sku = models.CharField(max_length=80, unique=True)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    vendor = models.ForeignKey(
        Vendor,
        related_name="products",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    gst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    hsn_code = models.CharField(max_length=20, blank=True)
    current_stock = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)
    location = models.CharField(max_length=100, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    @property
    def is_low_stock(self):
        return self.current_stock <= self.reorder_level

    def __str__(self):
        return f"{self.sku} - {self.name}"


class InventoryBalance(models.Model):
    product = models.ForeignKey(Product, related_name="balances", on_delete=models.CASCADE)
    warehouse = models.ForeignKey(
        WarehouseLocation,
        related_name="inventory_balances",
        on_delete=models.PROTECT,
    )
    quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)
    bin_location = models.CharField(max_length=100, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["warehouse__name", "product__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "warehouse"],
                name="unique_product_warehouse_balance",
            )
        ]

    @property
    def is_low_stock(self):
        return self.quantity <= self.reorder_level


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        RECEIPT = "RECEIPT", "Stock received"
        ISSUE = "ISSUE", "Stock issued"
        ADJUSTMENT = "ADJUSTMENT", "Stock adjustment"
        CUSTOMER_RETURN = "CUSTOMER_RETURN", "Customer return"
        VENDOR_RETURN = "VENDOR_RETURN", "Vendor return"
        DAMAGE = "DAMAGE", "Damaged stock"

    product = models.ForeignKey(Product, related_name="movements", on_delete=models.CASCADE)
    warehouse = models.ForeignKey(
        WarehouseLocation,
        related_name="stock_movements",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    movement_type = models.CharField(max_length=30, choices=MovementType.choices)
    quantity = models.IntegerField()
    previous_stock = models.PositiveIntegerField()
    new_stock = models.PositiveIntegerField()
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="stock_movements",
        on_delete=models.PROTECT,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ReturnRecord(models.Model):
    class ReturnType(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer return"
        VENDOR = "VENDOR", "Return to vendor"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        REJECTED = "REJECTED", "Rejected"

    class Condition(models.TextChoices):
        RESTOCKABLE = "RESTOCKABLE", "Restockable"
        DAMAGED = "DAMAGED", "Damaged"

    product = models.ForeignKey(Product, related_name="returns", on_delete=models.PROTECT)
    warehouse = models.ForeignKey(
        WarehouseLocation,
        related_name="returns",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    vendor = models.ForeignKey(
        Vendor,
        related_name="returns",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    return_type = models.CharField(max_length=20, choices=ReturnType.choices)
    condition = models.CharField(max_length=20, choices=Condition.choices)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    reference = models.CharField(max_length=100, blank=True)
    reason = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="return_records",
        on_delete=models.PROTECT,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class DamagedProduct(models.Model):
    class Status(models.TextChoices):
        QUARANTINED = "QUARANTINED", "Quarantined"
        RETURNED = "RETURNED", "Returned to vendor"
        DISPOSED = "DISPOSED", "Disposed"
        RESOLVED = "RESOLVED", "Resolved"

    product = models.ForeignKey(Product, related_name="damage_reports", on_delete=models.PROTECT)
    warehouse = models.ForeignKey(
        WarehouseLocation,
        related_name="damage_reports",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    vendor = models.ForeignKey(
        Vendor,
        related_name="damage_reports",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUARANTINED)
    reference = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="damage_reports",
        on_delete=models.PROTECT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class ReplenishmentRequest(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SENT = "SENT", "Sent to vendor"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
        PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", "Partially received"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    product = models.ForeignKey(Product, related_name="replenishment_requests", on_delete=models.PROTECT)
    vendor = models.ForeignKey(Vendor, related_name="replenishment_requests", on_delete=models.PROTECT)
    warehouse = models.ForeignKey(WarehouseLocation, related_name="replenishment_requests", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    expected_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="replenishment_requests",
        on_delete=models.PROTECT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class Notification(models.Model):
    class Level(models.TextChoices):
        INFO = "INFO", "Information"
        WARNING = "WARNING", "Warning"
        CRITICAL = "CRITICAL", "Critical"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="warehouse_notifications",
        on_delete=models.CASCADE,
    )
    title = models.CharField(max_length=180)
    message = models.TextField()
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.INFO)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class SystemSettings(models.Model):
    app_name = models.CharField(max_length=60, default="Wareflow")
    app_subtitle = models.CharField(max_length=80, default="Inventory OS")
    logo_url = models.TextField(blank=True, help_text="URL or base64 data URI for the logo image")
    primary_color = models.CharField(max_length=7, default="#173a2c")
    accent_color = models.CharField(max_length=7, default="#d4932f")
    default_dark_mode = models.BooleanField(default=False)
    whatsapp_enabled = models.BooleanField(default=False)
    whatsapp_account_sid = models.CharField(max_length=200, blank=True)
    whatsapp_auth_token = models.CharField(max_length=200, blank=True)
    whatsapp_from_number = models.CharField(
        max_length=20, blank=True, help_text="Twilio WhatsApp number e.g. +14155238886"
    )
    alert_email = models.EmailField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settings_updates",
    )

    class Meta:
        verbose_name = "System settings"
        verbose_name_plural = "System settings"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"System settings — {self.app_name}"
