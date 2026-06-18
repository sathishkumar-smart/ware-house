from django.contrib import admin

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


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "current_stock", "reorder_level", "unit_price", "vendor", "active")
    search_fields = ("sku", "name", "category", "hsn_code")
    list_filter = ("active", "category")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ("name", "contact_person", "email", "phone", "gstin", "active")
    search_fields = ("name", "gstin", "email")
    list_filter = ("active",)


@admin.register(WarehouseLocation)
class WarehouseLocationAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "city", "state", "pincode", "active")
    search_fields = ("code", "name", "city")
    list_filter = ("active",)


@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ("get_username", "role", "phone", "active", "created_at")
    list_filter = ("role", "active")
    search_fields = ("user__username", "user__email", "phone")
    readonly_fields = ("created_at",)

    @admin.display(description="Username")
    def get_username(self, obj):
        return obj.user.username


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("product", "warehouse", "movement_type", "quantity", "created_by", "created_at")
    list_filter = ("movement_type", "warehouse")
    search_fields = ("product__name", "product__sku", "reference")
    readonly_fields = ("created_at",)


@admin.register(InventoryBalance)
class InventoryBalanceAdmin(admin.ModelAdmin):
    list_display = ("product", "warehouse", "quantity", "reorder_level", "bin_location")
    list_filter = ("warehouse",)
    search_fields = ("product__name", "product__sku", "bin_location")


@admin.register(ReturnRecord)
class ReturnRecordAdmin(admin.ModelAdmin):
    list_display = ("product", "warehouse", "return_type", "condition", "quantity", "status", "created_at")
    list_filter = ("return_type", "condition", "status", "warehouse")
    search_fields = ("product__name", "reference")
    readonly_fields = ("created_at",)


@admin.register(DamagedProduct)
class DamagedProductAdmin(admin.ModelAdmin):
    list_display = ("product", "warehouse", "quantity", "status", "created_at", "resolved_at")
    list_filter = ("status", "warehouse")
    search_fields = ("product__name", "reference")
    readonly_fields = ("created_at",)


@admin.register(ReplenishmentRequest)
class ReplenishmentRequestAdmin(admin.ModelAdmin):
    list_display = ("product", "vendor", "warehouse", "quantity", "status", "expected_date", "created_at")
    list_filter = ("status", "warehouse")
    search_fields = ("product__name", "vendor__name")
    readonly_fields = ("created_at", "sent_at")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "title", "level", "read", "created_at")
    list_filter = ("level", "read")
    search_fields = ("title", "message", "recipient__username")
    readonly_fields = ("created_at",)


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ("app_name", "primary_color", "whatsapp_enabled", "updated_at")
    readonly_fields = ("updated_at", "updated_by")
    fieldsets = (
        ("Branding", {
            "fields": ("app_name", "app_subtitle", "logo_url", "primary_color", "accent_color", "default_dark_mode"),
        }),
        ("Email Alerts", {
            "fields": ("alert_email",),
        }),
        ("WhatsApp (Twilio)", {
            "fields": ("whatsapp_enabled", "whatsapp_account_sid", "whatsapp_auth_token", "whatsapp_from_number"),
            "classes": ("collapse",),
        }),
        ("Audit", {
            "fields": ("updated_at", "updated_by"),
        }),
    )

    def has_add_permission(self, request):
        return not SystemSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
