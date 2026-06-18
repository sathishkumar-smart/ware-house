import decimal
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def seed_main_warehouse(apps, schema_editor):
    WarehouseLocation = apps.get_model("warehouse", "WarehouseLocation")
    InventoryBalance = apps.get_model("warehouse", "InventoryBalance")
    Product = apps.get_model("warehouse", "Product")
    EmployeeProfile = apps.get_model("warehouse", "EmployeeProfile")
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))

    warehouse, _ = WarehouseLocation.objects.get_or_create(
        code="MAIN",
        defaults={
            "name": "Main Warehouse",
            "city": "",
            "state": "",
            "pincode": "",
        },
    )
    for product in Product.objects.all():
        InventoryBalance.objects.get_or_create(
            product=product,
            warehouse=warehouse,
            defaults={
                "quantity": product.current_stock,
                "reorder_level": product.reorder_level,
                "bin_location": product.location,
            },
        )
    for user in User.objects.all():
        profile, _ = EmployeeProfile.objects.get_or_create(
            user=user,
            defaults={"role": "ADMIN", "active": user.is_active},
        )
        profile.locations.add(warehouse)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("warehouse", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WarehouseLocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("address", models.TextField(blank=True)),
                ("city", models.CharField(blank=True, max_length=100)),
                ("state", models.CharField(blank=True, max_length=100)),
                ("pincode", models.CharField(blank=True, max_length=10)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.AddField(
            model_name="vendor",
            name="gstin",
            field=models.CharField(blank=True, max_length=15),
        ),
        migrations.AddField(
            model_name="product",
            name="gst_rate",
            field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0.00"), max_digits=5, validators=[django.core.validators.MinValueValidator(decimal.Decimal("0.00"))]),
        ),
        migrations.AddField(
            model_name="product",
            name="hsn_code",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="stockmovement",
            name="warehouse",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="stock_movements", to="warehouse.warehouselocation"),
        ),
        migrations.AddField(
            model_name="returnrecord",
            name="warehouse",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="returns", to="warehouse.warehouselocation"),
        ),
        migrations.AddField(
            model_name="damagedproduct",
            name="warehouse",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="damage_reports", to="warehouse.warehouselocation"),
        ),
        migrations.CreateModel(
            name="InventoryBalance",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.PositiveIntegerField(default=0)),
                ("reorder_level", models.PositiveIntegerField(default=10)),
                ("bin_location", models.CharField(blank=True, max_length=100)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="balances", to="warehouse.product")),
                ("warehouse", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="inventory_balances", to="warehouse.warehouselocation")),
            ],
            options={"ordering": ["warehouse__name", "product__name"]},
        ),
        migrations.AddConstraint(
            model_name="inventorybalance",
            constraint=models.UniqueConstraint(fields=("product", "warehouse"), name="unique_product_warehouse_balance"),
        ),
        migrations.CreateModel(
            name="EmployeeProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("ADMIN", "Administrator"), ("MANAGER", "Warehouse manager"), ("INVENTORY_OPERATOR", "Inventory operator"), ("AUDITOR", "Auditor / read only")], default="INVENTORY_OPERATOR", max_length=30)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("locations", models.ManyToManyField(blank=True, related_name="employees", to="warehouse.warehouselocation")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="warehouse_profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.RunPython(seed_main_warehouse, migrations.RunPython.noop),
        migrations.CreateModel(
            name="ReplenishmentRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("expected_date", models.DateField(blank=True, null=True)),
                ("status", models.CharField(choices=[("DRAFT", "Draft"), ("SENT", "Sent to vendor"), ("ACKNOWLEDGED", "Acknowledged"), ("PARTIALLY_RECEIVED", "Partially received"), ("COMPLETED", "Completed"), ("CANCELLED", "Cancelled")], default="DRAFT", max_length=30)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="replenishment_requests", to=settings.AUTH_USER_MODEL)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="replenishment_requests", to="warehouse.product")),
                ("vendor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="replenishment_requests", to="warehouse.vendor")),
                ("warehouse", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="replenishment_requests", to="warehouse.warehouselocation")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=180)),
                ("message", models.TextField()),
                ("level", models.CharField(choices=[("INFO", "Information"), ("WARNING", "Warning"), ("CRITICAL", "Critical")], default="INFO", max_length=20)),
                ("read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("recipient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="warehouse_notifications", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
