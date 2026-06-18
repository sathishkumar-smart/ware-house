from django.db import migrations, models


def upgrade_superusers(apps, schema_editor):
    """Promote all Django superusers to SUPER_ADMIN role."""
    EmployeeProfile = apps.get_model("warehouse", "EmployeeProfile")
    EmployeeProfile.objects.filter(user__is_superuser=True).update(role="SUPER_ADMIN")


class Migration(migrations.Migration):
    dependencies = [
        ("warehouse", "0003_system_settings"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employeeprofile",
            name="role",
            field=models.CharField(
                choices=[
                    ("SUPER_ADMIN", "Super Administrator"),
                    ("ADMIN", "Administrator"),
                    ("MANAGER", "Warehouse manager"),
                    ("INVENTORY_OPERATOR", "Inventory operator"),
                    ("AUDITOR", "Auditor / read only"),
                ],
                default="INVENTORY_OPERATOR",
                max_length=50,
            ),
        ),
        migrations.RunPython(upgrade_superusers, migrations.RunPython.noop),
    ]
